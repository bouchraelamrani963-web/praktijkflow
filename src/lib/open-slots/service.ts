import { Prisma, type AppointmentStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { autoOfferSlot } from "@/lib/waitlist/auto-offer";

const AUTO_OPEN_SLOT_STATUSES = new Set<AppointmentStatus>(["CANCELLED", "NO_SHOW"]);

export function shouldCreateOpenSlotForAppointmentStatus(status: AppointmentStatus): boolean {
  return AUTO_OPEN_SLOT_STATUSES.has(status);
}

/**
 * Auto-create an open slot when an appointment is cancelled or marked no-show.
 * Skips if:
 * - appointment is not CANCELLED or NO_SHOW
 * - appointment is in the past
 * - an open slot already exists for this appointment (unique constraint)
 */
export async function maybeCreateOpenSlot(appointmentId: string): Promise<string | null> {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      practiceId: true,
      practitionerId: true,
      appointmentTypeId: true,
      startTime: true,
      endTime: true,
      status: true,
    },
  });

  if (!appt) return null;
  if (!shouldCreateOpenSlotForAppointmentStatus(appt.status)) return null;
  if (appt.startTime <= new Date()) return null;

  // Check if slot already exists; the unique constraint remains the real guard.
  const existing = await prisma.openSlot.findUnique({
    where: { sourceAppointmentId: appt.id },
    select: { id: true },
  });
  if (existing) return existing.id;

  const durationMinutes = Math.round(
    (appt.endTime.getTime() - appt.startTime.getTime()) / 60_000,
  );

  let slot: { id: string; startTime: Date };
  try {
    slot = await prisma.openSlot.create({
      data: {
        practiceId: appt.practiceId,
        sourceAppointmentId: appt.id,
        practitionerId: appt.practitionerId,
        appointmentTypeId: appt.appointmentTypeId,
        startTime: appt.startTime,
        endTime: appt.endTime,
        durationMinutes,
        status: "AVAILABLE",
      },
      select: { id: true, startTime: true },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const racedExisting = await prisma.openSlot.findUnique({
        where: { sourceAppointmentId: appt.id },
        select: { id: true },
      });
      return racedExisting?.id ?? null;
    }
    throw err;
  }

  console.log(
    `[SLOT-FREED] Slot ${slot.id} | appointment ${appointmentId} | ${slot.startTime.toISOString()} | ${durationMinutes}min`,
  );

  // Audit log for slot freed
  await prisma.actionLog
    .create({
      data: {
        practiceId: appt.practiceId,
        appointmentId: appt.id,
        action: "slot_freed",
        outcome: "success",
        details: `OpenSlot ${slot.id} created (${durationMinutes}min)`,
      },
    })
    .catch((err) => console.error("[SLOT-FREED] audit log failed:", err));

  // Run auto-offer inside the request so serverless runtimes do not drop it
  // after the response. A failed auto-offer must not undo the status change.
  try {
    await autoOfferSlot(slot.id, appt.practiceId);
  } catch (err) {
    console.error(`[OPEN-SLOT] Auto-offer failed for slot ${slot.id}:`, err);
  }

  return slot.id;
}
