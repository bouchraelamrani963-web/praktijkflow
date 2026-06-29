import { prisma } from "@/lib/db";
import { generateToken, hashToken } from "./crypto";
import { recalcAndSave, calculateRiskForClient } from "@/lib/risk/calculate";
import { maybeCreateOpenSlot } from "@/lib/open-slots/service";

export type TokenAction = "confirm_appointment" | "cancel_appointment" | "claim_open_slot";

export interface CreateTokenInput {
  practiceId: string;
  appointmentId?: string;
  openSlotId?: string;
  clientId: string;
  action: TokenAction;
  expiresInHours?: number;
}

export interface CreateTokenResult {
  tokenId: string;
  rawToken: string; // only returned once — never stored
}

export interface ExecuteResult {
  outcome: "success" | "expired" | "already_used" | "invalid" | "failed";
  message: string;
  appointmentId?: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function createRawToken(input: CreateTokenInput): string {
  const secret = generateToken();
  if (input.action === "claim_open_slot" && input.openSlotId) {
    return `${input.openSlotId}.${secret}`;
  }
  return secret;
}

function extractOpenSlotId(rawToken: string): string | null {
  const [candidate] = rawToken.split(".", 1);
  return candidate && UUID_RE.test(candidate) ? candidate : null;
}

function clientLogRef(clientId: string): string {
  return process.env.NODE_ENV === "production"
    ? `client:${clientId.slice(0, 8)}`
    : `client:${clientId}`;
}

// ─── Create ────────────────────────────────────────────────────────────────

export async function createActionToken(input: CreateTokenInput): Promise<CreateTokenResult> {
  const raw = createRawToken(input);
  const hash = hashToken(raw);
  const expiresAt = new Date(
    Date.now() + (input.expiresInHours ?? 24) * 60 * 60 * 1000,
  );

  const record = await prisma.patientActionToken.create({
    data: {
      practiceId: input.practiceId,
      appointmentId: input.appointmentId ?? null,
      clientId: input.clientId,
      tokenHash: hash,
      action: input.action,
      expiresAt,
    },
  });

  return { tokenId: record.id, rawToken: raw };
}

// ─── Lookup (for preview page, does NOT execute) ───────────────────────────

export async function lookupToken(rawToken: string) {
  const hash = hashToken(rawToken);
  const token = await prisma.patientActionToken.findUnique({
    where: { tokenHash: hash },
    include: {
      appointment: {
        select: {
          id: true,
          startTime: true,
          endTime: true,
          status: true,
          practitionerId: true,
          appointmentTypeId: true,
          practiceId: true,
          revenueEstimateCents: true,
        },
      },
      client: { select: { id: true, firstName: true, lastName: true } },
      practice: { select: { id: true, name: true } },
    },
  });

  if (!token) return null;

  const openSlotId = token.action === "claim_open_slot" ? extractOpenSlotId(rawToken) : null;
  const openSlot = openSlotId
    ? await prisma.openSlot.findFirst({
        where: { id: openSlotId, practiceId: token.practiceId },
        select: {
          id: true,
          practiceId: true,
          status: true,
          practitionerId: true,
          appointmentTypeId: true,
          startTime: true,
          endTime: true,
          durationMinutes: true,
          appointmentType: { select: { name: true, price: true } },
        },
      })
    : null;

  return { ...token, openSlot };
}

// ─── Execute ───────────────────────────────────────────────────────────────

export async function executeToken(
  rawToken: string,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<ExecuteResult> {
  const token = await lookupToken(rawToken);

  if (!token) {
    return { outcome: "invalid", message: "Deze link is ongeldig of is al gebruikt." };
  }

  const t = token; // capture for closure narrowing

  // Write audit log helper
  async function audit(outcome: string, details?: string) {
    await prisma.actionLog.create({
      data: {
        practiceId: t.practiceId,
        appointmentId: t.appointmentId,
        clientId: t.clientId,
        tokenId: t.id,
        action: t.action,
        outcome,
        ipAddress: meta?.ipAddress ?? null,
        userAgent: meta?.userAgent?.slice(0, 500) ?? null,
        details: details ?? null,
      },
    });
  }

  if (token.usedAt) {
    await audit("already_used");
    return { outcome: "already_used", message: "Deze link is al gebruikt." };
  }

  if (token.expiresAt < new Date()) {
    await audit("expired");
    return { outcome: "expired", message: "Deze link is verlopen." };
  }

  try {
    const result = await performAction(token);

    if (result.outcome === "success") {
      await prisma.patientActionToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() },
      });
      await audit("success", result.message);
    } else {
      await audit("failed", result.message);
    }

    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    await audit("failed", msg);
    return { outcome: "failed", message: "Er is iets misgegaan. Neem contact op met de praktijk." };
  }
}

