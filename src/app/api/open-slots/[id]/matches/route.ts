import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { findMatchesForSlot } from "@/lib/waitlist/matching";
import { isUuid } from "@/lib/validations/uuid";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.practiceId) return NextResponse.json({ error: "No practice context" }, { status: 403 });

  const matches = await findMatchesForSlot(id, user.practiceId);

  return NextResponse.json({ slotId: id, matches, total: matches.length });
}
