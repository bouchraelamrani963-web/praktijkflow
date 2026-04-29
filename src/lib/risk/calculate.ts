import { prisma } from "@/lib/db";
import { calculateRisk, type RiskResult } from "./engine";

/**
 * Load appointment context from DB and calculate risk.
 * Returns the risk result for a single appointment.
 */
export async function calculateAppointmentRisk(appointmentId: string): Promise<RiskResult> {
  const appt = await prisma.appointment.findUniqueOrThrow({
    where: { id: appointmentId },
    select: {
      clientId: true,
      startTime: true,
      status: true,
    },
  });

  return calculateRiskForClient(appt.clientId, appt.startTime, appt.status, appointmentId);
}

/**
 * Calculate risk given client + appointment details, without requiring
 * the appointment to exist yet (used during creation).
 */
export async function calculateRiskForClient(
  clientId: string,
  startTime: Date,
  status: string,
  excludeAppointmentId?: string,
): Promise<RiskResult> {
  const priorAppointments = await prisma.appointment.findMany({
    where: {
      clientId,
      ...(excludeAppointmentId && { id: { not: excludeAppointmentId } }),
    },
    select: { status: true },
  });

  const priorNoShows = priorAppointments.filter((a) => a.status === "NO_SHOW").length;
  const priorCancellations = priorAppointments.filter((a) => a.status === "CANCELLED").length;
  const priorCompletedVisits = priorAppointments.filter((a) => a.status === "COMPLETED").length;
  const isNewClient = priorAppointments.length === 0;

  return calculateRisk({
    priorNoShows,
    priorCancellations,
    priorCompletedVisits,
    isNewClient,
    startTime,
    status,
  });
}

/**
 * Recalculate and persist risk for a single appointment.
 */
export async function recalcAndSave(appointmentId: string) {
  const result = await calculateAppointmentRisk(appointmentId);
  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { riskScore: result.riskScore, riskLevel: result.riskLevel },
  });
  return result;
}
