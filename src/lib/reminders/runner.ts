import { prisma } from "@/lib/db";
import { sendBatchReminders } from "./service";

export interface RunnerDetail {
  practiceId: string;
  practiceName: string;
  type: "48h" | "24h";
  sent: number;
  skipped: number;
  failed: number;
}

export interface RunnerResult {
  practicesProcessed: number;
  totalSent: number;
  totalSkipped: number;
  totalFailed: number;
  details: RunnerDetail[];
}

/**
 * Automatically find and send reminders for all practices.
 * Runs both 48h and 24h reminder windows for every practice
 * that has upcoming appointments.
 */
export async function runReminderCycle(): Promise<RunnerResult> {
  const now = new Date();
  const window48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  // Find all practices that have appointments in the next 48h
  const practices = await prisma.practice.findMany({
    where: {
      appointments: {
        some: {
          startTime: { gte: now, lte: window48h },
          status: { notIn: ["CANCELLED", "COMPLETED", "NO_SHOW"] },
        },
      },
    },
    select: { id: true, name: true },
  });

  const details: RunnerDetail[] = [];
  let totalSent = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (const practice of practices) {
    // Run 48h reminders
    const batch48 = await sendBatchReminders(practice.id, "48h");
    details.push({
      practiceId: practice.id,
      practiceName: practice.name,
      type: "48h",
      sent: batch48.sent,
      skipped: batch48.skipped,
      failed: batch48.failed,
    });
    totalSent += batch48.sent;
    totalSkipped += batch48.skipped;
    totalFailed += batch48.failed;

    // Run 24h reminders
    const batch24 = await sendBatchReminders(practice.id, "24h");
    details.push({
      practiceId: practice.id,
      practiceName: practice.name,
      type: "24h",
      sent: batch24.sent,
      skipped: batch24.skipped,
      failed: batch24.failed,
    });
    totalSent += batch24.sent;
    totalSkipped += batch24.skipped;
    totalFailed += batch24.failed;
  }

  return {
    practicesProcessed: practices.length,
    totalSent,
    totalSkipped,
    totalFailed,
    details,
  };
}
