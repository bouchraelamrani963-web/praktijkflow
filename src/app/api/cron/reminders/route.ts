import { type NextRequest } from "next/server";
import { runReminderCycle } from "@/lib/reminders/runner";

/**
 * GET /api/cron/reminders?secret=xxx
 * POST /api/cron/reminders with Authorization: Bearer xxx
 *
 * Protected cron endpoint that runs the full reminder cycle
 * for all practices (48h + 24h windows).
 */

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.warn("[CRON] CRON_SECRET is not set — rejecting all requests");
    return false;
  }

  // Check query param (for GET)
  const querySecret = request.nextUrl.searchParams.get("secret");
  if (querySecret === cronSecret) return true;

  // Check Authorization header (for POST or external cron services)
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${cronSecret}`) return true;

  return false;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runReminderCycle();

  return Response.json({
    ok: true,
    ...result,
  });
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runReminderCycle();

  return Response.json({
    ok: true,
    ...result,
  });
}
