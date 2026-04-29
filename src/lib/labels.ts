/**
 * Central UI label mapping.
 *
 * Everything that comes out of the database as an English enum, day name,
 * part-of-day string, or legacy appointment-type name is translated to Dutch
 * here — NEVER inline in components. The app is Dutch-only in the UI.
 *
 * All lookups use the `LABELS[key] ?? key` pattern at call sites so an
 * unmapped value (new enum variant, unexpected seed data) still renders
 * something readable instead of `undefined`. That defensive fallback is
 * intentional — do not replace it with a throw.
 */

/** Prisma `DayOfWeek` enum → Dutch day name. */
export const DAY_LABELS: Record<string, string> = {
  MONDAY: "Maandag",
  TUESDAY: "Dinsdag",
  WEDNESDAY: "Woensdag",
  THURSDAY: "Donderdag",
  FRIDAY: "Vrijdag",
  SATURDAY: "Zaterdag",
  SUNDAY: "Zondag",
};

/** Part-of-day preference string (legacy lowercase + safe uppercase). */
export const TIME_LABELS: Record<string, string> = {
  morning: "Ochtend",
  afternoon: "Middag",
  evening: "Avond",
  MORNING: "Ochtend",
  AFTERNOON: "Middag",
  EVENING: "Avond",
};

/**
 * All status enums rendered in the UI, merged into a single map.
 *
 * Merging is safe because no two enums share a key — WaitlistStatus,
 * AppointmentStatus, and OpenSlotStatus have disjoint value sets. If a new
 * enum ever collides, split this into per-domain maps.
 */
export const STATUS_LABELS: Record<string, string> = {
  // WaitlistStatus
  WAITING: "Wachtend",
  OFFERED: "Aangeboden",
  ACCEPTED: "Geaccepteerd",
  EXPIRED: "Verlopen",
  CANCELLED: "Geannuleerd",

  // AppointmentStatus (CANCELLED already covered above)
  SCHEDULED: "Gepland",
  CONFIRMED: "Bevestigd",
  IN_PROGRESS: "Bezig",
  COMPLETED: "Afgerond",
  NO_SHOW: "Niet verschenen",

  // OpenSlotStatus (EXPIRED already covered above)
  AVAILABLE: "Vrijgekomen",
  CLAIMED: "Opnieuw ingevuld",
};

/** RiskLevel enum → Dutch label. */
export const RISK_LABELS: Record<string, string> = {
  LOW: "Laag",
  MEDIUM: "Gemiddeld",
  HIGH: "Hoog",
  CRITICAL: "Kritiek",
};

/**
 * Legacy appointment-type names that may still live in seed / demo data.
 * AppointmentType.name is a free-text field, so this map only covers the
 * known English strings we have historically emitted — real custom names
 * pass through unchanged via `TYPE_LABELS[name] ?? name`.
 */
export const TYPE_LABELS: Record<string, string> = {
  "Follow-up": "Controle",
  "Follow up": "Controle",
  Followup: "Controle",
  Checkup: "Controle",
  "Check-up": "Controle",
  Cleaning: "Gebitsreiniging",
  Consultation: "Consult",
};