// ─── Action handlers ───────────────────────────────────────────────────────

type TokenWithRelations = NonNullable<Awaited<ReturnType<typeof lookupToken>>>;

async function performAction(token: TokenWithRelations): Promise<ExecuteResult> {
  switch (token.action) {
    case "confirm_appointment":
      return confirmAppointment(token);
    case "cancel_appointment":
      return cancelAppointment(token);
    case "claim_open_slot":
      return claimOpenSlot(token);
    default:
      return { outcome: "failed", message: `Unknown action: ${token.action}` };
  }
}

async function confirmAppointment(token: TokenWithRelations): Promise<ExecuteResult> {
  if (!token.appointment) {
    return { outcome: "failed", message: "Afspraak niet gevonden." };
  }
  if (token.appointment.status === "CANCELLED") {
    return { outcome: "failed", message: "Deze afspraak is geannuleerd." };
  }
  if (token.appointment.status === "CONFIRMED") {
    return { outcome: "success", message: "Uw afspraak is al bevestigd.", appointmentId: token.appointment.id };
  }

  await prisma.appointment.update({
    where: { id: token.appointment.id },
    data: { status: "CONFIRMED" },
  });

  await recalcAndSave(token.appointment.id);

  return {
    outcome: "success",
    message: "Uw afspraak is bevestigd. Dank u wel!",
    appointmentId: token.appointment.id,
  };
}

async function cancelAppointment(token: TokenWithRelations): Promise<ExecuteResult> {
  if (!token.appointment) {
    return { outcome: "failed", message: "Afspraak niet gevonden." };
  }
  if (token.appointment.status === "CANCELLED") {
    return { outcome: "success", message: "Deze afspraak was al geannuleerd.", appointmentId: token.appointment.id };
  }

  await prisma.appointment.update({
    where: { id: token.appointment.id },
    data: { status: "CANCELLED" },
  });

  await recalcAndSave(token.appointment.id);
  await maybeCreateOpenSlot(token.appointment.id);

  return {
    outcome: "success",
    message: "Uw afspraak is geannuleerd.",
    appointmentId: token.appointment.id,
  };
}

