import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { appointmentStatusSchema } from "@/lib/validations/appointment";
import { calculateRiskForClient } from "@/lib/risk/calculate";
import { maybeCreateOpenSlot } from "@/lib/open-slots/service";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.practiceId) return NextResponse.json({ error: "No practice context" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = appointmentStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.appointment.findFirst({
    where: { id, practiceId: user.practiceId },
    select: { id: true, clientId: true, startTime: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const risk = await calculateRiskForClient(
    existing.clientId,
    existing.startTime,
    parsed.data.status,
    id,
  );

  const updated = await prisma.appointment.update({
    where: { id },
    data: {
      status: parsed.data.status,
      riskScore: risk.riskScore,
      riskLevel: risk.riskLevel,
    },
    select: { id: true, status: true, riskScore: true, riskLevel: true },
  });

  // Auto-create open slot if cancelled
  if (parsed.data.status === "CANCELLED") {
    await maybeCreateOpenSlot(id);
  }

  return NextResponse.json({ appointment: updated, riskFactors: risk.factors });
}
