import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { normalizeEmailAddress } from "@/lib/email";
import {
  sendOfferMessage,
  isEmailConfigured,
  isOfferMessageAllowed,
  isOfferMessageTestMode,
  type MessageChannel,
} from "@/lib/messaging/service";
import { normalizePhoneNumber } from "@/lib/phone";
import { createActionToken } from "@/lib/tokens/service";
import { getPublicAppUrl } from "@/lib/url";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function openSlotLogMarker(slotId: string): string {
  return `open-slot:${slotId}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const offerSchema = z
  .object({
    waitlistEntryIds: z.array(z.string().uuid()).min(1).max(10).optional(),
    waitlistEntryId: z.string().uuid().optional(),
    channel: z.enum(["email", "sms"]).default("email"),
  })
  .refine(
    (b) => Boolean(b.waitlistEntryIds && b.waitlistEntryIds.length > 0) || Boolean(b.waitlistEntryId),
    { message: "Provide waitlistEntryIds (array) or legacy waitlistEntryId (string)" },
  );

interface OfferResult {
  waitlistEntryId: string;
  clientName: string;
  status: "pending" | "sent" | "failed" | "not_eligible" | "test";
  reason?: string;
  messageSid?: string;
  claimUrl?: string;
}

function getDestination(
  channel: MessageChannel,
  contact: { email: string | null; phone: string | null },
) {
  return channel === "email"
    ? normalizeEmailAddress(contact.email)
    : normalizePhoneNumber(contact.phone);
}

function providerNotConfiguredResponse(channel: MessageChannel) {
  const message = channel === "email"
    ? "Stel RESEND_API_KEY, EMAIL_FROM en NEXT_PUBLIC_APP_URL in op de server om e-mails te kunnen versturen, of zet EMAIL_TEST_MODE=true voor een testronde zonder echte berichten."
    : "Stel TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN en TWILIO_PHONE_NUMBER in op de server om SMS te kunnen versturen, of zet SMS_TEST_MODE=true voor een testronde zonder echte berichten.";

  return NextResponse.json(
    {
      error: channel === "email" ? "E-mail niet geconfigureerd" : "SMS niet geconfigureerd",
      message,
      channel,
      messageConfigured: channel === "email" ? isEmailConfigured() : false,
      messageTestMode: false,
    },
    { status: 503 },
  );
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

  const channel = parsed.data.channel satisfies MessageChannel;
  if (!isOfferMessageAllowed(channel)) {
    return providerNotConfiguredResponse(channel);
  }
  const testMode = isOfferMessageTestMode(channel);

  const entryIds = parsed.data.waitlistEntryIds
    ?? (parsed.data.waitlistEntryId ? [parsed.data.waitlistEntryId] : []);

  const slot = await prisma.openSlot.findFirst({
    where: { id: slotId, practiceId: user.practiceId, status: { in: ["AVAILABLE", "OFFERED"] } },
    include: {
      practitioner: { select: { firstName: true, lastName: true } },
      practice: { select: { name: true } },
    },
  });
  if (!slot) {
    return NextResponse.json({ error: "Open slot not available" }, { status: 404 });
  }

  const entries = await prisma.waitlistEntry.findMany({
    where: { id: { in: entryIds }, practiceId: user.practiceId },
    include: {
      client: {
        select: { id: true, firstName: true, lastName: true, email: true, phone: true },
      },
    },
  });
  const entryById = new Map(entries.map((e) => [e.id, e]));

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
        reason: `Status is ${entry.status} - alleen WAITING-vermeldingen kunnen worden uitgenodigd`,
      });
      continue;
    }

    const destination = getDestination(channel, entry.client);
    if (!destination.isValid || !destination.normalized) {
      const reason = destination.reason ?? (
        channel === "email" ? "Geen geldig e-mailadres" : "Geen geldig telefoonnummer"
      );

      await prisma.messageLog.create({
        data: {
          practiceId: user.practiceId,
          appointmentId: slot.sourceAppointmentId,
          clientId: entry.client.id,
          channel,
          to: "",
          body: openSlotLogMarker(slot.id),
          status: "failed",
          errorMessage: reason,
        },
      });
      results.push({ waitlistEntryId: entry.id, clientName, status: "failed", reason });
      continue;
    }

    let messageLogId: string | null = null;
    let messageLogFinalized = false;

    try {
      const token = await createActionToken({
        practiceId: user.practiceId,
        appointmentId: slot.sourceAppointmentId ?? undefined,
        openSlotId: slot.id,
        clientId: entry.client.id,
        action: "claim_open_slot",
        expiresInHours: 2,
      });

      const actionUrl = `/action/${token.rawToken}`;
      const claimUrl = `${getPublicAppUrl()}${actionUrl}`;
      const subject = `Nieuwe afspraakplek beschikbaar bij ${slot.practice.name}`;
      const messageText =
        `Beste ${entry.client.firstName}, er is een plek vrijgekomen bij ${slot.practice.name} ` +
        `op ${fmt}. Claim uw afspraak via: ${claimUrl}`;
      const messageHtml =
        `<p>Beste ${escapeHtml(entry.client.firstName)},</p>` +
        `<p>Er is een plek vrijgekomen bij ${escapeHtml(slot.practice.name)} op ${escapeHtml(fmt)}.</p>` +
        `<p><a href="${escapeHtml(claimUrl)}">Claim uw afspraak</a></p>`;

      const messageLog = await prisma.messageLog.create({
        data: {
          practiceId: user.practiceId,
          appointmentId: slot.sourceAppointmentId,
          clientId: entry.client.id,
          channel,
          to: destination.normalized,
          body: messageText,
          status: "pending",
        },
      });
      messageLogId = messageLog.id;

      const messageResult = await sendOfferMessage({
        channel,
        to: destination.normalized,
        subject,
        text: messageText,
        html: messageHtml,
      });

      const isHealthyMock = testMode && messageResult.mock;
      const logStatus =
        isHealthyMock
          ? "mock"
          : messageResult.mock
            ? "failed"
            : messageResult.success
              ? "sent"
              : "failed";
      const errorMsg = isHealthyMock
        ? null
        : messageResult.mock
          ? "Berichtprovider gate mismatch - levering niet bevestigd"
          : (messageResult.error ?? null);

      await prisma.messageLog.update({
        where: { id: messageLog.id },
        data: {
          status: logStatus,
          errorMessage: errorMsg,
          externalSid: messageResult.sid ?? null,
        },
      });
      messageLogFinalized = true;

      const dispatched = logStatus === "sent" || logStatus === "mock";
      if (dispatched) {
        await prisma.waitlistEntry.update({
          where: { id: entry.id },
          data: { status: "OFFERED" },
        });

        results.push({
          waitlistEntryId: entry.id,
          clientName,
          status: testMode ? "test" : "sent",
          messageSid: messageResult.sid,
          ...(testMode ? { claimUrl } : {}),
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
      const reason = err instanceof Error ? err.message : "Onbekende fout";
      if (messageLogId && !messageLogFinalized) {
        await prisma.messageLog.update({
          where: { id: messageLogId },
          data: {
            status: "failed",
            errorMessage: reason,
            externalSid: null,
          },
        }).catch(() => {});
      }
      console.error(`[api.open-slots.offer] entry ${entry.id} failed:`, err);
      results.push({ waitlistEntryId: entry.id, clientName, status: "failed", reason });
    }
  }

  const sent = results.filter((r) => r.status === "sent" || r.status === "test").length;
  const failed = results.filter((r) => r.status !== "sent" && r.status !== "test").length;

  if (sent > 0) {
    await prisma.openSlot.update({
      where: { id: slotId },
      data: {
        status: "OFFERED",
        offeredCount: { increment: sent },
        offeredAt: slot.offeredAt ?? new Date(),
      },
    });
  }

  return NextResponse.json({
    slotId,
    sent,
    failed,
    total: results.length,
    results,
    channel,
    messageConfigured: channel === "email" ? isEmailConfigured() : false,
    messageTestMode: testMode,
  });
}
