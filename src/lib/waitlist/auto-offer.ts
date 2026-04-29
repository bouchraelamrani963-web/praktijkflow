import { prisma } from "@/lib/db";
import { findMatchesForSlot } from "./matching";
import { createActionToken } from "@/lib/tokens/service";
import { sendSms } from "@/lib/twilio";

const MAX_OFFERS = 3;
const CLAIM_EXPIRY_HOURS = 2;
const COOLDOWN_HOURS = 2; // no patient receives more than 1 offer per 2 hours

interface AutoOfferResult {
  slotId: string;
  matchesFound: number;
  offersSent: number;
  skipped: number;
  details: {
    waitlistEntryId: string;
    clientName: string;
    smsStatus: string;
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
 *    - Create 2h claim token, send SMS, mark OFFERED, log
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

  // ─── SAFETY CHECK: slot must still be AVAILABLE ────────────────────────
  const slot = await prisma.openSlot.findFirst({
    where: { id: slotId, practiceId, status: "AVAILABLE" },
    include: {
      practice: { select: { name: true } },
    },
  });

  if (!slot) {
    console.log(`[AUTO-OFFER] Slot ${slotId}: not available (may have been claimed)`);
    return result;
  }

  if (!slot.sourceAppointmentId) {
    console.log(`[AUTO-OFFER] Slot ${slotId}: manual slot, skipping auto-offer`);
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
      id: { not: slot.sourceAppointmentId },
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
    // ─── SAFETY CHECK: slot still AVAILABLE between iterations ──────────
    const stillAvailable = await prisma.openSlot.findFirst({
      where: { id: slotId, practiceId, status: "AVAILABLE" },
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
        `[AUTO-OFFER] Skipped ${candidate.clientName} (cooldown): recent offer at ${recentOffer.createdAt.toISOString()}`,
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

    try {
      // Create claim token with 2h expiry
      const token = await createActionToken({
        practiceId,
        appointmentId: slot.sourceAppointmentId,
        clientId: candidate.clientId,
        action: "claim_open_slot",
        expiresInHours: CLAIM_EXPIRY_HOURS,
      });

      // Mark waitlist entry as OFFERED
      await prisma.waitlistEntry.update({
        where: { id: candidate.id },
        data: { status: "OFFERED" },
      });

      // Send SMS
      const actionUrl = `/action/${token.rawToken}`;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      let smsStatus = "no_phone";

      if (candidate.clientPhone) {
        const smsBody =
          `Beste ${candidate.clientName.split(" ")[0]}, er is een plek vrijgekomen bij ${slot.practice.name} ` +
          `op ${fmtDate}. U heeft 2 uur om te reageren. ` +
          `Claim uw afspraak via: ${appUrl}${actionUrl}`;

        const smsResult = await sendSms(candidate.clientPhone, smsBody);
        smsStatus = smsResult.mock ? "mock" : smsResult.success ? "sent" : "failed";

        await prisma.messageLog.create({
          data: {
            practiceId,
            appointmentId: slot.sourceAppointmentId,
            clientId: candidate.clientId,
            channel: "sms",
            to: candidate.clientPhone,
            body: smsBody,
            status: smsStatus,
            errorMessage: smsResult.error ?? null,
            externalSid: smsResult.sid ?? null,
          },
        });
      }

      // Audit log
      await prisma.actionLog.create({
        data: {
          practiceId,
          appointmentId: slot.sourceAppointmentId,
          clientId: candidate.clientId,
          action: "auto_offer_sent",
          outcome: smsStatus,
          details: `Auto-offer for slot ${slotId} | Score: ${candidate.score} | Reasons: ${candidate.reasons.join(", ")}`,
        },
      });

      result.offersSent++;
      result.details.push({
        waitlistEntryId: candidate.id,
        clientName: candidate.clientName,
        smsStatus,
      });

      console.log(
        `[AUTO-OFFER] Offered slot ${slotId} to ${candidate.clientName} (score: ${candidate.score}, sms: ${smsStatus})`,
      );
    } catch (err) {
      console.error(
        `[AUTO-OFFER] Failed to offer slot ${slotId} to ${candidate.clientName}:`,
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

  console.log(
    `[AUTO-OFFER] Slot ${slotId}: done — ${result.offersSent} offers sent, ${result.skipped} skipped (cooldown), ${result.matchesFound} total matches`,
  );

  return result;
}
