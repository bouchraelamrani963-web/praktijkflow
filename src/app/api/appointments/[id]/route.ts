import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { appointmentUpdateSchema } from "@/lib/validations/appointment";
import { calculateRiskForClient } from "@/lib/risk/calculate";
import { maybeCreateOpenSlot } from "@/lib/open-slots/service";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function authorize(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!user.practiceId) {
    return { error: NextResponse.json({ error: "No practice context" }, { status: 403 }) };
  }
  return { user };
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const { error, user } = await authorize(req);
  if (error) return error;

  const appt = await prisma.appointment.findFirst({
    where: { id, practiceId: user.practiceId! },
    include: {
      client: true,
      practitioner: { select: { id: true, firstName: true, lastName: true, email: true } },
      appointmentType: true,
    },
  });

  if (!appt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ appointment: appt });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const { error, user } = await authorize(req);
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = appointmentUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const existing = await prisma.appointment.findFirst({
    where: { id, practiceId: user.practiceId! },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Verify any changed references belong to the tenant
  if (data.clientId) {
    const client = await prisma.client.findFirst({
      where: { id: data.clientId, practiceId: user.practiceId! },
      select: { id: true },
    });
    if (!client) return NextResponse.json({ error: "Client not in practice" }, { status: 404 });
  }
  if (data.practitionerId) {
    const practitioner = await prisma.practiceMember.findFirst({
      where: { userId: data.practitionerId, practiceId: user.practiceId!, isActive: true },
    });
    if (!practitioner) return NextResponse.json({ error: "Practitioner not in practice" }, { status: 404 });
  }
  let typeDuration: number | null = null;
  let typePrice: number | null = null;
  if (data.appointmentTypeId) {
    const type = await prisma.appointmentType.findFirst({
      where: { id: data.appointmentTypeId, practiceId: user.practiceId! },
      select: { durationMinutes: true, price: true },
    });
    if (!type) return NextResponse.json({ error: "Appointment type not found" }, { status: 404 });
    typeDuration = type.durationMinutes;
    typePrice = type.price;
  }

  // Recompute times if startTime or duration changed
  const startTime = data.startTime ? new Date(data.startTime) : existing.startTime;
  let endTime = existing.endTime;
  if (data.endTime) {
    endTime = new Date(data.endTime);
  } else if (data.startTime || data.durationMinutes || data.appointmentTypeId) {
    const dur =
      data.durationMinutes ??
      typeDuration ??
      Math.round((existing.endTime.getTime() - existing.startTime.getTime()) / 60_000);
    endTime = new Date(startTime.getTime() + dur * 60_000);
  }

  const revenueEstimateCents =
    data.revenueEstimateCents ?? typePrice ?? existing.revenueEstimateCents;

  const clientId = data.clientId ?? existing.clientId;
  const statusForRisk = data.status ?? existing.status;
  const risk = await calculateRiskForClient(clientId, startTime, statusForRisk, id);

  const updated = await prisma.appointment.update({
    where: { id },
    data: {
      ...(data.clientId && { clientId: data.clientId }),
      ...(data.practitionerId && { practitionerId: data.practitionerId }),
      ...(data.appointmentTypeId !== undefined && { appointmentTypeId: data.appointmentTypeId }),
      ...(data.status && { status: data.status }),
      ...(data.notes !== undefined && { notes: data.notes }),
      startTime,
      endTime,
      revenueEstimateCents,
      riskScore: risk.riskScore,
      riskLevel: risk.riskLevel,
    },
  });

  // Auto-create open slot if status changed to CANCELLED
  if (data.status === "CANCELLED") {
    await maybeCreateOpenSlot(id);
  }

  return NextResponse.json({ appointment: updated, riskFactors: risk.factors });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const { error, user } = await authorize(req);
  if (error) return error;

  const existing = await prisma.appointment.findFirst({
    where: { id, practiceId: user.practiceId! },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.appointment.delete({ where: { id } });
  return NextResponse.json({ status: "ok" });
}
