import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { appointmentUpdateSchema } from "@/lib/validations/appointment";
import { calculateRiskForClient } from "@/lib/risk/calculate";
import {
  maybeCreateOpenSlot,
  shouldCreateOpenSlotForAppointmentStatus,
} from "@/lib/open-slots/service";
import { isUuid } from "@/lib/validations/uuid";

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
  if (!isUuid(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const { error, user } = await authorize(req);
  if (error) return error;

  const appt = await prisma.appointment.findFirst({
    where: { id, practiceId: user.practiceId! },
    include: {
      client: true,
      practitioner: { select: { id: true, firstName: true, lastName: true, email: true } },
      appointmentType: true,
      // Multi-code support — return the joined snapshot rows ordered by
      // the dentist's chosen sequence so the UI doesn't have to re-sort.
      treatments: { orderBy: { sortOrder: "asc" } },
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
  if (!isUuid(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

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
  // ─── Resolve treatments (if the request explicitly sends them) ─────────
  // `treatments: undefined` (key absent) leaves the existing set untouched.
  // `treatments: []` REPLACES with an empty set — caller intends to clear.
  let resolvedTreatments: {
    appointmentTypeId: string;
    quantity: number;
    sortOrder: number;
    code: string;
    name: string;
    tariffCents: number;
    durationMinutes: number;
  }[] | null = null;

  if (data.treatments !== undefined) {
    if (data.treatments.length === 0) {
      resolvedTreatments = [];
    } else {
      const ids = Array.from(new Set(data.treatments.map((t) => t.appointmentTypeId)));
      const typeRows = await prisma.appointmentType.findMany({
        where: { id: { in: ids }, practiceId: user.practiceId! },
        select: { id: true, name: true, price: true, durationMinutes: true },
      });
      if (typeRows.length !== ids.length) {
        return NextResponse.json(
          { error: "One or more appointment types not found in this practice" },
          { status: 404 },
        );
      }
      const typeById = new Map(typeRows.map((t) => [t.id, t]));
      resolvedTreatments = data.treatments.map((t, idx) => {
        const row = typeById.get(t.appointmentTypeId)!;
        return {
          appointmentTypeId: t.appointmentTypeId,
          quantity: t.quantity,
          sortOrder: t.sortOrder ?? idx,
          code: extractCode(row.name),
          name: row.name,
          tariffCents: row.price,
          durationMinutes: row.durationMinutes,
        };
      });
    }
  }

  // Resolve legacy single-type fallback (only when `treatments` was not sent).
  let typeDuration: number | null = null;
  let typePrice: number | null = null;
  if (resolvedTreatments === null && data.appointmentTypeId) {
    const type = await prisma.appointmentType.findFirst({
      where: { id: data.appointmentTypeId, practiceId: user.practiceId! },
      select: { durationMinutes: true, price: true },
    });
    if (!type) return NextResponse.json({ error: "Appointment type not found" }, { status: 404 });
    typeDuration = type.durationMinutes;
    typePrice = type.price;
  }

  // Recompute times if startTime, duration, type or treatments changed.
  const startTime = data.startTime ? new Date(data.startTime) : existing.startTime;
  let endTime = existing.endTime;
  const treatmentsChanged = resolvedTreatments !== null;
  const treatmentDurationSum =
    resolvedTreatments && resolvedTreatments.length > 0
      ? resolvedTreatments.reduce((s, t) => s + t.durationMinutes * t.quantity, 0)
      : null;

  if (data.endTime) {
    endTime = new Date(data.endTime);
  } else if (data.startTime || data.durationMinutes || data.appointmentTypeId || treatmentsChanged) {
    const dur =
      data.durationMinutes ??
      treatmentDurationSum ??
      typeDuration ??
      Math.round((existing.endTime.getTime() - existing.startTime.getTime()) / 60_000);
    endTime = new Date(startTime.getTime() + Math.min(480, Math.max(5, dur)) * 60_000);
  }

  // Server-authoritative revenue when treatments changed; else fall through
  // to the legacy resolution path.
  const revenueFromTreatments =
    resolvedTreatments && resolvedTreatments.length > 0
      ? resolvedTreatments.reduce((s, t) => s + t.tariffCents * t.quantity, 0)
      : null;

  const revenueEstimateCents =
    revenueFromTreatments ??
    data.revenueEstimateCents ??
    typePrice ??
    existing.revenueEstimateCents;

  const clientId = data.clientId ?? existing.clientId;
  const statusForRisk = data.status ?? existing.status;
  const risk = await calculateRiskForClient(clientId, startTime, statusForRisk, id);

  // Legacy single-id field kept in sync with first treatment (when present).
  const legacyTypeIdUpdate =
    resolvedTreatments !== null
      ? { appointmentTypeId: resolvedTreatments[0]?.appointmentTypeId ?? null }
      : data.appointmentTypeId !== undefined
        ? { appointmentTypeId: data.appointmentTypeId }
        : {};

  // ─── Update appointment + replace treatments atomically ────────────────
  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.appointment.update({
      where: { id },
      data: {
        ...(data.clientId && { clientId: data.clientId }),
        ...(data.practitionerId && { practitionerId: data.practitionerId }),
        ...legacyTypeIdUpdate,
        ...(data.status && { status: data.status }),
        ...(data.notes !== undefined && { notes: data.notes }),
        startTime,
        endTime,
        revenueEstimateCents,
        riskScore: risk.riskScore,
        riskLevel: risk.riskLevel,
      },
    });

    // Replace-set semantics: only when caller sent a treatments key.
    if (resolvedTreatments !== null) {
      await tx.appointmentTreatment.deleteMany({ where: { appointmentId: id } });
      if (resolvedTreatments.length > 0) {
        await tx.appointmentTreatment.createMany({
          data: resolvedTreatments.map((t) => ({
            appointmentId: id,
            appointmentTypeId: t.appointmentTypeId,
            code: t.code,
            name: t.name,
            tariffCents: t.tariffCents,
            durationMinutes: t.durationMinutes,
            quantity: t.quantity,
            sortOrder: t.sortOrder,
          })),
        });
      }
    }

    return u;
  });

  // Auto-create open slot if the appointment frees usable chair time.
  if (data.status && shouldCreateOpenSlotForAppointmentStatus(data.status)) {
    await maybeCreateOpenSlot(id);
  }

  return NextResponse.json({ appointment: updated, riskFactors: risk.factors });
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

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

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
