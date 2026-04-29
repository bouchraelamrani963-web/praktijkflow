import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { parseCsv } from "@/lib/csv";
import {
  appointmentCsvRowSchema,
  appointmentImportSchema,
} from "@/lib/validations/appointment";
import { calculateRisk } from "@/lib/risk/engine";

interface RowError {
  row: number;
  message: string;
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

  const parsedBody = appointmentImportSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsedBody.error.flatten() },
      { status: 400 },
    );
  }

  const rawRows = parseCsv(parsedBody.data.csv);
  if (rawRows.length === 0) {
    return NextResponse.json({ error: "No data rows found" }, { status: 400 });
  }

  // Pre-load practice-scoped lookup tables
  const [clients, practitioners, types] = await Promise.all([
    prisma.client.findMany({
      where: { practiceId: user.practiceId },
      select: { id: true, email: true },
    }),
    prisma.user.findMany({
      where: {
        memberships: { some: { practiceId: user.practiceId, isActive: true } },
      },
      select: { id: true, email: true },
    }),
    prisma.appointmentType.findMany({
      where: { practiceId: user.practiceId },
      select: { id: true, name: true, durationMinutes: true, price: true },
    }),
  ]);

  const clientByEmail = new Map(
    clients.filter((c) => c.email).map((c) => [c.email!.toLowerCase(), c.id]),
  );
  const practitionerByEmail = new Map(
    practitioners.map((p) => [p.email.toLowerCase(), p.id]),
  );
  const typeByName = new Map(types.map((t) => [t.name.toLowerCase(), t]));

  // Pre-load prior appointment counts per client for risk calculation
  const allClientIds = [...new Set([...clientByEmail.values()])];
  const priorAppointments = await prisma.appointment.findMany({
    where: { clientId: { in: allClientIds } },
    select: { clientId: true, status: true },
  });
  const clientStats = new Map<string, { noShows: number; cancellations: number; completed: number; total: number }>();
  for (const a of priorAppointments) {
    const s = clientStats.get(a.clientId) ?? { noShows: 0, cancellations: 0, completed: 0, total: 0 };
    s.total++;
    if (a.status === "NO_SHOW") s.noShows++;
    else if (a.status === "CANCELLED") s.cancellations++;
    else if (a.status === "COMPLETED") s.completed++;
    clientStats.set(a.clientId, s);
  }

  const errors: RowError[] = [];
  const toCreate: Prisma.AppointmentCreateManyInput[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const rowNum = i + 2; // +1 for header, +1 for 1-based
    const parsed = appointmentCsvRowSchema.safeParse(rawRows[i]);
    if (!parsed.success) {
      errors.push({
        row: rowNum,
        message: parsed.error.issues.map((iss) => `${iss.path.join(".")}: ${iss.message}`).join("; "),
      });
      continue;
    }
    const row = parsed.data;

    const clientId = clientByEmail.get(row.client_email.toLowerCase());
    if (!clientId) {
      errors.push({ row: rowNum, message: `Client not found: ${row.client_email}` });
      continue;
    }
    const practitionerId = practitionerByEmail.get(row.practitioner_email.toLowerCase());
    if (!practitionerId) {
      errors.push({ row: rowNum, message: `Practitioner not found: ${row.practitioner_email}` });
      continue;
    }
    const type = row.type_name ? typeByName.get(row.type_name.toLowerCase()) : undefined;
    if (row.type_name && !type) {
      errors.push({ row: rowNum, message: `Appointment type not found: ${row.type_name}` });
      continue;
    }

    const startTime = new Date(row.start_iso);
    const duration = row.duration_minutes ?? type?.durationMinutes ?? 60;
    const endTime = new Date(startTime.getTime() + duration * 60_000);
    const revenueEstimateCents = row.revenue_cents ?? type?.price ?? 0;

    const stats = clientStats.get(clientId) ?? { noShows: 0, cancellations: 0, completed: 0, total: 0 };
    const risk = calculateRisk({
      priorNoShows: stats.noShows,
      priorCancellations: stats.cancellations,
      priorCompletedVisits: stats.completed,
      isNewClient: stats.total === 0,
      startTime,
      status: row.status ?? "SCHEDULED",
    });

    toCreate.push({
      practiceId: user.practiceId,
      clientId,
      practitionerId,
      appointmentTypeId: type?.id ?? null,
      startTime,
      endTime,
      status: row.status ?? "SCHEDULED",
      notes: row.notes || null,
      revenueEstimateCents,
      riskScore: risk.riskScore,
      riskLevel: risk.riskLevel,
    });
  }

  let created = 0;
  if (toCreate.length > 0) {
    const result = await prisma.appointment.createMany({ data: toCreate });
    created = result.count;
  }

  return NextResponse.json({
    created,
    skipped: errors.length,
    total: rawRows.length,
    errors,
  });
}