async function claimOpenSlot(token: TokenWithRelations): Promise<ExecuteResult> {
  const slot = token.openSlot ?? (
    token.appointment
      ? await prisma.openSlot.findFirst({
          where: { sourceAppointmentId: token.appointment.id },
          select: {
            id: true,
            practiceId: true,
            status: true,
            practitionerId: true,
            appointmentTypeId: true,
            startTime: true,
            endTime: true,
            durationMinutes: true,
            appointmentType: { select: { name: true, price: true } },
          },
        })
      : null
  );

  if (!slot) {
    if (token.appointment) {
      console.log(`[CLAIM FAILED] No OpenSlot found for appointment ${token.appointment.id}`);
    }
    return { outcome: "failed", message: "Plekreferentie niet gevonden." };
  }

  if (slot.status !== "AVAILABLE" && slot.status !== "OFFERED") {
    console.log(
      `[CLAIM FAILED] Slot ${slot.id} already ${slot.status} - ${clientLogRef(token.clientId)} lost race`,
    );
    return { outcome: "failed", message: "Deze plek is al ingevuld." };
  }

  const startTime = token.appointment?.startTime ?? slot.startTime;
  const endTime = token.appointment?.endTime ?? slot.endTime;
  const appointmentTypeId = token.appointment?.appointmentTypeId ?? slot.appointmentTypeId;
  const recoveredRevenueCents = token.appointment?.revenueEstimateCents
    ?? slot.appointmentType?.price
    ?? 0;

  // Resolve snapshot inputs outside the transaction. These are read-only;
  // the transaction only needs their already-resolved values.
  const [client, risk] = await Promise.all([
    prisma.client.findUnique({
      where: { id: token.clientId },
      select: { firstName: true, lastName: true },
    }),
    calculateRiskForClient(token.clientId, startTime, "CONFIRMED"),
  ]);

  if (!client) {
    return { outcome: "failed", message: "Patiëntgegevens niet gevonden." };
  }

  const claimedClientName = `${client.firstName} ${client.lastName}`;
  const claimedAppointmentType = slot.appointmentType?.name ?? null;

  // ─── ATOMIC CLAIM ───────────────────────────────────────────────────────
  // All five audit fields (claimedAppointmentId, claimedAt, claimedClientName,
  // claimedAppointmentType, recoveredRevenueCents) are written in the SAME
  // updateMany that flips status → CLAIMED. This makes it impossible for a
  // CLAIMED slot to exist without its audit snapshot.
  //
  // Flow:
  //   1. Create the replacement appointment (inside the tx) so we have its id
  //   2. Compare-and-swap the slot: set status=CLAIMED + all 5 fields only if
  //      status is still AVAILABLE. If the CAS fails, throw to roll back the
  //      appointment create.
  //   3. Propagate waitlist / token invalidation side-effects.
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Step 1: create the replacement appointment first — we need its id
      // for the slot's claimedAppointmentId snapshot.
      const newAppt = await tx.appointment.create({
        data: {
          practiceId: slot.practiceId,
          clientId: token.clientId,
          practitionerId: slot.practitionerId,
          appointmentTypeId,
          startTime,
          endTime,
          status: "CONFIRMED",
          revenueEstimateCents: recoveredRevenueCents,
          riskScore: risk.riskScore,
          riskLevel: risk.riskLevel,
        },
      });

      // Step 2: atomic compare-and-swap on the slot — sets ALL audit fields
      // in the same write that flips status. If another tx claimed it first,
      // updated.count === 0 and we throw to roll back the appointment.
      const updated = await tx.openSlot.updateMany({
        where: { id: slot.id, status: { in: ["AVAILABLE", "OFFERED"] } },
        data: {
          status: "CLAIMED",
          claimedAppointmentId: newAppt.id,
          claimedAt: new Date(),
          claimedClientName,
          claimedAppointmentType,
          recoveredRevenueCents,
        },
      });

      if (updated.count === 0) {
        // Race lost — rollback by throwing a typed sentinel. The outer catch
        // differentiates this from real failures.
        throw new SlotRaceLostError();
      }

      // Step 3: mark this client's waitlist entries ACCEPTED (intent captured).
      await tx.waitlistEntry.updateMany({
        where: {
          clientId: token.clientId,
          practiceId: token.practiceId,
          status: "OFFERED",
        },
        data: { status: "ACCEPTED" },
      });

      // Step 4: find & expire other OFFERED entries for the same slot.
      // Source slots can use appointmentId. Manual slots have no appointmentId,
      // so we link offer logs through the open-slot-prefixed claim URL.
      const otherClientIds = token.appointmentId
        ? [
            ...new Set(
              (await tx.patientActionToken.findMany({
                where: {
                  practiceId: token.practiceId,
                  appointmentId: token.appointmentId,
                  action: "claim_open_slot",
                  clientId: { not: token.clientId },
                },
                select: { clientId: true },
              })).map((t) => t.clientId),
            ),
          ]
        : [
            ...new Set(
              (await tx.messageLog.findMany({
                where: {
                  practiceId: token.practiceId,
                  channel: { in: ["email", "sms"] },
                  clientId: { not: token.clientId },
                  body: { contains: `/action/${slot.id}.` },
                  status: { in: ["sent", "mock"] },
                },
                select: { clientId: true },
              })).map((l) => l.clientId),
            ),
          ];
      let expiredCount = 0;

      if (otherClientIds.length > 0) {
        const expired = await tx.waitlistEntry.updateMany({
          where: {
            practiceId: token.practiceId,
            status: "OFFERED",
            clientId: { in: otherClientIds },
          },
          data: { status: "EXPIRED" },
        });
        expiredCount = expired.count;
      }

      // Step 5: invalidate other source-appointment claim tokens. Manual-slot
      // links are blocked by the slot CAS/status check because the token table
      // does not store openSlotId.
      if (token.appointmentId) {
        await tx.patientActionToken.updateMany({
          where: {
            practiceId: token.practiceId,
            appointmentId: token.appointmentId,
            action: "claim_open_slot",
            clientId: { not: token.clientId },
            usedAt: null,
          },
          data: { usedAt: new Date() },
        });
      }

      return { claimed: true as const, newAppointmentId: newAppt.id, expiredCount };
    });

    console.log(
      `[CLAIM SUCCESS] Slot ${slot.id} claimed by ${clientLogRef(token.clientId)} -> new appointment ${result.newAppointmentId} - expired ${result.expiredCount} other offers`,
    );

    return {
      outcome: "success",
      message: "De afspraak is voor u gereserveerd.",
      appointmentId: result.newAppointmentId,
    };
  } catch (err) {
    if (err instanceof SlotRaceLostError) {
      console.log(
        `[CLAIM FAILED] Race lost - slot ${slot.id} was claimed before ${clientLogRef(token.clientId)}`,
      );
      return { outcome: "failed", message: "Deze plek is al ingevuld." };
    }
    console.error(`[CLAIM FAILED] Transaction error for ${clientLogRef(token.clientId)}:`, err);
    return { outcome: "failed", message: "Er is iets misgegaan. Neem contact op met de praktijk." };
  }
}

