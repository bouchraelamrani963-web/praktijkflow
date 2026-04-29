import type { DayOfWeek } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

const JS_DAY_TO_ENUM: Record<number, DayOfWeek> = {
  0: "SUNDAY",
  1: "MONDAY",
  2: "TUESDAY",
  3: "WEDNESDAY",
  4: "THURSDAY",
  5: "FRIDAY",
  6: "SATURDAY",
};

interface MatchedEntry {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string | null;
  clientEmail: string | null;
  preferredDay: string | null;
  preferredTime: string | null;
  appointmentTypeId: string | null;
  appointmentTypeName: string | null;
  score: number;
  reasons: string[];
}

/**
 * Find WAITING waitlist entries that match an AVAILABLE open slot.
 *
 * Matching criteria (scored):
 * - Same practice (required)
 * - Status = WAITING (required)
 * - Appointment type matches (if waitlist entry specifies one)
 * - Preferred day matches the slot's day of week
 * - Preferred time overlaps the slot's time window
 *
 * Returns entries sorted by score descending (best matches first).
 */
export async function findMatchesForSlot(
  slotId: string,
  practiceId: string,
): Promise<MatchedEntry[]> {
  const slot = await prisma.openSlot.findFirst({
    where: { id: slotId, practiceId, status: "AVAILABLE" },
    select: {
      id: true,
      appointmentTypeId: true,
      startTime: true,
      endTime: true,
    },
  });

  if (!slot) return [];

  const slotDay = JS_DAY_TO_ENUM[slot.startTime.getDay()];
  const slotHour = slot.startTime.getHours();

  // Load all WAITING entries for this practice
  const entries = await prisma.waitlistEntry.findMany({
    where: { practiceId, status: "WAITING" },
    include: {
      client: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
      appointmentType: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const results: MatchedEntry[] = [];

  for (const entry of entries) {
    let score = 0;
    const reasons: string[] = [];

    // isFlexible bonus — accepts any available slot
    if (entry.isFlexible) {
      score += 10;
      reasons.push("Flexible patient (accepts any slot)");
    }

    // Type match
    if (entry.appointmentTypeId) {
      if (slot.appointmentTypeId && entry.appointmentTypeId === slot.appointmentTypeId) {
        score += 30;
        reasons.push("Type matches");
      } else if (slot.appointmentTypeId && entry.appointmentTypeId !== slot.appointmentTypeId) {
        // Type specified but doesn't match — skip unless flexible
        if (!entry.isFlexible) continue;
        reasons.push("Type mismatch but flexible");
      }
      // If slot has no type, entry with type preference still matches (lower score)
    } else {
      // No type preference — flexible
      score += 5;
      reasons.push("No type preference (flexible)");
    }

    // Day match
    if (entry.preferredDay) {
      if (entry.preferredDay === slotDay) {
        score += 25;
        reasons.push(`Preferred day (${entry.preferredDay}) matches`);
      }
      // Non-matching day doesn't exclude, just doesn't add score
    } else {
      score += 5;
      reasons.push("No day preference (flexible)");
    }

    // Time match
    if (entry.preferredTime) {
      const timeMatch = matchesTimePreference(entry.preferredTime, slotHour);
      if (timeMatch) {
        score += 20;
        reasons.push(`Preferred time (${entry.preferredTime}) matches`);
      }
    } else {
      score += 5;
      reasons.push("No time preference (flexible)");
    }

    // Seniority bonus: earlier waitlist entries get a small boost
    score += 1;
    reasons.push("Waitlist seniority");

    results.push({
      id: entry.id,
      clientId: entry.client.id,
      clientName: `${entry.client.firstName} ${entry.client.lastName}`,
      clientPhone: entry.client.phone,
      clientEmail: entry.client.email,
      preferredDay: entry.preferredDay,
      preferredTime: entry.preferredTime,
      appointmentTypeId: entry.appointmentTypeId,
      appointmentTypeName: entry.appointmentType?.name ?? null,
      score,
      reasons,
    });
  }

  // Sort by score descending, then by seniority (earlier createdAt = first in original order)
  results.sort((a, b) => b.score - a.score);

  return results;
}

/**
 * Check if a time preference string matches a given hour.
 * Supports: "morning", "afternoon", "evening", or "HH:MM-HH:MM" ranges.
 */
function matchesTimePreference(pref: string, hour: number): boolean {
  const lower = pref.toLowerCase().trim();

  if (lower === "morning" || lower === "ochtend") return hour >= 8 && hour < 12;
  if (lower === "afternoon" || lower === "middag") return hour >= 12 && hour < 17;
  if (lower === "evening" || lower === "avond") return hour >= 17 && hour < 21;

  // Try "HH:MM-HH:MM" range
  const rangeMatch = lower.match(/^(\d{1,2}):?(\d{2})?\s*-\s*(\d{1,2}):?(\d{2})?$/);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1], 10);
    const end = parseInt(rangeMatch[3], 10);
    return hour >= start && hour < end;
  }

  return false;
}
