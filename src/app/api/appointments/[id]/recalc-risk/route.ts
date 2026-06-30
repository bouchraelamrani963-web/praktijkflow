import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { recalcAndSave } from "@/lib/risk/calculate";
import { isUuid } from "@/lib/validations/uuid";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.practiceId) return NextResponse.json({ error: "No practice context" }, { status: 403 });

  const existing = await prisma.appointment.findFirst({
    where: { id, practiceId: user.practiceId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = await recalcAndSave(id);

  return NextResponse.json({
    appointment: { id, riskScore: result.riskScore, riskLevel: result.riskLevel },
    riskFactors: result.factors,
  });
}
