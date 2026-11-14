import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { amsterdamToday } from "@/lib/dashboard/amsterdam-day";
import { loadDashboardActions, loadDashboardHistory } from "@/lib/dashboard/automation";
import { loadDashboardCounts } from "@/lib/dashboard/counts";
import type { DashboardData } from "@/lib/dashboard/types";

const privateHeaders = { "Cache-Control": "private, no-store" };

function pageNumber(value: string | null): number {
  const page = Number(value ?? 1);
  return Number.isSafeInteger(page) && page >= 1 && page <= 100_000 ? page : 1;
}

async function dashboardSection<T>(name: string, query: Promise<T>): Promise<T | null> {
  try {
    return await query;
  } catch {
    console.error(`[dashboard] Could not load ${name}`);
    return null;
  }
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: privateHeaders });
  }
  if (!user.practiceId) {
    return NextResponse.json({ error: "No practice context" }, { status: 403, headers: privateHeaders });
  }

  const practiceId = user.practiceId;
  const now = new Date();
  const today = amsterdamToday(now);
  const search = req.nextUrl.searchParams;
  const [counts, actions, history] = await Promise.all([
    dashboardSection("counts", loadDashboardCounts(practiceId, now, today)),
    dashboardSection("actions", loadDashboardActions(practiceId, now, today.end, pageNumber(search.get("actions")))),
    dashboardSection("history", loadDashboardHistory(practiceId, now, pageNumber(search.get("history")))),
  ]);

  const data: DashboardData = { day: today.day, counts, actions, history };
  return NextResponse.json(data, { headers: privateHeaders });
}
