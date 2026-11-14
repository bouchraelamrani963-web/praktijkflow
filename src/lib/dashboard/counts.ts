import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

import { PLANNED_APPOINTMENT_STATUSES } from "./appointment-statuses";

export async function loadDashboardCounts(
  practiceId: string,
  now: Date,
  day: { start: Date; end: Date },
) {
  const range = { gte: day.start, lt: day.end };
  const [appointments, noShows, cancellations, released, available, filled] = await prisma.$transaction([
    prisma.appointment.count({
      where: { practiceId, startTime: range, status: { in: [...PLANNED_APPOINTMENT_STATUSES] } },
    }),
    prisma.appointment.count({
      where: { practiceId, startTime: range, status: "NO_SHOW" },
    }),
    prisma.appointment.count({
      where: { practiceId, startTime: range, status: "CANCELLED" },
    }),
    prisma.openSlot.count({
      where: { practiceId, sourceAppointmentId: { not: null }, createdAt: range },
    }),
    prisma.openSlot.count({
      where: { practiceId, status: "AVAILABLE", startTime: { gt: now } },
    }),
    prisma.openSlot.count({
      where: { practiceId, status: "CLAIMED", claimedAt: range },
    }),
  ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });

  return { appointments, noShows, cancellations, released, available, filled };
}
