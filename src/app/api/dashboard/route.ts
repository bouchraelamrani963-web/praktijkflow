import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

/**
 * Dashboard KPI endpoint — production-hardened.
 *
 * All aggregate queries are executed inside a single try/catch. If ANY query
 * fails (DB offline, schema drift, bad cast, etc.) we log the real error and
 * return a zero-valued fallback payload so the UI never crashes on a null
 * reference. Callers must assume every monetary field may be 0 but never
 * undefined.
 *
 * Monthly CLAIMED queries are scoped with `claimedAt: { not: null }` as a
 * belt-and-suspenders guard — a CLAIMED row without a claim timestamp is a
 * data-integrity bug and must never leak into revenue totals.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.practiceId) return NextResponse.json({ error: "No practice context" }, { status: 403 });

  const practiceId = user.practiceId;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const next7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Fallback payload — shape matches the success payload so the client never
  // has to branch on "did the API work today?". Zeroes everywhere, empty
  // arrays everywhere. Subscriber-visible surface degrades gracefully.
  const fallback = {
    kpis: {
      appointmentsToday: 0,
      totalClients: 0,
      scheduled: 0,
      confirmed: 0,
      cancelled: 0,
      noShow: 0,
      completed: 0,
      openSlotsCreated: 0,
      openSlotsClaimed: 0,
      revenueThisMonthCents: 0,
      recoveredRevenueCents: 0,
      recoveredRevenueThisMonthCents: 0,
      missedRevenueThisMonthCents: 0,
      netLossThisMonthCents: 0,
    },
    highRiskUpcoming: [],
    recentCancellations: [],
    recentOpenSlots: [],
    userName: user.firstName,
    demoMode: false,
    degraded: true as const,
  };

  try {
    const [
      appointmentsToday,
      totalClients,
      statusCounts,
      openSlotsCreated,
      openSlotsClaimed,
      revenueThisMonth,
      recoveredAggAll,
      recoveredAggMonth,
      missedRevenueAggMonth,
      highRiskUpcoming,
      recentCancellations,
      recentOpenSlots,
    ] = await Promise.all([
      // Appointments today
      prisma.appointment.count({
        where: { practiceId, startTime: { gte: todayStart, lt: todayEnd } },
      }),

      // Total active clients
      prisma.client.count({ where: { practiceId, isActive: true } }),

      // Status counts (this month)
      prisma.appointment.groupBy({
        by: ["status"],
        where: { practiceId, startTime: { gte: monthStart } },
        _count: true,
      }),

      // Open slots created (all time)
      prisma.openSlot.count({ where: { practiceId } }),

      // Open slots claimed (all time) — only count rows with a claim timestamp,
      // otherwise a half-written CLAIMED row would inflate the numerator of
      // the fill-rate KPI.
      prisma.openSlot.count({
        where: { practiceId, status: "CLAIMED", claimedAt: { not: null } },
      }),

      // Revenue this month (from all non-cancelled/no-show appointments)
      prisma.appointment.aggregate({
        where: {
          practiceId,
          startTime: { gte: monthStart },
          status: { notIn: ["CANCELLED", "NO_SHOW"] },
        },
        _sum: { revenueEstimateCents: true },
      }),

      // ─── Recovered revenue is read STRAIGHT from the OpenSlot snapshot —
      // never recomputed from the downstream Appointment. The slot row is the
      // immutable source of truth. Require claimedAt != null so orphaned
      // CLAIMED rows (without a claim moment) cannot leak into totals.
      prisma.openSlot.aggregate({
        where: { practiceId, status: "CLAIMED", claimedAt: { not: null } },
        _sum: { recoveredRevenueCents: true },
      }),

      // Recovered revenue THIS MONTH uses claimedAt (the actual claim moment),
      // NOT updatedAt — so later edits to the row don't leak revenue into or
      // out of the month. `claimedAt: { gte: monthStart }` implicitly excludes
      // nulls, but we keep the query shape symmetric with recoveredAggAll.
      prisma.openSlot.aggregate({
        where: {
          practiceId,
          status: "CLAIMED",
          claimedAt: { gte: monthStart, not: null },
        },
        _sum: { recoveredRevenueCents: true },
      }),

      // Missed revenue = sum of revenueEstimateCents on CANCELLED + NO_SHOW
      // appointments scheduled this month. Bucketed by startTime so it aligns
      // with the rest of the month's figures.
      prisma.appointment.aggregate({
        where: {
          practiceId,
          startTime: { gte: monthStart },
          status: { in: ["CANCELLED", "NO_SHOW"] },
        },
        _sum: { revenueEstimateCents: true },
      }),

      // Upcoming high-risk appointments (next 7 days, HIGH or CRITICAL)
      prisma.appointment.findMany({
        where: {
          practiceId,
          startTime: { gte: now, lte: next7d },
          status: { notIn: ["CANCELLED", "COMPLETED", "NO_SHOW"] },
          riskLevel: { in: ["HIGH", "CRITICAL"] },
        },
        orderBy: { startTime: "asc" },
        take: 5,
        include: {
          client: { select: { id: true, firstName: true, lastName: true } },
          practitioner: { select: { id: true, firstName: true, lastName: true } },
          appointmentType: { select: { name: true } },
        },
      }),

      // Recent cancellations (last 7 days)
      prisma.appointment.findMany({
        where: {
          practiceId,
          status: "CANCELLED",
          updatedAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
        include: {
          client: { select: { firstName: true, lastName: true } },
          appointmentType: { select: { name: true } },
        },
      }),

      // Recent open slots — reads the claim snapshot directly from the slot
      // row. The dashboard table links each CLAIMED row to its stored
      // claimedAppointmentId, AVAILABLE rows to the filtered waitlist.
      prisma.openSlot.findMany({
        where: { practiceId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          practitioner: { select: { firstName: true, lastName: true } },
          appointmentType: { select: { id: true, name: true } },
        },
      }),
    ]);

    // Orphan detection — warn if any CLAIMED recentOpenSlots lack claimedAppointmentId.
    const orphans = recentOpenSlots.filter(
      (s) => s.status === "CLAIMED" && !s.claimedAppointmentId,
    );
    if (orphans.length > 0) {
      console.warn(
        `[DASHBOARD] ORPHAN CLAIMED slot(s) in practice ${practiceId}:`,
        orphans.map((s) => s.id),
      );
    }

    // Build status count map
    const counts: Record<string, number> = {};
    for (const row of statusCounts) {
      counts[row.status] = row._count;
    }

    const recoveredRevenueCents = recoveredAggAll._sum.recoveredRevenueCents ?? 0;
    const recoveredRevenueThisMonthCents =
      recoveredAggMonth._sum.recoveredRevenueCents ?? 0;
    const missedRevenueThisMonthCents =
      missedRevenueAggMonth._sum.revenueEstimateCents ?? 0;
    const netLossThisMonthCents = Math.max(
      0,
      missedRevenueThisMonthCents - recoveredRevenueThisMonthCents,
    );

    // ─── Demo-mode augmentation ────────────────────────────────────────────
    // When the practice has not yet accrued any recovered revenue (empty
    // demo DB, fresh account), we substitute a believable recovery scenario
    // so the dashboard always tells a "money just came back" story. This
    // ONLY mutates the response payload — the DB is untouched.
    const isDemoMode =
      process.env.NODE_ENV === "development" ||
      process.env.NEXT_PUBLIC_DEMO_MODE === "true";

    const kpis = {
      appointmentsToday,
      totalClients,
      scheduled: counts["SCHEDULED"] ?? 0,
      confirmed: counts["CONFIRMED"] ?? 0,
      cancelled: counts["CANCELLED"] ?? 0,
      noShow: counts["NO_SHOW"] ?? 0,
      completed: counts["COMPLETED"] ?? 0,
      openSlotsCreated,
      openSlotsClaimed,
      revenueThisMonthCents: revenueThisMonth._sum.revenueEstimateCents ?? 0,
      recoveredRevenueCents,
      recoveredRevenueThisMonthCents,
      missedRevenueThisMonthCents,
      netLossThisMonthCents,
    };

    let finalOpenSlots: typeof recentOpenSlots | Array<
      (typeof recentOpenSlots)[number] | Record<string, unknown>
    > = recentOpenSlots;

    if (isDemoMode && recoveredRevenueThisMonthCents === 0) {
      // Guaranteed non-zero demo numbers. Missed > recovered so the net-loss
      // card still communicates "there's more to recover".
      kpis.recoveredRevenueThisMonthCents = 17000;
      kpis.missedRevenueThisMonthCents = 32000;
      kpis.netLossThisMonthCents = 15000;
      kpis.recoveredRevenueCents = Math.max(17000, kpis.recoveredRevenueCents);
      kpis.openSlotsCreated = Math.max(2, kpis.openSlotsCreated);
      kpis.openSlotsClaimed = Math.max(1, kpis.openSlotsClaimed);

      // Ensure ≥1 CLAIMED row with a real click target. We pick an
      // existing appointment so /appointments/[id] resolves cleanly.
      const hasClaimed = recentOpenSlots.some(
        (s) => s.status === "CLAIMED" && s.claimedAppointmentId,
      );
      if (!hasClaimed) {
        const anyAppt = await prisma.appointment.findFirst({
          where: { practiceId },
          orderBy: { updatedAt: "desc" },
          include: {
            practitioner: { select: { firstName: true, lastName: true } },
            appointmentType: { select: { id: true, name: true } },
          },
        });
        if (anyAppt) {
          const claimedAt = new Date(now.getTime() - 30 * 60 * 1000);
          const syntheticSlot = {
            id: `demo-claimed-${anyAppt.id}`,
            practiceId,
            sourceAppointmentId: null,
            practitionerId: anyAppt.practitionerId,
            appointmentTypeId: anyAppt.appointmentTypeId,
            startTime: new Date(now.getTime() + 24 * 60 * 60 * 1000),
            endTime: new Date(now.getTime() + 25 * 60 * 60 * 1000),
            durationMinutes: 30,
            status: "CLAIMED" as const,
            notes: null,
            claimedAppointmentId: anyAppt.id,
            claimedAt,
            claimedClientName: null,
            claimedAppointmentType: anyAppt.appointmentType?.name ?? null,
            recoveredRevenueCents: 9500,
            createdAt: new Date(now.getTime() - 60 * 60 * 1000),
            updatedAt: claimedAt,
            practitioner: anyAppt.practitioner,
            appointmentType: anyAppt.appointmentType,
          };
          finalOpenSlots = [syntheticSlot, ...recentOpenSlots];
        }
      }
    }

    return NextResponse.json({
      kpis,
      highRiskUpcoming,
      recentCancellations,
      recentOpenSlots: finalOpenSlots,
      userName: user.firstName,
      demoMode: isDemoMode,
    });
  } catch (err) {
    // Log the REAL error server-side. The client only sees the degraded
    // fallback payload — never a raw Prisma stack trace or PII.
    console.error(
      `[DASHBOARD] Aggregate query failed for practice ${practiceId}:`,
      err,
    );
    return NextResponse.json(fallback);
  }
}
