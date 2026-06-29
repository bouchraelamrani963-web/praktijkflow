import { prisma } from "@/lib/db";
import { findMatchesForSlot } from "./matching";
import { createActionToken } from "@/lib/tokens/service";
import { normalizeEmailAddress } from "@/lib/email";
import { sendOfferMessage, isEmailTestMode } from "@/lib/messaging/service";
import { getPublicAppUrl } from "@/lib/url";

const MAX_OFFERS = 3;
const CLAIM_EXPIRY_HOURS = 2;
const COOLDOWN_HOURS = 2; // no patient receives more than 1 offer per 2 hours

function candidateLogLabel(candidate: { id: string; clientName: string }) {
  return process.env.NODE_ENV === "production"
    ? `waitlistEntry:${candidate.id}`
    : candidate.clientName;
}

function openSlotLogMarker(slotId: string): string {
  return `open-slot:${slotId}`;
}

interface AutoOfferResult {
  slotId: string;
  matchesFound: number;
  offersSent: number;
  skipped: number;
  details: {
    waitlistEntryId: string;
    clientName: string;
    messageStatus: string;
  }[];
}

/**
 * Automatically offer an open slot to the top matching waitlist candidates.
 *
 * Flow:
 * 1. Re-verify slot is still AVAILABLE (another flow may have claimed it)
 * 2. Run the matching engine to find ranked candidates
 * 3. Pick top N (max 3) with score > 0
 * 4. For each:
 *    - Check cooldown — skip if patient had an offer in the last 2 hours
 *    - Re-check slot still AVAILABLE before sending
 *    - Create 2h claim token, send e-mail in test mode, mark OFFERED, log
 * 5. First patient to confirm claims the slot (handled atomically in claimOpenSlot)
 */
