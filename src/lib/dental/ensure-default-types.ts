/**
 * Idempotent bootstrap of the NZa 2026 dental treatment-code catalog
 * onto a single practice.
 *
 * Source-of-truth for the codes/tariffs is `nza-2026.ts` (auto-generated
 * from the official NZa beleidsregel 41758 PDF). This file owns the
 * "given those codes, what AppointmentType rows do we want?" decision:
 *
 *   - name      = "<CODE> — <description>"  (e.g. "C001 — Consult ten behoeve")
 *   - color     = category-based palette (this file)
 *   - price     = NZa 2026 tariff in cents (verbatim from PDF)
 *   - duration  = KNMT category default (heuristic, practice can override)
 *   - active    = true on bootstrap
 *
 * The function is safe to call multiple times and from inside a Prisma
 * transaction (the `client` param accepts both PrismaClient and a
 * transaction client).
 *
 * Match-by-name is intentional: practices can rename a row without losing
 * it on next ensure-call. Conversely if a practice deletes one we'll re-add
 * it — that's the right behaviour for a "restore defaults" action.
 */

import type { PrismaClient } from "@/generated/prisma/client";
import { NZA_2026 } from "@/lib/dental/nza-2026";
import type { KnmtCategory } from "@/lib/dental/knmt-2025";

/**
 * Color per category. Picked from the design system palette so calendar
 * pills read distinctly. Order matters only for documentation — the map
 * itself is just lookup.
 */
const CATEGORY_COLOR: Record<KnmtCategory, string> = {
  C: "#3B82F6", // blue       — Consultatie
  X: "#F59E0B", // amber      — Röntgen
  M: "#10B981", // emerald    — Mondzorg
  A: "#8B5CF6", // violet     — Verdoving
  B: "#A78BFA", // light viol — Roesje
  V: "#06B6D4", // cyan       — Vullingen
  E: "#EF4444", // red        — Endo
  R: "#EC4899", // pink       — Kronen/bruggen
  G: "#F97316", // orange     — Kauwstelsel
  H: "#DC2626", // dark red   — Chirurgie
  P: "#6366F1", // indigo     — Kunstgebit
  T: "#A855F7", // purple     — Parodontologie
  J: "#0EA5E9", // sky        — Implantaten
  U: "#64748B", // slate      — Wlz
  Y: "#94A3B8", // light slate— Info
  F: "#14B8A6", // teal       — Orthodontie
};

/**
 * Display name as stored in `AppointmentType.name`. Embeds the KNMT code
 * so the dropdown self-documents and the code is searchable in the
 * existing patients/appointments forms (which match by `name` substring).
 */
function formatName(code: string, description: string): string {
  return `${code} — ${description}`;
}

export interface EnsureResult {
  /** Total entries in the KNMT 2025 catalog. */
  total: number;
  /** Newly inserted rows. */
  added: number;
  /** Already-present rows (matched by exact name). */
  skipped: number;
}

/**
 * Prisma client OR transaction client — both expose `appointmentType`.
 * Typed loosely so callers don't have to import Prisma's TX type.
 */
type PrismaLike = Pick<PrismaClient, "appointmentType">;

/**
 * Insert any missing default appointment types for `practiceId`. Existing
 * rows with the same `name` are NOT touched (no overwrite of a renamed/
 * re-priced row). New rows are inserted with KNMT 2025 tariff and
 * category-derived color.
 */
export async function ensureDefaultAppointmentTypes(
  client: PrismaLike,
  practiceId: string,
): Promise<EnsureResult> {
  const total = NZA_2026.length;

  const existing = await client.appointmentType.findMany({
    where: { practiceId },
    select: { name: true },
  });

  const knownCodes = new Set(existing.map((t) => t.name.match(/^([A-Z]\\d{2,4}[A-Z]?)\\s*[—–-]/)?.[1]).filter(Boolean));

  const toInsert = NZA_2026
    .filter((t) => !knownCodes.has(t.code))
    .map((t) => ({
      name: formatName(t.code, t.description),
      durationMinutes: t.category === "C" ? 15 : t.category === "X" ? 10 : 30,
      color: CATEGORY_COLOR[t.category as KnmtCategory] ?? "#3B82F6",
      price: t.priceCents,
      isActive: true,
      practiceId,
    }));

  if (toInsert.length === 0) {
    return { total, added: 0, skipped: total };
  }

  await client.appointmentType.createMany({ data: toInsert });

  return { total, added: toInsert.length, skipped: total - toInsert.length };
}
