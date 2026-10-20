import { NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { seedDemoData } from "@/lib/demo-seed";
import { getCurrentUser, hasRole } from "@/lib/auth/session";
import type { NextRequest } from "next/server";

/**
 * Trigger the demo-data seed from the dashboard banner button.
 *
 * Guards (any failure → 4xx):
 *   1. DATABASE_URL must be set — there's nothing to seed without a DB.
 *   2. The caller must be an authenticated OWNER/ADMIN with a practice.
 *
 * The underlying `seedDemoData` is idempotent: clicking the button twice is
 * a no-op the second time. Writes are NOT wrapped in safeQuery — we want a
 * clear 500 if the seed itself errors so the user knows it didn't work.
 *
 * Console logs use `[SEED]` prefix so they're greppable in Vercel logs:
 *   [SEED] STARTED
 *   [SEED] SUCCESS — already-seeded=… durationMs=…
 *   [SEED] FAILED — <message>
 */
export async function POST(req: NextRequest) {
  console.log("[SEED] STARTED");

  if (process.env.NODE_ENV === "production") {
    console.warn("[SEED] FAILED — disabled in production");
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const user = await getCurrentUser(req);
  if (!user) {
    console.warn("[SEED] FAILED — unauthenticated");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!user.practiceId) {
    console.warn("[SEED] FAILED — no practice context");
    return NextResponse.json({ error: "No practice context" }, { status: 403 });
  }
  if (!hasRole(user, ["OWNER", "ADMIN"])) {
    console.warn("[SEED] FAILED — insufficient role");
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  if (!isDatabaseConfigured()) {
    console.warn("[SEED] FAILED — DATABASE_URL not set");
    return NextResponse.json(
      {
        success: false,
        databaseConfigured: false,
        error: "DATABASE_URL is not set",
        hint: "Voeg een Postgres connection string toe in Vercel → Settings → Environment Variables.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await seedDemoData(prisma);
    console.log(
      `[SEED] SUCCESS — alreadySeeded=${result.alreadySeeded} durationMs=${result.durationMs} ` +
        `clients=${result.counts.clients} appointments=${result.counts.appointments}`,
    );
    return NextResponse.json({
      success: true,
      databaseConfigured: true,
      alreadySeeded: result.alreadySeeded,
      counts: result.counts,
      durationMs: result.durationMs,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[SEED] FAILED —", message, err);
    return NextResponse.json(
      {
        success: false,
        databaseConfigured: true,
        error: "Demo-data laden mislukt",
        message,
      },
      { status: 500 },
    );
  }
}