export async function autoOfferSlot(
  slotId: string,
  practiceId: string,
): Promise<AutoOfferResult> {
  const result: AutoOfferResult = {
    slotId,
    matchesFound: 0,
    offersSent: 0,
    skipped: 0,
    details: [],
  };

  // ─── SAFETY CHECK: slot must still be offerable ────────────────────────
  const slot = await prisma.openSlot.findFirst({
    where: { id: slotId, practiceId, status: { in: ["AVAILABLE", "OFFERED"] } },
    include: {
      practice: { select: { name: true } },
    },
  });

  if (!slot) {
    console.log(`[AUTO-OFFER] Slot ${slotId}: not available (may have been claimed)`);
    return result;
  }

  if (!isEmailTestMode()) {
    console.log(`[AUTO-OFFER] Slot ${slotId}: real email mode active, automatic production sending disabled`);
    return result;
  }

  // ─── SAFETY CHECK: no appointment must already exist for this slot time ──
  // If a new appointment was booked into the same time/practitioner slot, abort
  const conflict = await prisma.appointment.findFirst({
    where: {
      practiceId,
      practitionerId: slot.practitionerId,
      startTime: slot.startTime,
      status: { not: "CANCELLED" },
      id: slot.sourceAppointmentId ? { not: slot.sourceAppointmentId } : undefined,
    },
    select: { id: true },
  });

  if (conflict) {
    console.log(
      `[AUTO-OFFER] Slot ${slotId}: conflicting appointment ${conflict.id} already exists — aborting`,
    );
    return result;
  }

  // ─── MATCH ─────────────────────────────────────────────────────────────
  const matches = await findMatchesForSlot(slotId, practiceId);
  result.matchesFound = matches.length;

  console.log(`[AUTO-OFFER] Slot ${slotId}: ${matches.length} matches found`);

  if (matches.length === 0) return result;

  const topCandidates = matches.slice(0, MAX_OFFERS);

  const fmtDate = slot.startTime.toLocaleString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  const cooldownCutoff = new Date(Date.now() - COOLDOWN_HOURS * 60 * 60 * 1000);

  for (const candidate of topCandidates) {
    // ─── SAFETY CHECK: slot still offerable between iterations ──────────
    const stillAvailable = await prisma.openSlot.findFirst({
      where: { id: slotId, practiceId, status: { in: ["AVAILABLE", "OFFERED"] } },
      select: { id: true },
    });

    if (!stillAvailable) {
      console.log(
        `[AUTO-OFFER] Slot ${slotId}: no longer available mid-loop — stopping further offers`,
      );
      break;
    }

    // ─── COOLDOWN CHECK ────────────────────────────────────────────────
    const recentOffer = await prisma.actionLog.findFirst({
      where: {
        practiceId,
        clientId: candidate.clientId,
        action: "auto_offer_sent",
        createdAt: { gte: cooldownCutoff },
      },
      select: { id: true, createdAt: true },
    });

    if (recentOffer) {
      result.skipped++;
      console.log(
        `[AUTO-OFFER] Skipped ${candidateLogLabel(candidate)} (cooldown): recent offer at ${recentOffer.createdAt.toISOString()}`,
      );

      await prisma.actionLog.create({
        data: {
          practiceId,
          appointmentId: slot.sourceAppointmentId,
          clientId: candidate.clientId,
          action: "auto_offer_skipped",
          outcome: "cooldown",
          details: `Skipped — recent offer at ${recentOffer.createdAt.toISOString()} (cooldown ${COOLDOWN_HOURS}h)`,
        },
      });
      continue;
    }

    let messageLogId: string | null = null;
    let messageLogFinalized = false;

    try {
      const email = normalizeEmailAddress(candidate.clientEmail);
      if (!email.isValid || !email.normalized) {
        result.skipped++;
        await prisma.messageLog.create({
          data: {
            practiceId,
            appointmentId: slot.sourceAppointmentId,
            clientId: candidate.clientId,
            channel: "email",
            to: "",
            body: openSlotLogMarker(slot.id),
            status: "failed",
            errorMessage: email.reason ?? "Geen geldig e-mailadres",
          },
        });
        continue;
      }

      // Create claim token with 2h expiry
      const token = await createActionToken({
        practiceId,
        appointmentId: slot.sourceAppointmentId ?? undefined,
        openSlotId: slot.id,
        clientId: candidate.clientId,
        action: "claim_open_slot",
        expiresInHours: CLAIM_EXPIRY_HOURS,
      });

      const actionUrl = `/action/${token.rawToken}`;
      const appUrl = getPublicAppUrl();
      const subject = `Nieuwe afspraakplek beschikbaar bij ${slot.practice.name}`;
      const messageBody =
        `Beste ${candidate.clientName.split(" ")[0]}, er is een plek vrijgekomen bij ${slot.practice.name} ` +
        `op ${fmtDate}. U heeft 2 uur om te reageren. ` +
        `Claim uw afspraak via: ${appUrl}${actionUrl}`;

      const messageLog = await prisma.messageLog.create({
        data: {
          practiceId,
          appointmentId: slot.sourceAppointmentId,
          clientId: candidate.clientId,
          channel: "email",
          to: email.normalized,
          body: messageBody,
          status: "pending",
        },
      });
      messageLogId = messageLog.id;

      const messageResult = await sendOfferMessage({
        channel: "email",
        to: email.normalized,
        subject,
        text: messageBody,
      });
      const messageStatus = messageResult.mock ? "mock" : messageResult.success ? "sent" : "failed";

      await prisma.messageLog.update({
        where: { id: messageLog.id },
        data: {
          status: messageStatus,
          errorMessage: messageResult.error ?? null,
          externalSid: messageResult.sid ?? null,
        },
      });
      messageLogFinalized = true;

      // Audit log
      await prisma.actionLog.create({
        data: {
          practiceId,
          appointmentId: slot.sourceAppointmentId,
          clientId: candidate.clientId,
          action: "auto_offer_sent",
          outcome: messageStatus,
          details: `Auto-offer for slot ${slotId} | Score: ${candidate.score} | Reasons: ${candidate.reasons.join(", ")}`,
        },
      });

      if (messageStatus === "sent" || messageStatus === "mock") {
        await prisma.waitlistEntry.update({
          where: { id: candidate.id },
          data: { status: "OFFERED" },
        });

        result.offersSent++;
        result.details.push({
          waitlistEntryId: candidate.id,
          clientName: candidate.clientName,
          messageStatus,
        });
      }

      console.log(
        `[AUTO-OFFER] Processed slot ${slotId} for ${candidateLogLabel(candidate)} (score: ${candidate.score}, message: ${messageStatus})`,
      );
    } catch (err) {
      if (messageLogId && !messageLogFinalized) {
        await prisma.messageLog.update({
          where: { id: messageLogId },
          data: {
            status: "failed",
            errorMessage: err instanceof Error ? err.message : "Unknown error",
            externalSid: null,
          },
        }).catch(() => {});
      }

      console.error(
        `[AUTO-OFFER] Failed to offer slot ${slotId} to ${candidateLogLabel(candidate)}:`,
        err,
      );

      await prisma.actionLog.create({
        data: {
          practiceId,
          appointmentId: slot.sourceAppointmentId,
          clientId: candidate.clientId,
          action: "auto_offer_sent",
          outcome: "failed",
          details: err instanceof Error ? err.message : "Unknown error",
        },
      }).catch(() => {}); // don't let log failure throw
    }
  }

  // Update slot status to OFFERED if at least one offer was dispatched
  if (result.offersSent > 0) {
    await prisma.openSlot.update({
      where: { id: slotId },
      data: {
        status: "OFFERED",
        offeredCount: { increment: result.offersSent },
        offeredAt: new Date(),
      },
    }).catch((err) => {
      console.error(`[AUTO-OFFER] Failed to update slot ${slotId} status:`, err);
    });
  }

  console.log(
    `[AUTO-OFFER] Slot ${slotId}: done — ${result.offersSent} offers sent, ${result.skipped} skipped (cooldown), ${result.matchesFound} total matches`,
  );

  return result;
}
