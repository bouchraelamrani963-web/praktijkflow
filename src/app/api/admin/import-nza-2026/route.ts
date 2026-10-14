import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

// This endpoint is intentionally Preview-only. Production tariffs are never
// updated through this one-off validated NZa 2026 import.
export const runtime = "nodejs";
export const maxDuration = 60;

const SOURCE_SHA256 = "2974a027b6f61dedce88789f72aa5a6a0595742008aef575997f77ee1c19be07";
const SOURCE_REFERENCE = "TB/REG-26616-01";

interface TariffRow {
  code: string;
  description: string;
  priceCents: number;
  category: string;
}

const COLORS: Record<string, string> = {
  A: "#8B5CF6", B: "#A78BFA", C: "#3B82F6", E: "#EF4444",
  G: "#F97316", H: "#DC2626", J: "#0EA5E9", M: "#10B981",
  P: "#6366F1", R: "#EC4899", T: "#A855F7", U: "#64748B",
  V: "#06B6D4", X: "#F59E0B", Y: "#94A3B8",
};

const DURATION_MINUTES: Record<string, number> = {
  A: 10, B: 30, C: 15, E: 60, G: 30, H: 30,
  J: 60, M: 15, P: 60, R: 60, T: 45, U: 15,
  V: 30, X: 10, Y: 15,
};

function catalogCode(name: string): string | null {
  return name.match(/^([A-Z]\d{2,4}[A-Z]?)\s*[—–-]\s*/)?.[1] ?? null;
}

function parseImport(body: unknown): TariffRow[] | null {
  if (!body || typeof body !== "object") return null;
  const obj = body as Record<string, unknown>;
  if (
    obj.year !== 2026 ||
    obj.nzaReference !== SOURCE_REFERENCE ||
    obj.effectiveFrom !== "2026-01-01" ||
    obj.effectiveThrough !== "2026-12-31" ||
    obj.catalogType !== "tandheelkunde" ||
    !Array.isArray(obj.codes) ||
    obj.codes.length !== 322 ||
    !Array.isArray(obj.notFixedTariff) ||
    obj.notFixedTariff.length !== 4
  ) return null;

  const codes: TariffRow[] = [];
  const seen = new Set<string>();
  for (const entry of obj.codes) {
    if (!entry || typeof entry !== "object") return null;
    const row = entry as Record<string, unknown>;
    if (
      typeof row.code !== "string" ||
      !/^[A-Z]\d{2,4}[A-Z]?$/.test(row.code) ||
      typeof row.description !== "string" ||
      row.description.trim() !== row.description ||
      row.description.length < 3 ||
      row.description.length > 300 ||
      !Number.isSafeInteger(row.priceCents) ||
      Number(row.priceCents) < 1 ||
      Number(row.priceCents) > 10000000 ||
      row.category !== row.code[0] ||
      seen.has(row.code)
    ) return null;
    seen.add(row.code);
    codes.push(row as unknown as TariffRow);
  }

  // Only the exact vetted spreadsheet-derived catalog may change prices.
  // Do not trust user-supplied JSON or tariff values without this digest.
  const canonical = [...codes]
    .sort((a, b) => a.code.localeCompare(b.code, "en"))
    .map((row) => row.code + "|" + row.priceCents + "|" + row.description)
    .join("\n");
  const hash = createHash("sha256").update(canonical, "utf8").digest("hex");
  return hash === SOURCE_SHA256 ? codes : null;
}

export async function POST(req: NextRequest) {
  if (process.env.VERCEL_ENV !== "preview") {
    return NextResponse.json({ error: "Import is uitsluitend toegestaan op Preview." }, { status: 403 });
  }
  const user = await getCurrentUser(req);
  if (!user?.practiceId || user.role !== "OWNER") {
    return NextResponse.json({ error: "Alleen de praktijkeigenaar mag tarieven importeren." }, { status: 403 });
  }
  let body: unknown;
  try {
    // Prevent unexpectedly large uploads from reaching the DB.
    if (Number(req.headers.get("content-length") ?? 0) > 400000) {
      return NextResponse.json({ error: "Importbestand is te groot." }, { status: 413 });
    }
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldig JSON-bestand." }, { status: 400 });
  }

  const codes = parseImport(body);
  if (!codes) {
    return NextResponse.json({
      error: "Import afgewezen: gegevens komen niet overeen met de gecontroleerde NZa-lijst 2026.",
    }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.appointmentType.findMany({
        where: { practiceId: user.practiceId! },
        select: {
          id: true, name: true, price: true, isActive: true, createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      });
      const byCode = new Map<string, typeof existing>();
      for (const type of existing) {
        const code = catalogCode(type.name);
        if (!code) continue;
        const group = byCode.get(code) ?? [];
        group.push(type);
        byCode.set(code, group);
      }

      const newRows: Array<{
        practiceId: string; name: string; price: number;
        durationMinutes: number; color: string; isActive: boolean;
      }> = [];
      let updated = 0;
      let unchanged = 0;
      let deactivatedDuplicates = 0;

      for (const row of codes) {
        const displayName = row.code + " — " + row.description;
        const matches = byCode.get(row.code) ?? [];
        if (matches.length === 0) {
          newRows.push({
            practiceId: user.practiceId!, name: displayName,
            price: row.priceCents,
            durationMinutes: DURATION_MINUTES[row.category] ?? 30,
            color: COLORS[row.category] ?? "#3B82F6",
            isActive: true,
          });
          continue;
        }
        // Preserve the identifier and duration of the existing catalog type.
        // The appointment_treatments table stores immutable snapshots of the
        // original code, description and price.
        const canonical = matches.find((t) => t.isActive) ?? matches[0]!;
        if (canonical.name !== displayName || canonical.price !== row.priceCents) {
          await tx.appointmentType.update({
            where: { id: canonical.id },
            data: { name: displayName, price: row.priceCents },
          });
          updated++;
        } else {
          unchanged++;
        }
        // Old duplicate rows remain in the DB for historical references.
        // They are hidden from the "Nieuwe afspraak" catalog, not deleted.
        for (const duplicate of matches) {
          if (duplicate.id !== canonical.id && duplicate.isActive) {
            await tx.appointmentType.update({
              where: { id: duplicate.id },
              data: { isActive: false },
            });
            deactivatedDuplicates++;
          }
        }
      }
      if (newRows.length) await tx.appointmentType.createMany({ data: newRows });

      // Old 2025 orthodontics (F codes) and any custom practice types are
      // deliberately untouched: the uploaded source does not cover them.
      // Also do not delete other legacy codes or any historic appointment.
      const importedCodes = new Set(codes.map((row) => row.code));
      const oldDentalUnverified = [...byCode.keys()].filter(
        (code) => !code.startsWith("F") && !importedCodes.has(code),
      ).length;
      return {
        total: codes.length,
        created: newRows.length,
        updated,
        unchanged,
        deactivatedDuplicates,
        oldDentalUnverified,
      };
    }, { maxWait: 10000, timeout: 55000 });

    return NextResponse.json({
      success: true, ...result,
      noFixedTariff: ["A20", "R90", "J050", "Y02"],
      orthodontics: "Bestaande F-codes (2025) zijn niet gewijzigd.",
      historicalAppointmentsPreserved: true,
    });
  } catch (err) {
    console.error("[nza-2026-import] failed", err);
    return NextResponse.json({
      error: "Import niet voltooid; de transactie is teruggedraaid. Probeer het opnieuw.",
    }, { status: 500 });
  }
}
