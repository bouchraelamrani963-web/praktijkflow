import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { waitlistUpdateSchema } from "@/lib/validations/waitlist";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.practiceId) return NextResponse.json({ error: "No practice context" }, { status: 403 });

  const entry = await prisma.waitlistEntry.findFirst({
    where: { id, practiceId: user.practiceId },
    include: {
      client: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
      appointmentType: { select: { id: true, name: true } },
    },
  });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ waitlistEntry: entry });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
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

  const parsed = waitlistUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.waitlistEntry.findFirst({
    where: { id, practiceId: user.practiceId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data = parsed.data;
  const updated = await prisma.waitlistEntry.update({
    where: { id },
    data: {
      ...(data.status && { status: data.status }),
      ...(data.appointmentTypeId !== undefined && { appointmentTypeId: data.appointmentTypeId }),
      ...(data.preferredDay !== undefined && { preferredDay: data.preferredDay }),
      ...(data.preferredTime !== undefined && { preferredTime: data.preferredTime }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  });

  return NextResponse.json({ waitlistEntry: updated });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.practiceId) return NextResponse.json({ error: "No practice context" }, { status: 403 });

  const existing = await prisma.waitlistEntry.findFirst({
    where: { id, practiceId: user.practiceId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.waitlistEntry.delete({ where: { id } });
  return NextResponse.json({ status: "ok" });
}
