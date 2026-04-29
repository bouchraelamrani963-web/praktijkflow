import { prisma } from "@/lib/db";
import { generateToken, hashToken } from "./crypto";
import { recalcAndSave, calculateRiskForClient } from "@/lib/risk/calculate";
import { maybeCreateOpenSlot } from "@/lib/open-slots/service";

export type TokenAction = "confirm_appointment" | "cancel_appointment" | "claim_open_slot";

export interface CreateTokenInput {
  practiceId: string;
  appointmentId?: string;
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

// ─── Create ────────────────────────────────────────────────────────────────

export async function createActionToken(input: CreateTokenInput): Promise<CreateTokenResult> {
  const raw = generateToken();
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
  return token;
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
  if (!token.appointment) {
    return { outcome: "failed", message: "Plekreferentie niet gevonden." };
  }

  const appt = token.appointment;

  // Pre-check — find the slot (only for its id; actual claim is atomic below)
  const slotPre = await prisma.openSlot.findFirst({
    where: { sourceAppointmentId: appt.id },
    select: { id: true, status: true },
  });

  if (!slotPre) {
    console.log(`[CLAIM FAILED] No OpenSlot found for appointment ${appt.id}`);
    return { outcome: "failed", message: "Deze plek is al ingevuld." };
  }

  if (slotPre.status !== "AVAILABLE") {
    console.log(
      `[CLAIM FAILED] Slot ${slotPre.id} already ${slotPre.status} — client ${token.clientId} lost race`,
    );
    return { outcome: "failed", message: "Deze plek is al ingevuld." };
  }

  // Resolve snapshot inputs (client name + appointment-type name) outside
  // the transaction. These are read-only; the transaction only needs their
  // already-resolved string values.
  const [client, apptType, risk] = await Promise.all([
    prisma.client.findUnique({
      where: { id: token.clientId },
      select: { firstName: true, lastName: true },
    }),
    appt.appointmentTypeId
      ? prisma.appointmentType.findUnique({
          where: { id: appt.appointmentTypeId },
          select: { name: true },
        })
      : Promise.resolve(null),
    calculateRiskForClient(token.clientId, appt.startTime, "SCHEDULED"),
  ]);

  if (!client) {
    return { outcome: "failed", message: "Patiëntgegevens niet gevonden." };
  }

  const claimedClientName = `${client.firstName} ${client.lastName}`;
  const claimedAppointmentType = apptType?.name ?? null;
  const recoveredRevenueCents = appt.revenueEstimateCents;

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
          practiceId: appt.practiceId,
          clientId: token.clientId,
          practitionerId: appt.practitionerId,
          appointmentTypeId: appt.appointmentTypeId,
          startTime: appt.startTime,
          endTime: appt.endTime,
          status: "SCHEDULED",
          revenueEstimateCents: appt.revenueEstimateCents,
          riskScore: risk.riskScore,
          riskLevel: risk.riskLevel,
        },
      });

      // Step 2: atomic compare-and-swap on the slot — sets ALL audit fields
      // in the same write that flips status. If another tx claimed it first,
      // updated.count === 0 and we throw to roll back the appointment.
      const updated = await tx.openSlot.updateMany({
        where: { id: slotPre.id, status: "AVAILABLE" },
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

      // Step 4: find & expire other OFFERED entries for the same slot
      const otherTokens = await tx.patientActionToken.findMany({
        where: {
          practiceId: token.practiceId,
          appointmentId: token.appointmentId,
          action: "claim_open_slot",
          clientId: { not: token.clientId },
        },
        select: { clientId: true },
      });

      const otherClientIds = [...new Set(otherTokens.map((t) => t.clientId))];
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

      // Step 5: invalidate other claim tokens for this appointment (one-time enforcement)
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

      return { claimed: true as const, newAppointmentId: newAppt.id, expiredCount };
    });

    console.log(
      `[CLAIM SUCCESS] Slot ${slotPre.id} claimed by client ${token.clientId} → new appointment ${result.newAppointmentId} — expired ${result.expiredCount} other offers`,
    );

    return {
      outcome: "success",
      message: "De afspraak is voor u gereserveerd.",
      appointmentId: result.newAppointmentId,
    };
  } catch (err) {
    if (err instanceof SlotRaceLostError) {
      console.log(
        `[CLAIM FAILED] Race lost — slot ${slotPre.id} was claimed by another patient before client ${token.clientId}`,
      );
      return { outcome: "failed", message: "Deze plek is al ingevuld." };
    }
    console.error(`[CLAIM FAILED] Transaction error for client ${token.clientId}:`, err);
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
