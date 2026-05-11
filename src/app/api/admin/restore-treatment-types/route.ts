import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { DEFAULT_TREATMENT_TYPES } from "@/lib/dental/default-treatment-types";

/**
 * Restore the default Dutch dental treatment-type catalog for the calling
 * user's practice.
 *
 * Idempotent + non-destructive:
 *   - Existing types with a matching name are SKIPPED — never overwritten.
 *   - Only the missing ones are inserted.
 *   - Existing types you've renamed (e.g. "C11 — Periodieke controle" →
 *     "Halfjaarlijkse controle") are left alone, but the canonical name
 *     will be re-added alongside (because name match fails). Operators
 *     can delete the duplicate manually if undesired.
 *
 * Used by:
 *   - Instellingen → "Standaard behandeltypes herstellen" panel
 *   - One-shot recovery for older practices created before
 *     /api/auth/register seeded the catalog at signup.
 *
 * Auth: requires a logged-in user with a practice context. No special
 * role gate yet — any active practice member can restore. Add an OWNER
 * check here later if needed.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.practiceId) {
    return NextResponse.json({ error: "No practice context" }, { status: 403 });
  }

  try {
    // Find which canonical names are already present so we don't insert
    // duplicates. Match is case-sensitive and exact — keep the catalog
    // names stable to make this match reliable.
    const existing = await prisma.appointmentType.findMany({
      where: { practiceId: user.practiceId },
      select: { name: true },
    });
    const existingNames = new Set(existing.map((t) => t.name));

    const toInsert = DEFAULT_TREATMENT_TYPES.filter(
      (t) => !existingNames.has(t.name),
    );

    if (toInsert.length === 0) {
      return NextResponse.json({
        success: true,
        added: 0,
        skipped: DEFAULT_TREATMENT_TYPES.length,
        message: "Alle standaard behandeltypes zijn al aanwezig.",
      });
    }

    await prisma.appointmentType.createMany({
      data: toInsert.map((t) => ({
        practiceId: user.practiceId!,
        name: t.name,
        durationMinutes: t.durationMinutes,
        color: t.color,
        price: t.price,
        isActive: true,
      })),
    });

    return NextResponse.json({
      success: true,
      added: toInsert.length,
      skipped: DEFAULT_TREATMENT_TYPES.length - toInsert.length,
      message: `${toInsert.length} standaard behandeltype${toInsert.length === 1 ? "" : "s"} toegevoegd.`,
    });
  } catch (err) {
    console.error("[api.admin.restore-treatment-types] failed:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Herstellen mislukt",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
