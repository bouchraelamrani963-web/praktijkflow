import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { ensureDefaultAppointmentTypes } from "@/lib/dental/ensure-default-types";

/**
 * Restore the KNMT 2025 dental treatment-code catalog for the calling
 * user's practice.
 *
 * Idempotent + non-destructive — see ensureDefaultAppointmentTypes() for
 * the exact contract:
 *   - Existing rows with a matching name are SKIPPED.
 *   - Only the missing ones are inserted.
 *   - Renamed rows are NOT overwritten — but the canonical "<CODE> — <desc>"
 *     name will be re-added alongside (because name match fails).
 *
 * Used by:
 *   - Instellingen → "Standaard behandelcodes 2025 laden" panel
 *   - One-shot recovery for older practices created before
 *     /api/auth/register seeded the catalog at signup.
 *
 * Auth: requires a logged-in user with a practice context. No special
 * role gate yet — any active practice member can restore.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.practiceId) {
    return NextResponse.json({ error: "No practice context" }, { status: 403 });
  }

  try {
    const result = await ensureDefaultAppointmentTypes(prisma, user.practiceId);

    if (result.added === 0) {
      return NextResponse.json({
        success: true,
        added: 0,
        skipped: result.skipped,
        total: result.total,
        message: "Alle standaard behandelcodes 2025 zijn al aanwezig.",
      });
    }

    return NextResponse.json({
      success: true,
      added: result.added,
      skipped: result.skipped,
      total: result.total,
      message: `${result.added} behandelcode${result.added === 1 ? "" : "s"} toegevoegd uit KNMT Tarievenboekje 2025.`,
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
