import { NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { seedDemoData } from "@/lib/demo-seed";

/**
 * Trigger the demo-data seed from the dashboard banner button.
 *
 * Guards (any failure → 4xx):
 *   1. DATABASE_URL must be set — there's nothing to seed without a DB.
 *   2. Bypass (demo) mode must be active — i.e. Firebase Admin is NOT
 *      configured. This is the same signal `getCurrentUser()` uses to enable
 *      the FALLBACK_DEV_USER. We refuse to seed demo data into a real auth
 *      tenant by accident.
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
export async function POST() {
  console.log("[SEED] STARTED");

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

  if (isFirebaseAdminConfigured()) {
    console.warn("[SEED] FAILED — Firebase auth is configured (demo seed disabled)");
    return NextResponse.json(
      {
        success: false,
        databaseConfigured: true,
        error: "Demo seed is uitgeschakeld wanneer Firebase-auth geconfigureerd is.",
      },
      { status: 403 },
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
