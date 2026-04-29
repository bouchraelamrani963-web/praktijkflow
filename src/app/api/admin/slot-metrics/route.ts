import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

/**
 * Slot-fill metrics derived from OpenSlot (the immutable source of truth for
 * claim data, per Task 2) + ActionLog for non-slot counts (offer sends).
 *
 * Returns:
 *  - slotsFreed:          total open slots created (all time)
 *  - offersSent:          total auto_offer_sent log rows (all time)
 *  - slotsFilled:         total open slots in CLAIMED status
 *  - fillRate:            slotsFilled / slotsFreed (%)
 *  - avgMinutesToFill:    mean of (claimedAt - createdAt) across CLAIMED slots
 *  - recoveredRevenueCents: SUM(recoveredRevenueCents) from CLAIMED slots (snapshot)
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.practiceId) return NextResponse.json({ error: "No practice context" }, { status: 403 });

  const practiceId = user.practiceId;

  const [
    slotsFreed,
    offersSent,
    slotsFilled,
    claimedSlots,
    recoveredAgg,
  ] = await Promise.all([
    prisma.openSlot.count({ where: { practiceId } }),
    prisma.actionLog.count({
      where: { practiceId, action: "auto_offer_sent" },
    }),
    prisma.openSlot.count({ where: { practiceId, status: "CLAIMED" } }),

    // Average time-to-fill: read claimedAt + createdAt straight from the slot.
    // No ActionLog join — claimedAt is the authoritative claim timestamp.
    prisma.openSlot.findMany({
      where: { practiceId, status: "CLAIMED", claimedAt: { not: null } },
      select: { createdAt: true, claimedAt: true },
    }),

    // Recovered revenue is SUM(recoveredRevenueCents) — the snapshot. Never
    // recomputed from Appointment.revenueEstimateCents (which can change).
    prisma.openSlot.aggregate({
      where: { practiceId, status: "CLAIMED" },
      _sum: { recoveredRevenueCents: true },
    }),
  ]);

  const recoveredRevenueCents = recoveredAgg._sum.recoveredRevenueCents ?? 0;

  // avg fill time, computed only from slots that have a non-null claimedAt
  // (orphan legacy rows are excluded automatically by the `not: null` filter).
  let avgMinutesToFill: number | null = null;
  if (claimedSlots.length > 0) {
    const durationsMin: number[] = [];
    for (const s of claimedSlots) {
      if (!s.claimedAt) continue;
      const diffMs = s.claimedAt.getTime() - s.createdAt.getTime();
      if (diffMs > 0) durationsMin.push(diffMs / 60_000);
    }
    if (durationsMin.length > 0) {
      avgMinutesToFill = Math.round(
        durationsMin.reduce((a, b) => a + b, 0) / durationsMin.length,
      );
    }
  }

  const fillRate = slotsFreed > 0 ? Math.round((slotsFilled / slotsFreed) * 100) : 0;

  return NextResponse.json({
    slotsFreed,
    offersSent,
    slotsFilled,
    fillRate,
    avgMinutesToFill,
    recoveredRevenueCents,
  });
}