/**
 * Thrown inside the claim transaction when the compare-and-swap loses the
 * race. Triggers a Prisma transaction rollback and is caught above to return
 * a graceful "already claimed" outcome.
 */
class SlotRaceLostError extends Error {
  constructor() {
    super("Slot race lost");
    this.name = "SlotRaceLostError";
  }
}

// ─── Decline (patient says "Nee, bedankt" on a claim offer) ─────────────────
// Separate from executeToken() because the semantics differ:
//   - executeToken() = patient affirmatively claims the slot
//   - declineToken() = patient passes; their waitlist entry returns to
//     WAITING (so they remain eligible for future offers) and the slot
//     stays AVAILABLE for the other offered patients (or a re-offer).
//
// Idempotent on the usedAt flag, so re-clicking the same link gives a stable
// "already used" response instead of a confusing error.

export async function declineClaimToken(
  rawToken: string,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<ExecuteResult> {
  const token = await lookupToken(rawToken);

  if (!token) {
    return { outcome: "invalid", message: "Deze link is ongeldig of is al gebruikt." };
  }

  // Only the claim_open_slot action is declinable. Confirm/cancel of regular
  // reminder appointments doesn't use this path.
  if (token.action !== "claim_open_slot") {
    return { outcome: "failed", message: "Deze link ondersteunt geen afwijzen-actie." };
  }

  const t = token;

  async function audit(outcome: string, details?: string) {
    await prisma.actionLog.create({
      data: {
        practiceId: t.practiceId,
        appointmentId: t.appointmentId,
        clientId: t.clientId,
        tokenId: t.id,
        action: t.action,
        outcome,
        ipAddress: meta?.ipAddress ?? null,
        userAgent: meta?.userAgent?.slice(0, 500) ?? null,
        details: details ?? null,
      },
    });
  }

  if (token.usedAt) {
    await audit("already_used");
    return { outcome: "already_used", message: "Deze link is al gebruikt." };
  }
  if (token.expiresAt < new Date()) {
    await audit("expired");
    return { outcome: "expired", message: "Deze link is verlopen." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Mark token used so further clicks return "already used".
      await tx.patientActionToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() },
      });

      // Return this client's OFFERED waitlist entries to WAITING so future
      // slots can still be matched to them. Other offered patients' entries
      // are untouched — they still have their tokens active.
      await tx.waitlistEntry.updateMany({
        where: {
          clientId: token.clientId,
          practiceId: token.practiceId,
          status: "OFFERED",
        },
        data: { status: "WAITING" },
      });
    });

    await audit("declined", "Patient declined the offer");
    return {
      outcome: "success",
      message: "Bedankt voor uw bericht. We bewaren uw plek op de wachtlijst voor een volgende keer.",
      appointmentId: token.appointmentId ?? undefined,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    await audit("failed", msg);
    return { outcome: "failed", message: "Er is iets misgegaan. Neem contact op met de praktijk." };
  }
}
