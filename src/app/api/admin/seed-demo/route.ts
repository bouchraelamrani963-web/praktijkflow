import { NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { seedDemoData } from "@/lib/demo-seed";

/**
 * Trigger the demo-data seed from the dashboard banner button.
 *
 * Guards (any failure → 403):
 *   1. DATABASE_URL must be set — there's nothing to seed without a DB.
 *   2. Bypass (demo) mode must be active — i.e. Firebase Admin is NOT
 *      configured. This is the same signal `getCurrentUser()` uses to enable
 *      the FALLBACK_DEV_USER. We refuse to seed demo data into a real auth
 *      tenant by accident.
 *
 * The underlying `seedDemoData` is idempotent: clicking the button twice is
 * a no-op the second time. Writes are NOT wrapped in safeQuery — we want a
 * clear 500 if the seed itself errors so the user knows it didn't work.
 */
export async function POST() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not set", hint: "Add a Postgres connection string in Vercel env vars first." },
      { status: 400 },
    );
  }

  if (isFirebaseAdminConfigured()) {
    return NextResponse.json(
      { error: "Demo seed is disabled when Firebase auth is configured." },
      { status: 403 },
    );
  }

  try {
    const result = await seedDemoData(prisma);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api.admin.seed-demo] failed:", err);
    return NextResponse.json(
      { error: "Seed failed", message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
