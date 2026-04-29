import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma, safeQuery } from "@/lib/db";
import {
  appointmentCreateSchema,
  appointmentQuerySchema,
} from "@/lib/validations/appointment";
import { calculateRiskForClient } from "@/lib/risk/calculate";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.practiceId) return NextResponse.json({ error: "No practice context" }, { status: 403 });

  const parsed = appointmentQuerySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { dateFrom, dateTo, status, riskLevel, practitionerId, clientId, claimed, page, pageSize } =
    parsed.data;

  let where: Prisma.AppointmentWhereInput = {
    practiceId: user.practiceId,
    ...(status && { status }),
    ...(practitionerId && { practitionerId }),
    ...(clientId && { clientId }),
    ...(riskLevel && { riskLevel }),
    ...((dateFrom || dateTo) && {
      startTime: {
        ...(dateFrom && { gte: dateFrom }),
        ...(dateTo && { lte: dateTo }),
      },
    }),
  };

  if (claimed) {
    // Empty result is the only graceful fallback when DB is unreachable —
    // the caller (client-side filter UI) shows "no claimed appointments yet".
    const claimedSlots = await safeQuery(
      "api.appointments.claimedSlots",
      () =>
        prisma.openSlot.findMany({
          where: { practiceId: user.practiceId!, status: "CLAIMED" },
          select: { startTime: true, practitionerId: true, sourceAppointmentId: true },
        }),
      [] as Array<{
        startTime: Date;
        practitionerId: string;
        sourceAppointmentId: string | null;
      }>,
    );
    if (claimedSlots.length === 0) {
      return NextResponse.json({ items: [], total: 0, page, pageSize });
    }
    const excludeIds = claimedSlots
      .filter((s) => s.sourceAppointmentId)
      .map((s) => s.sourceAppointmentId!);
    const slotConditions = claimedSlots.map((s) => ({
      startTime: s.startTime,
      practitionerId: s.practitionerId,
    }));
    where = {
      ...where,
      ...(excludeIds.length > 0 && { id: { notIn: excludeIds } }),
      OR: slotConditions,
    };
  }

  // Wrap the (count, list) pair so a single DB failure returns an empty page
  // rather than a 500. The client UI handles total=0/items=[] as "no results".
  const result = await safeQuery(
    "api.appointments.list",
    async () => {
      const [total, items] = await Promise.all([
        prisma.appointment.count({ where }),
        prisma.appointment.findMany({
          where,
          orderBy: { startTime: "asc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: {
            client: {
              select: { id: true, firstName: true, lastName: true, riskLevel: true },
            },
            practitioner: { select: { id: true, firstName: true, lastName: true } },
            appointmentType: { select: { id: true, name: true, color: true } },
          },
        }),
      ]);
      return { total, items };
    },
    { total: 0, items: [] as Array<Prisma.AppointmentGetPayload<{
      include: {
        client:          { select: { id: true; firstName: true; lastName: true; riskLevel: true } };
        practitioner:    { select: { id: true; firstName: true; lastName: true } };
        appointmentType: { select: { id: true; name: true; color: true } };
      };
    }>> },
  );

  return NextResponse.json({
    items: result.items ?? [],
    total: result.total ?? 0,
    page,
    pageSize,
  });
}

export async function POST(req: NextRequest) {
  // Writes intentionally do NOT use safeQuery — we want a real error surface
  // when a create fails. Silent fallback on a write would leave the user
  // thinking the appointment was saved.
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.practiceId) return NextResponse.json({ error: "No practice context" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = appointmentCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  // Verify all referenced entities belong to the tenant
  const [client, practitioner, type] = await Promise.all([
    prisma.client.findFirst({
      where: { id: data.clientId, practiceId: user.practiceId },
      select: { id: true },
    }),
    prisma.practiceMember.findFirst({
      where: { userId: data.practitionerId, practiceId: user.practiceId, isActive: true },
      select: { userId: true },
    }),
    data.appointmentTypeId
      ? prisma.appointmentType.findFirst({
          where: { id: data.appointmentTypeId, practiceId: user.practiceId },
          select: { id: true, durationMinutes: true, price: true },
        })
      : Promise.resolve(null),
  ]);

  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
  if (!practitioner) return NextResponse.json({ error: "Practitioner not in practice" }, { status: 404 });
  if (data.appointmentTypeId && !type) {
    return NextResponse.json({ error: "Appointment type not found" }, { status: 404 });
  }

  const startTime = new Date(data.startTime);
  const durationMinutes = data.durationMinutes ?? type?.durationMinutes ?? 60;
  const endTime = data.endTime ? new Date(data.endTime) : new Date(startTime.getTime() + durationMinutes * 60_000);
  const revenueEstimateCents = data.revenueEstimateCents ?? type?.price ?? 0;

  const risk = await calculateRiskForClient(data.clientId, startTime, data.status);

  const appt = await prisma.appointment.create({
    data: {
      practiceId: user.practiceId,
      clientId: data.clientId,
      practitionerId: data.practitionerId,
      appointmentTypeId: data.appointmentTypeId ?? null,
      status: data.status,
      startTime,
      endTime,
      notes: data.notes,
      revenueEstimateCents,
      riskScore: risk.riskScore,
      riskLevel: risk.riskLevel,
    },
  });

  return NextResponse.json({ appointment: appt, riskFactors: risk.factors }, { status: 201 });
}
