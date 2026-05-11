/**
 * Parser voor het KNMT Tarievenboekje 2025 (NZa beleidsregel/PDF 41758).
 *
 * Read pdftotext -layout output, extract every line with a recognizable
 * code + description + punten + tarief tuple, group by category letter,
 * and write a TypeScript module with the structured data.
 *
 * Usage:
 *   pdftotext -layout 41758.pdf /tmp/knmt/full.txt
 *   node scripts/parse-knmt-2025.mjs /tmp/knmt/full.txt > src/lib/dental/knmt-2025.ts
 *
 * Caveats logged at runtime:
 *   - Multi-line descriptions are captured ONLY by their first line.
 *   - "Tarief" is the source of truth (already pre-multiplied by the
 *     puntwaarde in the PDF), not punten × puntwaarde recomputation.
 *   - Lines without two numeric columns are skipped (they're notes).
 */

import { readFileSync } from "node:fs";

const path = process.argv[2];
if (!path) {
  console.error("usage: node parse-knmt-2025.mjs <full.txt>");
  process.exit(1);
}

const text = readFileSync(path, "utf8");
const lines = text.split(/\r?\n/);

// Two number-column rows (most C/M/A/B/V/E/R/G/H/P/T/J codes):
//   "  C001  Consult ten behoeve     7,6     57,66  ..."
const reTwoNum =
  /^\s*([A-Z]\d{2,4}[A-Z]?)\*{0,2}\s{2,}([^\d].{4,80}?)\s{2,}(\d{1,4}(?:,\d{1,8})?)\s{2,}(\d{1,4}(?:,\d{1,2})?)(?:\s|$)/;

// Single number-column rows (F-orthodontie + U-tijdtarief + Y-info — these
// either don't have a separate punten column in the PDF OR the punten value
// is shown only in the chapter header, not per row):
//   "  F121A  Eerste consult                                  28,83"
//   "  Y01    Informatieverstrekking aan    17,28  ..."
const reOneNum =
  /^\s*([A-Z]\d{2,4}[A-Z]?)\*{0,2}\s{2,}([^\d].{4,90}?)\s{2,}(\d{1,4}(?:,\d{1,2})?)(?:\s+|$)/;

const CATEGORY_NAMES = {
  C: "Consultatie en diagnostiek",
  X: "Röntgen",
  M: "Preventieve mondzorg",
  A: "Verdoving",
  B: "Roesje / lachgassedatie",
  V: "Vullingen",
  E: "Wortelkanaalbehandelingen",
  R: "Kronen en bruggen",
  G: "Behandelingen kauwstelsel",
  H: "Chirurgische ingrepen",
  P: "Kunstgebitten",
  T: "Tandvleesbehandelingen",
  J: "Implantaten",
  U: "Bijzondere tandheelkunde / Wlz",
  Y: "Informatieverstrekking",
  F: "Orthodontie",
};

// Default duration heuristic per category (minutes). Practices can edit
// per-row in the appointment-types screen.
const DEFAULT_DURATION = {
  C: 15, X: 10, M: 30, A: 10, B: 30, V: 30, E: 60, R: 60,
  G: 30, H: 45, P: 60, T: 30, J: 60, U: 60, Y: 5, F: 30,
};

function parseDecimalToCents(s) {
  // "57,66" -> 5766;  "57"   -> 5700;  "5766"  -> 576600 (no comma = whole euros)
  if (!s.includes(",")) return parseInt(s, 10) * 100;
  const [whole, fracRaw] = s.split(",");
  const frac = (fracRaw + "00").slice(0, 2);
  return parseInt(whole, 10) * 100 + parseInt(frac, 10);
}

function parsePuntenToTenths(s) {
  // "7,6" -> 76; "12" -> 120; "0,5" -> 5
  if (!s.includes(",")) return parseInt(s, 10) * 10;
  const [whole, fracRaw] = s.split(",");
  const frac = (fracRaw + "0").slice(0, 1);
  return parseInt(whole, 10) * 10 + parseInt(frac, 10);
}

const seen = new Map(); // code -> entry (first wins)
let parsed = 0, skipped = 0;

function tryAdd(code, descRaw, puntenStr, tariefStr) {
  const cat = code[0];
  if (!CATEGORY_NAMES[cat]) return false;

  const cleanDesc = descRaw.trim().replace(/\s+/g, " ");
  if (cleanDesc.length < 4 || /^\d+$/.test(cleanDesc)) return false;

  // Reject "headers" caught by accident: lines that are just navigation
  // breadcrumbs (e.g. "C20" alone) won't have descriptions.
  if (/^(en|van|de|het|voor|met)$/i.test(cleanDesc)) return false;

  if (seen.has(code)) return false; // first occurrence wins

  const puntenTenths = puntenStr ? parsePuntenToTenths(puntenStr) : 0;
  const tariefCents = parseDecimalToCents(tariefStr);

  // Sanity-floor: tariff must be at least €1 (100 cents). Filters out matches
  // that captured a stray "7" instead of a real tariff.
  if (tariefCents < 100) return false;

  seen.set(code, {
    code,
    name: cleanDesc,
    category: cat,
    categoryName: CATEGORY_NAMES[cat],
    puntenTenths,
    tariefCents,
    defaultDurationMinutes: DEFAULT_DURATION[cat],
  });
  parsed++;
  return true;
}

