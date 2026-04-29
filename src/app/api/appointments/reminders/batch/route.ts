import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { reminderBatchSchema } from "@/lib/validations/reminder";
import { sendBatchReminders } from "@/lib/reminders/service";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.practiceId) {
    return NextResponse.json({ error: "No practice context" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = reminderBatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const result = await sendBatchReminders(user.practiceId, parsed.data.type);

  return NextResponse.json({
    type: parsed.data.type,
    sent: result.sent,
    skipped: result.skipped,
    failed: result.failed,
    results: result.results,
  });
}
