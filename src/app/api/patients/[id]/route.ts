import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { patientUpdateSchema } from "@/lib/validations/patient";

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

  const patient = await prisma.client.findFirst({
    where: { id, practiceId: user.practiceId! },
    include: {
      appointments: {
        orderBy: { startTime: "desc" },
        take: 10,
        include: { appointmentType: { select: { name: true, color: true } } },
      },
      waitlistEntries: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  if (!patient) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ patient });
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

  const parsed = patientUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.client.findFirst({
    where: { id, practiceId: user.practiceId! },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const patient = await prisma.client.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ patient });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const { error, user } = await authorize(req);
  if (error) return error;

  const existing = await prisma.client.findFirst({
    where: { id, practiceId: user.practiceId! },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Soft-delete: deactivate instead of cascading
  await prisma.client.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ status: "ok" });
}