for (const raw of lines) {
  // Try two-number form first (more specific) — if it matches, that's the
  // authoritative row.
  let m = reTwoNum.exec(raw);
  if (m) {
    const [, code, desc, puntenStr, tariefStr] = m;
    if (tryAdd(code, desc, puntenStr, tariefStr)) continue;
  }
  // Otherwise try single-number form (F orthodontie, Y info-verstrekking,
  // some U time-tariffs).
  m = reOneNum.exec(raw);
  if (m) {
    const [, code, desc, tariefStr] = m;
    if (tryAdd(code, desc, null, tariefStr)) continue;
  }
  skipped++;
}

const entries = Array.from(seen.values()).sort((a, b) => a.code.localeCompare(b.code));

console.error(`[parse-knmt-2025] parsed=${parsed} skipped=${skipped} unique=${entries.length}`);

// ─── Emit TypeScript module ─────────────────────────────────────────────
const HEADER = `/**
 * KNMT Tarievenboekje 2025 — Prestaties, codes en tarieven Tandheelkunde
 * en orthodontie. Source PDF: NZa beleidsregel 41758 (uploaded by user).
 *
 * AUTO-GENERATED by scripts/parse-knmt-2025.mjs — do NOT edit by hand.
 * To regenerate after a future tariff update, re-run:
 *
 *   pdftotext -layout <new-tarief.pdf> /tmp/knmt/full.txt
 *   node scripts/parse-knmt-2025.mjs /tmp/knmt/full.txt > src/lib/dental/knmt-2025.ts
 *
 * Tariff source-of-truth is the PDF's own "tarief €" column (the parser
 * trusts that, not punten × puntwaarde recomputation). Multi-line code
 * descriptions are captured by their FIRST line only — full text remains
 * in the source PDF.
 *
 * Puntwaarden 2025 (informational, not used for runtime calculation):
 *   Tandheelkundige zorg:    € 7,586440841
 *   Implantologische zorg:   € 6,402181895
 *
 * Rows count: ${entries.length}.
 */

export interface KnmtTariff2025 {
  /** NZa code, e.g. "C011", "X10", "M03". */
  code: string;
  /** Human description (first line from the PDF, trimmed). */
  name: string;
  /** Category letter (C/X/M/A/B/V/E/R/G/H/P/T/J/U/Y/F). */
  category: KnmtCategory;
  /** Dutch label for the category. */
  categoryName: string;
  /** Punten × 10 (integer) so JS floats don't lose precision. */
  puntenTenths: number;
  /** Tariff in eurocents — the PDF's own column, not recomputed. */
  tariefCents: number;
  /** Heuristic default duration for scheduling. Practices can override. */
  defaultDurationMinutes: number;
  /** Practices can flip false to hide from the dropdown without deleting. */
  active: boolean;
}

export type KnmtCategory =
  | "C" | "X" | "M" | "A" | "B" | "V" | "E" | "R"
  | "G" | "H" | "P" | "T" | "J" | "U" | "Y" | "F";

export const KNMT_CATEGORY_LABEL: Record<KnmtCategory, string> = ${JSON.stringify(CATEGORY_NAMES, null, 2)};

export const KNMT_2025: readonly KnmtTariff2025[] = [
`;

const FOOTER = `] as const;

/** Lookup by code. O(n) — wrap in a Map at runtime if needed. */
export function findKnmtTariff(code: string): KnmtTariff2025 | undefined {
  return KNMT_2025.find((t) => t.code === code);
}

/** Group all entries by their category letter. */
export function knmtByCategory(): Record<KnmtCategory, readonly KnmtTariff2025[]> {
  const out = {} as Record<KnmtCategory, KnmtTariff2025[]>;
  for (const t of KNMT_2025) {
    if (!out[t.category]) out[t.category] = [];
    out[t.category].push(t);
  }
  return out as Record<KnmtCategory, readonly KnmtTariff2025[]>;
}
`;

const body = entries
  .map(
    (e) =>
      `  { code: ${JSON.stringify(e.code)}, name: ${JSON.stringify(e.name)}, category: ${JSON.stringify(e.category)}, categoryName: ${JSON.stringify(e.categoryName)}, puntenTenths: ${e.puntenTenths}, tariefCents: ${e.tariefCents}, defaultDurationMinutes: ${e.defaultDurationMinutes}, active: true },`,
  )
  .join("\n");

process.stdout.write(HEADER + body + "\n" + FOOTER);
