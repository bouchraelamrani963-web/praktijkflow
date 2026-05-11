/**
 * Canonical default appointment-type catalog for a freshly-bootstrapped
 * dental practice in the Netherlands.
 *
 * Codes follow the official NZa "Tarievenlijst Mondzorg" letter prefixes
 * (C / M / A / X / V / E / T / R / P / F). The user's original spec used
 * "H parodontologie", but the actual NZa code letter for parodontology is
 * **T** — keeping the official letters here so the catalog matches what
 * Dutch dentists already see on insurance forms.
 *
 * Prices below are realistic *defaults* — not the legally-binding NZa
 * tariff (which changes annually). Practices can edit each row in the
 * appointment-types screen, or the admin restore endpoint will only ADD
 * missing rows, never overwrite edits.
 *
 * Used by:
 *   - /api/auth/register      → seeds the catalog at signup
 *   - /api/admin/restore-treatment-types → idempotent restore for older accounts
 */

export interface DefaultTreatmentType {
  /** Code-prefixed name as it appears in the dropdown, e.g. "C11 — Periodieke controle". */
  name: string;
  /** Default duration in minutes — practices can override. */
  durationMinutes: number;
  /** Default price in cents (EUR). 0 means "set per case" (practice will edit). */
  price: number;
  /** Hex colour for calendar/badge use. Grouped by category. */
  color: string;
}

export const DEFAULT_TREATMENT_TYPES: DefaultTreatmentType[] = [
  // ─── C — Consult / diagnostiek ───────────────────────────────────────────
  { name: "C11 — Periodieke controle",                 durationMinutes: 20, price: 2400,  color: "#3B82F6" },
  { name: "C13 — Probleemgericht consult",             durationMinutes: 20, price: 2400,  color: "#3B82F6" },

  // ─── M — Mondhygiëne / preventie ─────────────────────────────────────────
  { name: "M03 — Gebitsreiniging",                     durationMinutes: 30, price: 1700,  color: "#10B981" },
  { name: "M40 — Fluoride-applicatie",                 durationMinutes: 15, price: 1500,  color: "#10B981" },

  // ─── A — Anesthesie ──────────────────────────────────────────────────────
  { name: "A10 — Geleidings-/infiltratieanesthesie",   durationMinutes: 10, price: 1700,  color: "#8B5CF6" },

  // ─── X — Röntgen ─────────────────────────────────────────────────────────
  { name: "X10 — Kleine röntgenfoto",                  durationMinutes: 10, price: 1900,  color: "#F59E0B" },
  { name: "X21 — Kaakoverzichtsfoto (OPG)",            durationMinutes: 15, price: 7300,  color: "#F59E0B" },

  // ─── V — Vullingen ───────────────────────────────────────────────────────
  { name: "V91 — Eenvlaksvulling composiet",           durationMinutes: 30, price: 6500,  color: "#06B6D4" },
  { name: "V92 — Tweevlaksvulling composiet",          durationMinutes: 45, price: 8800,  color: "#06B6D4" },
  { name: "V93 — Drievlaksvulling composiet",          durationMinutes: 60, price: 10800, color: "#06B6D4" },

  // ─── E — Endodontologie ──────────────────────────────────────────────────
  { name: "E13 — Wortelkanaalbehandeling 1 kanaal",    durationMinutes: 60, price: 17800, color: "#EF4444" },
  { name: "E16 — Wortelkanaalbehandeling 2 kanalen",   durationMinutes: 75, price: 24800, color: "#EF4444" },

  // ─── T — Parodontologie (NZa-letter, niet H) ─────────────────────────────
  { name: "T11 — Parodontaal onderzoek (DPSI)",        durationMinutes: 30, price: 4400,  color: "#A855F7" },
  { name: "T22 — Initiële parodontale behandeling",    durationMinutes: 45, price: 7900,  color: "#A855F7" },

  // ─── R — Kroon- en brugwerk ──────────────────────────────────────────────
  { name: "R24 — Kroon (porselein/keramiek)",          durationMinutes: 90, price: 28500, color: "#EC4899" },

  // ─── P — Prothese ────────────────────────────────────────────────────────
  { name: "P21 — Volledige boven- of onderprothese",   durationMinutes: 60, price: 60000, color: "#6366F1" },

  // ─── F — Orthodontie (basis) ─────────────────────────────────────────────
  { name: "F121A — Orthodontie consult",               durationMinutes: 30, price: 4500,  color: "#14B8A6" },
];
