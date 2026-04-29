import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { createActionToken } from "@/lib/tokens/service";
import { sendSms } from "@/lib/twilio";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const offerSchema = z.object({
  waitlistEntryId: z.string().uuid(),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: slotId } = await ctx.params;
  if (!UUID_RE.test(slotId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.practiceId) return NextResponse.json({ error: "No practice context" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = offerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Verify slot is AVAILABLE and belongs to practice
  const slot = await prisma.openSlot.findFirst({
    where: { id: slotId, practiceId: user.practiceId, status: "AVAILABLE" },
    include: {
      practitioner: { select: { firstName: true, lastName: true } },
      practice: { select: { name: true } },
    },
  });
  if (!slot) {
    return NextResponse.json({ error: "Open slot not available" }, { status: 404 });
  }

  if (!slot.sourceAppointmentId) {
    return NextResponse.json(
      { error: "Manual slots cannot be offered via claim token — book the appointment directly" },
      { status: 422 },
    );
  }

  // Verify waitlist entry is WAITING and belongs to practice
  const entry = await prisma.waitlistEntry.findFirst({
    where: { id: parsed.data.waitlistEntryId, practiceId: user.practiceId, status: "WAITING" },
    include: {
      client: { select: { id: true, firstName: true, lastName: true, phone: true } },
    },
  });
  if (!entry) {
    return NextResponse.json({ error: "Waitlist entry not found or not waiting" }, { status: 404 });
  }

  // Create a claim token tied to the slot's source appointment (for claim_open_slot action)
  // If the slot has no sourceAppointmentId, we still create the token with the slot info
  const token = await createActionToken({
    practiceId: user.practiceId,
    appointmentId: slot.sourceAppointmentId ?? undefined,
    clientId: entry.client.id,
    action: "claim_open_slot",
    expiresInHours: 2,
  });

  // Mark waitlist entry as OFFERED
  await prisma.waitlistEntry.update({
    where: { id: entry.id },
    data: { status: "OFFERED" },
  });

  // Try to send SMS if client has a phone number
  const actionUrl = `/action/${token.rawToken}`;
  let smsStatus = "no_phone";

  if (entry.client.phone) {
    const fmt = slot.startTime.toLocaleString("nl-NL", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });

    const smsBody =
      `Beste ${entry.client.firstName}, er is een plek vrijgekomen bij ${slot.practice.name} ` +
      `op ${fmt}. Claim uw afspraak via: ${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}${actionUrl}`;

    const result = await sendSms(entry.client.phone, smsBody);
    smsStatus = result.mock ? "mock" : result.success ? "sent" : "failed";

    // Log the message
    await prisma.messageLog.create({
      data: {
        practiceId: user.practiceId,
        appointmentId: slot.sourceAppointmentId,
        clientId: entry.client.id,
        channel: "sms",
        to: entry.client.phone,
        body: smsBody,
        status: smsStatus,
        errorMessage: result.error ?? null,
        externalSid: result.sid ?? null,
      },
    });
  }

  return NextResponse.json({
    offered: true,
    waitlistEntryId: entry.id,
    clientName: `${entry.client.firstName} ${entry.client.lastName}`,
    actionUrl,
    smsStatus,
    tokenId: token.tokenId,
  });
}
