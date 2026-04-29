import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { waitlistCreateSchema, waitlistQuerySchema } from "@/lib/validations/waitlist";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.practiceId) return NextResponse.json({ error: "No practice context" }, { status: 403 });

  const parsed = waitlistQuerySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { status, clientId, appointmentTypeId, page, pageSize } = parsed.data;

  const where: Prisma.WaitlistEntryWhereInput = {
    practiceId: user.practiceId,
    ...(status && { status }),
    ...(clientId && { clientId }),
    ...(appointmentTypeId && { appointmentTypeId }),
  };

  const [total, items] = await Promise.all([
    prisma.waitlistEntry.count({ where }),
    prisma.waitlistEntry.findMany({
      where,
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        client: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
        appointmentType: { select: { id: true, name: true } },
      },
    }),
  ]);

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

  const parsed = waitlistCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  // Verify client belongs to practice
  const client = await prisma.client.findFirst({
    where: { id: data.clientId, practiceId: user.practiceId },
    select: { id: true },
  });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  // Verify type belongs to practice (if provided)
  if (data.appointmentTypeId) {
    const type = await prisma.appointmentType.findFirst({
      where: { id: data.appointmentTypeId, practiceId: user.practiceId },
      select: { id: true },
    });
    if (!type) return NextResponse.json({ error: "Appointment type not found" }, { status: 404 });
  }

  // Status is ALWAYS set explicitly to WAITING on creation. Even though the
  // Prisma schema has `@default(WAITING)`, writing it here means the contract
  // is documented at the API layer and survives any future schema-default
  // change or direct driver write.
  const entry = await prisma.waitlistEntry.create({
    data: {
      practiceId: user.practiceId,
      clientId: data.clientId,
      appointmentTypeId: data.appointmentTypeId ?? null,
      status: "WAITING",
      preferredDay: data.preferredDay ?? null,
      preferredTime: data.preferredTime ?? null,
      isFlexible: data.isFlexible ?? false,
      notes: data.notes ?? null,
    },
  });

  return NextResponse.json({ waitlistEntry: entry }, { status: 201 });
}
