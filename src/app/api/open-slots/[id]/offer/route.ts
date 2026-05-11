import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { createActionToken } from "@/lib/tokens/service";
import { sendSms, isTwilioConfigured } from "@/lib/twilio";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Offer an open slot to one or more waitlist patients.
 *
 * Body accepts BOTH shapes (backwards compat):
 *   - { waitlistEntryIds: ["uuid", ...], channel?: "sms" }   ← new bulk form
 *   - { waitlistEntryId:  "uuid"        , channel?: "sms" }   ← legacy single
 *
 * Behaviour:
 *   - Twilio not configured → 503 with clear "SMS niet geconfigureerd" and
 *     ZERO database writes. The previous version returned 200 with
 *     `smsStatus: "mock"` which falsely flipped WaitlistEntry → OFFERED and
 *     created tokens that pointed to messages no patient ever received.
 *   - Per entry: create CLAIM_OPEN_SLOT token (2h TTL), send SMS, log
 *     MessageLog, transition WaitlistEntry → OFFERED.
 *   - One bad entry does NOT roll back the rest — each is best-effort. The
 *     response includes per-entry results so the UI can show partial outcomes.
 */
const offerSchema = z
  .object({
    waitlistEntryIds: z.array(z.string().uuid()).min(1).max(10).optional(),
    waitlistEntryId: z.string().uuid().optional(),
    channel: z.enum(["sms"]).default("sms"),
  })
  .refine(
    (b) => Boolean(b.waitlistEntryIds && b.waitlistEntryIds.length > 0) || Boolean(b.waitlistEntryId),
    { message: "Provide waitlistEntryIds (array) or legacy waitlistEntryId (string)" },
  );

interface OfferResult {
  waitlistEntryId: string;
  clientName: string;
  status: "sent" | "failed" | "no_phone" | "not_eligible";
  reason?: string;
  smsSid?: string;
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: slotId } = await ctx.params;
  if (!UUID_RE.test(slotId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.practiceId) return NextResponse.json({ error: "No practice context" }, { status: 403 });

  // ─── Honest Twilio gate ─────────────────────────────────────────────────
  // Refuse the call before any tokens or DB writes happen if SMS isn't
  // configured. The UI surfaces this back to the practice owner as a
  // disabled-button state — see MatchesPanel. The decision lives here
  // (not on the client) because env vars aren't browser-readable.
  if (!isTwilioConfigured()) {
    return NextResponse.json(
      {
        error: "SMS niet geconfigureerd",
        message:
          "Stel TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN en TWILIO_PHONE_NUMBER in op de server om aanbiedingen te kunnen versturen.",
        smsConfigured: false,
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = offerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Normalise legacy single-id to array
  const entryIds = parsed.data.waitlistEntryIds
    ?? (parsed.data.waitlistEntryId ? [parsed.data.waitlistEntryId] : []);

  // ─── Verify slot ─────────────────────────────────────────────────────────
  const slot = await prisma.openSlot.findFirst({
    where: { id: slotId, practiceId: user.practiceId, status: "AVAILABLE" },
    include: {
      practitioner: { select: { firstName: true, lastName: true } },
      practice: { select: { name: true } },
    },
  });
  if (!slot) {
    return NextResponse.json({ error: "Open slot not available" }, { status: 404 });
  }
  if (!slot.sourceAppointmentId) {
    return NextResponse.json(
      { error: "Manual slots cannot be offered via claim token — book the appointment directly" },
      { status: 422 },
    );
  }

  // ─── Load all referenced waitlist entries in one query ──────────────────
  const entries = await prisma.waitlistEntry.findMany({
    where: { id: { in: entryIds }, practiceId: user.practiceId },
    include: {
      client: { select: { id: true, firstName: true, lastName: true, phone: true } },
    },
  });
  const entryById = new Map(entries.map((e) => [e.id, e]));

  // ─── Per-entry processing (best-effort; one failure doesn't stop the rest) ──
  const fmt = slot.startTime.toLocaleString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  const results: OfferResult[] = [];

  for (const entryId of entryIds) {
    const entry = entryById.get(entryId);
    if (!entry) {
      results.push({
        waitlistEntryId: entryId,
        clientName: "(onbekend)",
        status: "not_eligible",
        reason: "Wachtlijstvermelding niet gevonden in deze praktijk",
      });
      continue;
    }
    const clientName = `${entry.client.firstName} ${entry.client.lastName}`;
    if (entry.status !== "WAITING") {
      results.push({
        waitlistEntryId: entry.id,
        clientName,
        status: "not_eligible",
        reason: `Status is ${entry.status} — alleen WAITING-vermeldingen kunnen worden uitgenodigd`,
      });
      continue;
    }
    if (!entry.client.phone) {
      results.push({
        waitlistEntryId: entry.id,
        clientName,
        status: "no_phone",
        reason: "Patiënt heeft geen telefoonnummer",
      });
      continue;
    }

    try {
      // Token tied to the source appointment so the claim flow can resolve
      // the slot. SHA-256 hashed at storage time; rawToken returned once.
      const token = await createActionToken({
        practiceId: user.practiceId,
        appointmentId: slot.sourceAppointmentId,
        clientId: entry.client.id,
        action: "claim_open_slot",
        expiresInHours: 2,
      });

      const actionUrl = `/action/${token.rawToken}`;
      const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
      const smsBody =
        `Beste ${entry.client.firstName}, er is een plek vrijgekomen bij ${slot.practice.name} ` +
        `op ${fmt}. Claim uw afspraak via: ${base}${actionUrl}`;

      const smsResult = await sendSms(entry.client.phone, smsBody);

      // Twilio mock-mode here is defensive: we already gated above on
      // isTwilioConfigured(), but if `sendSms` somehow returns mock=true we
      // log it honestly as failed rather than claiming success.
      const logStatus = smsResult.mock
        ? "failed"
        : smsResult.success
          ? "sent"
          : "failed";
      const errorMsg = smsResult.mock
        ? "Twilio gate slipped through — refusing to claim success"
        : (smsResult.error ?? null);

      await prisma.messageLog.create({
        data: {
          practiceId: user.practiceId,
          appointmentId: slot.sourceAppointmentId,
          clientId: entry.client.id,
          channel: "sms",
          to: entry.client.phone,
          body: smsBody,
          status: logStatus,
          errorMessage: errorMsg,
          externalSid: smsResult.sid ?? null,
        },
      });

      if (logStatus === "sent") {
        // Only flip waitlist status to OFFERED on actual send success.
        await prisma.waitlistEntry.update({
          where: { id: entry.id },
          data: { status: "OFFERED" },
        });

        results.push({
          waitlistEntryId: entry.id,
          clientName,
          status: "sent",
          smsSid: smsResult.sid,
        });
      } else {
        results.push({
          waitlistEntryId: entry.id,
          clientName,
          status: "failed",
          reason: errorMsg ?? "Versturen mislukt",
        });
      }
    } catch (err) {
      console.error(`[api.open-slots.offer] entry ${entry.id} failed:`, err);
      results.push({
        waitlistEntryId: entry.id,
        clientName,
        status: "failed",
        reason: err instanceof Error ? err.message : "Onbekende fout",
      });
    }
  }

  const sent = results.filter((r) => r.status === "sent").length;
  const failed = results.length - sent;

  return NextResponse.json({
    slotId,
    sent,
    failed,
    total: results.length,
    results,
    smsConfigured: true,
  });
}
