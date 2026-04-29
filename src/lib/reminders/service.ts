import type { AppointmentStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { sendSms } from "@/lib/twilio";
import { createActionToken } from "@/lib/tokens/service";
import { resolveTemplate, type TemplateContext } from "./templates";

export interface ReminderResult {
  appointmentId: string;
  status: "sent" | "skipped" | "failed" | "mock";
  reason?: string;
  messageLogId?: string;
}

export interface BatchResult {
  sent: number;
  skipped: number;
  failed: number;
  results: ReminderResult[];
}

const SKIP_STATUSES: AppointmentStatus[] = ["CANCELLED", "COMPLETED", "NO_SHOW"];

/**
 * Send (or skip) a single reminder for one appointment.
 */
export async function sendReminder(
  appointmentId: string,
  practiceId: string,
  type: "48h" | "24h",
): Promise<ReminderResult> {
  const flagField = type === "48h" ? "reminder48hSent" : "reminder24hSent";

  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, practiceId },
    include: {
      client: { select: { id: true, firstName: true, lastName: true, phone: true } },
      appointmentType: { select: { name: true } },
      practice: { select: { name: true } },
    },
  });

  if (!appt) {
    return { appointmentId, status: "skipped", reason: "Appointment not found" };
  }

  // Already sent?
  if (appt[flagField]) {
    return { appointmentId, status: "skipped", reason: `${type} reminder already sent` };
  }

  // Status check
  if (SKIP_STATUSES.includes(appt.status)) {
    return { appointmentId, status: "skipped", reason: `Status is ${appt.status}` };
  }

  // Phone check
  const phone = appt.client.phone;
  if (!phone) {
    const log = await prisma.messageLog.create({
      data: {
        practiceId,
        appointmentId,
        clientId: appt.client.id,
        channel: "sms",
        to: "",
        body: "",
        status: "skipped",
        errorMessage: "Client has no phone number",
        reminderType: type,
      },
    });
    return { appointmentId, status: "skipped", reason: "No phone number", messageLogId: log.id };
  }

  // Create confirm and cancel tokens
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const [confirmToken, cancelToken] = await Promise.all([
    createActionToken({
      practiceId,
      appointmentId,
      clientId: appt.client.id,
      action: "confirm_appointment",
      expiresInHours: type === "48h" ? 72 : 48,
    }),
    createActionToken({
      practiceId,
      appointmentId,
      clientId: appt.client.id,
      action: "cancel_appointment",
      expiresInHours: type === "48h" ? 72 : 48,
    }),
  ]);

  const confirmLink = `${appUrl}/api/public/confirm?token=${confirmToken.rawToken}`;
  const cancelLink = `${appUrl}/api/public/cancel?token=${cancelToken.rawToken}`;

  // Build message
  const ctx: TemplateContext = {
    clientName: `${appt.client.firstName} ${appt.client.lastName}`,
    date: appt.startTime.toLocaleDateString("nl-NL", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    time: appt.startTime.toLocaleTimeString("nl-NL", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    practiceName: appt.practice.name,
    appointmentType: appt.appointmentType?.name ?? "afspraak",
    riskLevel: appt.riskLevel,
    confirmLink,
    cancelLink,
  };

  const body = await resolveTemplate(practiceId, type, ctx);

  // Send
  const smsResult = await sendSms(phone, body);

  const logStatus = smsResult.mock
    ? "mock"
    : smsResult.success
      ? "sent"
      : "failed";

  const log = await prisma.messageLog.create({
    data: {
      practiceId,
      appointmentId,
      clientId: appt.client.id,
      channel: "sms",
      to: phone,
      body,
      status: logStatus,
      errorMessage: smsResult.error ?? null,
      externalSid: smsResult.sid ?? null,
      reminderType: type,
    },
  });

  // Mark flag if sent or mock (not failed)
  if (logStatus !== "failed") {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { [flagField]: true },
    });
  }

  return {
    appointmentId,
    status: logStatus as ReminderResult["status"],
    reason: smsResult.error,
    messageLogId: log.id,
  };
}

/**
 * Send batch reminders for all eligible appointments in a practice
 * within the given time window.
 */
export async function sendBatchReminders(
  practiceId: string,
  type: "48h" | "24h",
): Promise<BatchResult> {
  const now = new Date();
  const windowHours = type === "48h" ? 48 : 24;
  const windowEnd = new Date(now.getTime() + windowHours * 60 * 60 * 1000);

  const flagField = type === "48h" ? "reminder48hSent" : "reminder24hSent";

  const appointments = await prisma.appointment.findMany({
    where: {
      practiceId,
      startTime: { gte: now, lte: windowEnd },
      status: { notIn: SKIP_STATUSES },
      [flagField]: false,
    },
    select: { id: true },
  });

  const results: ReminderResult[] = [];
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const appt of appointments) {
    const result = await sendReminder(appt.id, practiceId, type);
    results.push(result);
    if (result.status === "sent" || result.status === "mock") sent++;
    else if (result.status === "skipped") skipped++;
    else failed++;
  }

  return { sent, skipped, failed, results };
}
