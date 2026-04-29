import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { OpenSlotsList } from "@/components/open-slots/OpenSlotsList";
import { SlotPerformanceView } from "@/components/open-slots/SlotPerformanceView";

// Next.js 16: searchParams is a Promise that must be awaited.
type PageSearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const FAST_FILL_THRESHOLD_MIN = 5;

async function loadPerformanceMetrics(practiceId: string) {
  const [totalSlots, claimedSlots] = await Promise.all([
    prisma.openSlot.count({ where: { practiceId } }),
    prisma.openSlot.findMany({
      where: { practiceId, status: "CLAIMED" },
      select: { id: true, createdAt: true, sourceAppointmentId: true },
    }),
  ]);

  const slotsFilled = claimedSlots.length;
  const conversionRate = totalSlots > 0 ? Math.round((slotsFilled / totalSlots) * 100) : 0;

  let avgMinutesToFill: number | null = null;
  let fastFills = 0;

  const appointmentIds = claimedSlots
    .map((s) => s.sourceAppointmentId)
    .filter((id): id is string => Boolean(id));

  if (appointmentIds.length > 0) {
    const claimLogs = await prisma.actionLog.findMany({
      where: {
        practiceId,
        action: "claim_open_slot",
        outcome: "success",
        appointmentId: { in: appointmentIds },
      },
      select: { appointmentId: true, createdAt: true },
    });

    // Use earliest success log per appointment as the claim moment.
    const logByAppointment = new Map<string, Date>();
    for (const log of claimLogs) {
      if (!log.appointmentId) continue;
      const existing = logByAppointment.get(log.appointmentId);
      if (!existing || log.createdAt < existing) {
        logByAppointment.set(log.appointmentId, log.createdAt);
      }
    }

    const durationsMin: number[] = [];
    for (const slot of claimedSlots) {
      if (!slot.sourceAppointmentId) continue;
      const claimedAt = logByAppointment.get(slot.sourceAppointmentId);
      if (!claimedAt) continue;
      const diffMs = claimedAt.getTime() - slot.createdAt.getTime();
      if (diffMs > 0) {
        const minutes = diffMs / 60_000;
        durationsMin.push(minutes);
        if (minutes <= FAST_FILL_THRESHOLD_MIN) fastFills++;
      }
    }

    if (durationsMin.length > 0) {
      avgMinutesToFill = Math.round(
        durationsMin.reduce((a, b) => a + b, 0) / durationsMin.length,
      );
    }
  }

  return {
    avgMinutesToFill,
    slotsFilled,
    conversionRate,
    fastFills,
    totalSlots,
  };
}

export default async function OpenSlotsPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.practiceId) redirect("/dashboard");

  const sp = await searchParams;
  const view = Array.isArray(sp.view) ? sp.view[0] : sp.view;

  if (view === "performance") {
    const metrics = await loadPerformanceMetrics(user.practiceId);
    return <SlotPerformanceView metrics={metrics} />;
  }

  const practitioners = await prisma.user.findMany({
    where: {
      memberships: { some: { practiceId: user.practiceId, isActive: true } },
    },
    select: { id: true, firstName: true, lastName: true },
    orderBy: { lastName: "asc" },
  });

  return <OpenSlotsList practitioners={practitioners} />;
}
