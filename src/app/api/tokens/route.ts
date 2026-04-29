import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { createTokenSchema } from "@/lib/validations/token";
import { createActionToken } from "@/lib/tokens/service";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.practiceId) {
    return NextResponse.json({ error: "No practice context" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createTokenSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { clientId, appointmentId, action, expiresInHours } = parsed.data;

  // Verify client belongs to practice
  const client = await prisma.client.findFirst({
    where: { id: clientId, practiceId: user.practiceId },
    select: { id: true },
  });
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // Verify appointment belongs to practice (if provided)
  if (appointmentId) {
    const appt = await prisma.appointment.findFirst({
      where: { id: appointmentId, practiceId: user.practiceId },
      select: { id: true },
    });
    if (!appt) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }
  }

  const result = await createActionToken({
    practiceId: user.practiceId,
    appointmentId,
    clientId,
    action,
    expiresInHours,
  });

  return NextResponse.json(
    {
      tokenId: result.tokenId,
      rawToken: result.rawToken,
      actionUrl: `/action/${result.rawToken}`,
    },
    { status: 201 },
  );
}
