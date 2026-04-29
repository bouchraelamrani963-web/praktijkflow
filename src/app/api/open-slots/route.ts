import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { openSlotCreateSchema, openSlotQuerySchema } from "@/lib/validations/open-slot";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.practiceId) return NextResponse.json({ error: "No practice context" }, { status: 403 });

  const parsed = openSlotQuerySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { status, practitionerId, dateFrom, dateTo, page, pageSize } = parsed.data;

  const where: Prisma.OpenSlotWhereInput = {
    practiceId: user.practiceId,
    ...(status && { status }),
    ...(practitionerId && { practitionerId }),
    ...((dateFrom || dateTo) && {
      startTime: {
        ...(dateFrom && { gte: dateFrom }),
        ...(dateTo && { lte: dateTo }),
      },
    }),
  };

  const [total, slots] = await Promise.all([
    prisma.openSlot.count({ where }),
    prisma.openSlot.findMany({
      where,
      orderBy: { startTime: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        practitioner: { select: { id: true, firstName: true, lastName: true } },
        appointmentType: { select: { id: true, name: true, color: true } },
      },
    }),
  ]);

  // ─── Cancellation audit (still derived from ActionLog + source appointment) ──
  // Cancellation is a property of the SOURCE appointment, not the slot itself,
  // so we still join through action_logs to find who cancelled and when. This
  // audit is read-only and the Appointment is the source of truth.
  const slotsWithSource = slots.filter((s) => s.sourceAppointmentId);
  const allSourceIds = slotsWithSource.map((s) => s.sourceAppointmentId!);

  type CancelInfo = {
    cancelledAt: string | null;
    cancelledBy: { id: string; firstName: string; lastName: string } | null;
    cancelledByLabel: string;
  };
  const cancelMap = new Map<string, CancelInfo>();

  if (allSourceIds.length > 0) {
    const [cancelLogs, sourceAppts] = await Promise.all([
      prisma.actionLog.findMany({
        where: {
          practiceId: user.practiceId,
          action: "cancel_appointment",
          outcome: "success",
          appointmentId: { in: allSourceIds },
        },
        select: { appointmentId: true, clientId: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.appointment.findMany({
        where: { practiceId: user.practiceId, id: { in: allSourceIds } },
        select: {
          id: true,
          updatedAt: true,
          client: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
    ]);

    const cancelLogByApptId = new Map<
      string,
      { clientId: string | null; createdAt: Date }
    >();
    for (const log of cancelLogs) {
      if (log.appointmentId && !cancelLogByApptId.has(log.appointmentId)) {
        cancelLogByApptId.set(log.appointmentId, {
          clientId: log.clientId,
          createdAt: log.createdAt,
        });
      }
    }

    const cancelClientIds = [
      ...new Set(
        Array.from(cancelLogByApptId.values())
          .map((l) => l.clientId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const cancelClients = cancelClientIds.length > 0
      ? await prisma.client.findMany({
          where: { id: { in: cancelClientIds }, practiceId: user.practiceId },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];
    const cancelClientById = new Map(cancelClients.map((c) => [c.id, c]));
    const apptById = new Map(sourceAppts.map((a) => [a.id, a]));

    for (const slot of slotsWithSource) {
      const srcId = slot.sourceAppointmentId!;
      const log = cancelLogByApptId.get(srcId);
      const appt = apptById.get(srcId);
      const fallbackClient = appt?.client ?? null;
      if (log) {
        const client = log.clientId ? cancelClientById.get(log.clientId) ?? null : null;
        cancelMap.set(slot.id, {
          cancelledAt: log.createdAt.toISOString(),
          cancelledBy: client ?? fallbackClient,
          cancelledByLabel: client
            ? `${client.firstName} ${client.lastName}`
            : fallbackClient
              ? `${fallbackClient.firstName} ${fallbackClient.lastName} (via patiënt)`
              : "Patiënt",
        });
      } else if (appt) {
        cancelMap.set(slot.id, {
          cancelledAt: appt.updatedAt.toISOString(),
          cancelledBy: fallbackClient,
          cancelledByLabel: "Praktijk",
        });
      }
    }
  }

  // ─── Orphan detection ──────────────────────────────────────────────────────
  // A CLAIMED slot without claimedAppointmentId is a data-integrity violation
  // (see Task 1). New claims cannot produce this — it's legacy data only.
  // Log a warning so operators can reconcile. The UI already degrades gracefully.
  const orphans = slots.filter(
    (s) => s.status === "CLAIMED" && !s.claimedAppointmentId,
  );
  if (orphans.length > 0) {
    console.warn(
      `[OPEN-SLOTS] ORPHAN CLAIMED slot(s) detected in practice ${user.practiceId}:`,
      orphans.map((s) => ({ id: s.id, sourceAppointmentId: s.sourceAppointmentId })),
    );
  }

  // ─── Shape response ────────────────────────────────────────────────────────
  // Claim audit fields come DIRECTLY from the slot record (the immutable
  // snapshot written at claim time). No ActionLog join for claim data.
  const items = slots.map((s) => {
    const fillMinutes =
      s.claimedAt != null
        ? Math.max(0, Math.round((s.claimedAt.getTime() - s.createdAt.getTime()) / 60_000))
        : null;

    // Split "Firstname Lastname" snapshot back into a {firstName, lastName}
    // pair for UI compatibility. We only have the name as a single string in
    // the snapshot (the Client could be deleted later — the snapshot is the
    // source of truth). `id` is intentionally omitted since this is a name
    // capture, not a live-linked identity.
    let claimedBy:
      | { id: null; firstName: string; lastName: string }
      | null = null;
    if (s.claimedClientName) {
      const parts = s.claimedClientName.split(" ");
      claimedBy = {
        id: null,
        firstName: parts[0] ?? s.claimedClientName,
        lastName: parts.slice(1).join(" "),
      };
    }

    return {
      ...s,
      ...(cancelMap.get(s.id) ?? {
        cancelledAt: null,
        cancelledBy: null,
        cancelledByLabel: null,
      }),
      // Normalized claim-audit shape, powered entirely by the snapshot:
      claimedBy,
      fillMinutes,
      // Pass through the stored snapshot values explicitly (already spread via
      // `...s`, but naming them here makes the contract explicit for callers).
      claimedAppointmentId: s.claimedAppointmentId,
      claimedAt: s.claimedAt?.toISOString() ?? null,
      claimedAppointmentType: s.claimedAppointmentType,
      recoveredRevenueCents: s.recoveredRevenueCents,
    };
  });

  return NextResponse.json({ items, total, page, pageSize });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.practiceId) return NextResponse.json({ error: "No practice context" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = openSlotCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  // Verify practitioner belongs to practice
  const practitioner = await prisma.practiceMember.findFirst({
    where: { userId: data.practitionerId, practiceId: user.practiceId, isActive: true },
    select: { userId: true },
  });
  if (!practitioner) {
    return NextResponse.json({ error: "Practitioner not in practice" }, { status: 404 });
  }

  // Verify type belongs to practice (if provided)
  let typeDuration: number | null = null;
  if (data.appointmentTypeId) {
    const type = await prisma.appointmentType.findFirst({
      where: { id: data.appointmentTypeId, practiceId: user.practiceId },
      select: { durationMinutes: true },
    });
    if (!type) return NextResponse.json({ error: "Appointment type not found" }, { status: 404 });
    typeDuration = type.durationMinutes;
  }

  const startTime = new Date(data.startTime);
  const durationMinutes = data.durationMinutes ?? typeDuration ?? 60;
  const endTime = data.endTime
    ? new Date(data.endTime)
    : new Date(startTime.getTime() + durationMinutes * 60_000);

  const slot = await prisma.openSlot.create({
    data: {
      practiceId: user.practiceId,
      practitionerId: data.practitionerId,
      appointmentTypeId: data.appointmentTypeId ?? null,
      startTime,
      endTime,
      durationMinutes,
      notes: data.notes ?? null,
    },
  });

  return NextResponse.json({ openSlot: slot }, { status: 201 });
}
