import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { maybeCreateOpenSlot } from "@/lib/open-slots/service";

/**
 * Demo scenario endpoint.
 *
 * Creates:
 *  - 3 demo waitlist patients (Demo Patient 1/2/3)
 *  - 1 demo "victim" patient whose appointment will be cancelled
 *  - 1 appointment 2 days from now
 *  - 3 waitlist entries (2 flexible, 1 with specific day preference)
 *  - Cancels the appointment → triggers open slot creation + auto-offer
 *
 * Returns the generated IDs, slot info, and step-by-step status.
 *
 * Admin only (OWNER / ADMIN).
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.practiceId) return NextResponse.json({ error: "No practice context" }, { status: 403 });
  if (!hasRole(user, ["OWNER", "ADMIN"])) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const practiceId = user.practiceId;

  // Pick a practitioner: current user if practitioner, otherwise first active one
  const practitioner = await prisma.user.findFirst({
    where: {
      memberships: { some: { practiceId, isActive: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  if (!practitioner) {
    return NextResponse.json(
      { error: "Geen behandelaar gevonden in deze praktijk" },
      { status: 422 },
    );
  }

  // Pick (or create) a demo appointment type
  let apptType = await prisma.appointmentType.findFirst({
    where: { practiceId, isActive: true },
    orderBy: { createdAt: "asc" },
  });

  if (!apptType) {
    apptType = await prisma.appointmentType.create({
      data: {
        practiceId,
        name: "Demo Consult",
        durationMinutes: 30,
        color: "#3B82F6",
        price: 7500,
      },
    });
  }

  const now = new Date();
  const demoTag = `demo-${now.getTime().toString(36)}`;

  // Step 1: create 3 demo waitlist patients + 1 victim
  const [victim, w1, w2, w3] = await Promise.all([
    prisma.client.create({
      data: {
        practiceId,
        firstName: "Demo Victim",
        lastName: demoTag,
        email: `victim-${demoTag}@example.invalid`,
        phone: "+31600000001",
        notes: `Demo scenario patient — slot source. Tag: ${demoTag}`,
      },
    }),
    prisma.client.create({
      data: {
        practiceId,
        firstName: "Demo Patiënt 1",
        lastName: demoTag,
        email: `demo1-${demoTag}@example.invalid`,
        phone: "+31600000002",
        notes: `Demo scenario — flexibel. Tag: ${demoTag}`,
      },
    }),
    prisma.client.create({
      data: {
        practiceId,
        firstName: "Demo Patiënt 2",
        lastName: demoTag,
        email: `demo2-${demoTag}@example.invalid`,
        phone: "+31600000003",
        notes: `Demo scenario — voorkeur ochtend. Tag: ${demoTag}`,
      },
    }),
    prisma.client.create({
      data: {
        practiceId,
        firstName: "Demo Patiënt 3",
        lastName: demoTag,
        email: `demo3-${demoTag}@example.invalid`,
        phone: "+31600000004",
        notes: `Demo scenario — flexibel. Tag: ${demoTag}`,
      },
    }),
  ]);

  // Step 2: create appointment 2 days from now at 10:00 local
  const start = new Date(now);
  start.setDate(start.getDate() + 2);
  start.setHours(10, 0, 0, 0);
  const end = new Date(start.getTime() + apptType.durationMinutes * 60 * 1000);

  const appointment = await prisma.appointment.create({
    data: {
      practiceId,
      clientId: victim.id,
      practitionerId: practitioner.id,
      appointmentTypeId: apptType.id,
      startTime: start,
      endTime: end,
      status: "SCHEDULED",
      revenueEstimateCents: apptType.price,
      notes: `Demo scenario appointment. Tag: ${demoTag}`,
    },
  });

  // Step 3: add 3 waitlist entries (2 flexible, 1 with morning preference)
  const [wl1, wl2, wl3] = await Promise.all([
    prisma.waitlistEntry.create({
      data: {
        practiceId,
        clientId: w1.id,
        isFlexible: true,
        notes: `Demo ${demoTag}`,
      },
    }),
    prisma.waitlistEntry.create({
      data: {
        practiceId,
        clientId: w2.id,
        preferredTime: "morning",
        isFlexible: false,
        notes: `Demo ${demoTag}`,
      },
    }),
    prisma.waitlistEntry.create({
      data: {
        practiceId,
        clientId: w3.id,
        isFlexible: true,
        notes: `Demo ${demoTag}`,
      },
    }),
  ]);

  // Step 4: cancel the appointment → this triggers maybeCreateOpenSlot + autoOfferSlot
  await prisma.appointment.update({
    where: { id: appointment.id },
    data: { status: "CANCELLED" },
  });

  const slotId = await maybeCreateOpenSlot(appointment.id);

  // Wait briefly so the fire-and-forget autoOfferSlot has a chance to complete
  // (it awaits DB work internally, just not awaited by maybeCreateOpenSlot)
  await new Promise((r) => setTimeout(r, 800));

  // Fetch the resulting state for the response
  const [slot, offeredTokens] = await Promise.all([
    slotId
      ? prisma.openSlot.findUnique({
          where: { id: slotId },
          select: { id: true, status: true, startTime: true },
        })
      : Promise.resolve(null),
    prisma.patientActionToken.findMany({
      where: {
        practiceId,
        appointmentId: appointment.id,
        action: "claim_open_slot",
      },
      select: {
        id: true,
        tokenHash: true, // hashed — we don't return raw tokens in demo for safety
        clientId: true,
        expiresAt: true,
        usedAt: true,
        client: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    demoTag,
    appointmentId: appointment.id,
    victimClientId: victim.id,
    waitlistEntryIds: [wl1.id, wl2.id, wl3.id],
    waitlistClientIds: [w1.id, w2.id, w3.id],
    slotId,
    slot,
    offers: offeredTokens.map((t) => ({
      tokenId: t.id,
      clientName: `${t.client.firstName} ${t.client.lastName}`,
      expiresAt: t.expiresAt,
      used: Boolean(t.usedAt),
    })),
    steps: [
      "1. 4 demo patients created (1 victim + 3 waitlist)",
      "2. Appointment created 2 days from now at 10:00",
      "3. 3 waitlist entries added (2 flexible, 1 morning-preference)",
      "4. Appointment cancelled → OpenSlot created + auto-offer triggered",
      `5. ${offeredTokens.length} offers sent (check server console and /waitlist page)`,
      "6. Open the claim link from a patient's SMS (see Twilio MOCK log) or /open-slots to continue the demo",
    ],
  });
}
