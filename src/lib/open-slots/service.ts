import { prisma } from "@/lib/db";
import { autoOfferSlot } from "@/lib/waitlist/auto-offer";

/**
 * Auto-create an open slot when an appointment is cancelled.
 * Skips if:
 * - appointment is not CANCELLED
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
  if (appt.status !== "CANCELLED") return null;
  if (appt.startTime <= new Date()) return null;

  // Check if slot already exists (belt-and-suspenders; unique constraint is the real guard)
  const existing = await prisma.openSlot.findUnique({
    where: { sourceAppointmentId: appt.id },
    select: { id: true },
  });
  if (existing) return existing.id;

  const durationMinutes = Math.round(
    (appt.endTime.getTime() - appt.startTime.getTime()) / 60_000,
  );

  const slot = await prisma.openSlot.create({
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
  });

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

  // Auto-offer to matching waitlist candidates (fire-and-forget, don't block the response)
  autoOfferSlot(slot.id, appt.practiceId).catch((err) => {
    console.error(`[OPEN-SLOT] Auto-offer failed for slot ${slot.id}:`, err);
  });

  return slot.id;
}
