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
            // Count-only — list rows just need to render '+N more codes'
            // when an appointment carries multiple treatments; the actual
            // rows are loaded on the detail page.
            _count: { select: { treatments: true } },
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
        _count:          { select: { treatments: true } };
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

  // Verify the patient + practitioner belong to the tenant.
  const [client, practitioner] = await Promise.all([
    prisma.client.findFirst({
      where: { id: data.clientId, practiceId: user.practiceId },
      select: { id: true },
    }),
    prisma.practiceMember.findFirst({
      where: { userId: data.practitionerId, practiceId: user.practiceId, isActive: true },
      select: { userId: true },
    }),
  ]);

  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
  if (!practitioner) return NextResponse.json({ error: "Practitioner not in practice" }, { status: 404 });

  // ─── Resolve treatments + legacy single appointmentType ────────────────
  // Three input shapes are supported (preference order):
  //   A. New caller supplies `treatments[]` — server snapshots each row,
  //      computes revenue+duration as the sum, ignores legacy fields.
  //   B. Legacy caller supplies just `appointmentTypeId` — wrap as a
  //      single-row treatments array so the join table stays consistent.
  //   C. Caller supplies neither — bare appointment with manual revenue.
  const treatmentSpec = data.treatments && data.treatments.length > 0
    ? data.treatments
    : (data.appointmentTypeId
      ? [{ appointmentTypeId: data.appointmentTypeId, quantity: 1, sortOrder: 0 }]
      : []);

  // Resolve every referenced AppointmentType in one query — reject the
  // whole request on tenant-mismatch (partial saves of treatments are unsafe).
  let typeRows: { id: string; name: string; price: number; durationMinutes: number }[] = [];
  if (treatmentSpec.length > 0) {
    const ids = Array.from(new Set(treatmentSpec.map((t) => t.appointmentTypeId)));
    typeRows = await prisma.appointmentType.findMany({
      where: { id: { in: ids }, practiceId: user.practiceId },
      select: { id: true, name: true, price: true, durationMinutes: true },
    });
    if (typeRows.length !== ids.length) {
      return NextResponse.json(
        { error: "One or more appointment types not found in this practice" },
        { status: 404 },
      );
    }
  }
  const typeById = new Map(typeRows.map((t) => [t.id, t]));

  // Server-authoritative revenue: when treatments are present, recompute
  // from the catalog snapshot — never trust client. Fall back to client-
  // supplied value (or 0) only when no treatments were attached.
  const revenueEstimateCents = treatmentSpec.length > 0
    ? treatmentSpec.reduce((sum, t) => {
        const row = typeById.get(t.appointmentTypeId)!;
        return sum + row.price * t.quantity;
      }, 0)
    : (data.revenueEstimateCents ?? 0);

  const startTime = new Date(data.startTime);
  let durationMinutes = data.durationMinutes;
  if (durationMinutes === undefined && treatmentSpec.length > 0) {
    const sum = treatmentSpec.reduce((acc, t) => {
      const row = typeById.get(t.appointmentTypeId)!;
      return acc + row.durationMinutes * t.quantity;
    }, 0);
    durationMinutes = Math.min(480, Math.max(5, sum || 60));
  }
  durationMinutes = durationMinutes ?? 60;
  const endTime = data.endTime
    ? new Date(data.endTime)
    : new Date(startTime.getTime() + durationMinutes * 60_000);

  const risk = await calculateRiskForClient(data.clientId, startTime, data.status);

  // Legacy single-id field — first treatment for backward-compat with
  // readers (lists, calendar colour helpers, older webhooks) that still
  // read appointmentTypeId directly. Null when no treatments at all.
  const legacyTypeId = treatmentSpec[0]?.appointmentTypeId ?? null;

  // ─── Atomic create: appointment + treatment rows ────────────────────────
  const appt = await prisma.$transaction(async (tx) => {
    const created = await tx.appointment.create({
      data: {
        practiceId: user.practiceId!,
        clientId: data.clientId,
        practitionerId: data.practitionerId,
        appointmentTypeId: legacyTypeId,
        status: data.status,
        startTime,
        endTime,
        notes: data.notes,
        revenueEstimateCents,
        riskScore: risk.riskScore,
        riskLevel: risk.riskLevel,
      },
    });

    if (treatmentSpec.length > 0) {
      await tx.appointmentTreatment.createMany({
        data: treatmentSpec.map((t, idx) => {
          const row = typeById.get(t.appointmentTypeId)!;
          return {
            appointmentId: created.id,
            appointmentTypeId: t.appointmentTypeId,
            // SNAPSHOT — preserves history if the catalog row is later
            // renamed/repriced. Code is parsed from the leading "<CODE> — …"
            // segment of the catalog name; falls back to truncated name.
            code: extractCode(row.name),
            name: row.name,
            tariffCents: row.price,
            durationMinutes: row.durationMinutes,
            quantity: t.quantity,
            sortOrder: t.sortOrder ?? idx,
          };
        }),
      });
    }

    return created;
  });

  return NextResponse.json({ appointment: appt, riskFactors: risk.factors }, { status: 201 });
}

/**
 * Extract the leading code from a catalog name like "C001 — Consult ten
 * behoeve". Falls back to the first 16 chars when no en-dash is present
 * (covers legacy demo names like "Intake").
 */
function extractCode(name: string): string {
  const m = name.match(/^([A-Z]\d{2,4}[A-Z]?)\s*[—–-]/);
  return m ? m[1] : name.slice(0, 16);
}
