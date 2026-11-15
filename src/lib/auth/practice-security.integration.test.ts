import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { POST as register } from "@/app/api/auth/register/route";
import { POST as login } from "@/app/api/auth/session/route";
import { GET as me } from "@/app/api/auth/me/route";
import { PATCH as settings } from "@/app/api/settings/route";
import { GET as members } from "@/app/api/settings/members/route";
import { DELETE as revoke } from "@/app/api/settings/members/[id]/route";
import { GET as patients, POST as addPatient } from "@/app/api/patients/route";
import { GET as patient, PATCH as editPatient, DELETE as removePatient } from "@/app/api/patients/[id]/route";
import { GET as appointment, PATCH as editAppointment, DELETE as removeAppointment } from "@/app/api/appointments/[id]/route";
import { POST as addAppointment } from "@/app/api/appointments/route";
import { POST as addWaitlist } from "@/app/api/waitlist/route";
import { GET as waitlist, PATCH as editWaitlist, DELETE as removeWaitlist } from "@/app/api/waitlist/[id]/route";
import { POST as createSlot } from "@/app/api/open-slots/route";
import { GET as readSlot, PATCH as editSlot } from "@/app/api/open-slots/[id]/route";
import { POST as createToken } from "@/app/api/tokens/route";
import { findMatchesForSlot } from "@/lib/waitlist/matching";
import { renderToStaticMarkup } from "react-dom/server";
import { POST as offerSlot } from "@/app/api/open-slots/[id]/offer/route";
import { POST as executePatientAction } from "@/app/api/tokens/execute/route";
import { GET as readDashboard } from "@/app/api/dashboard/route";
import { GET as listAppointments } from "@/app/api/appointments/route";
import ActionPage from "@/app/action/[token]/page";
import { amsterdamDateKey, formatActionDateTime } from "@/lib/practice-time";
import { createActionToken, lookupToken } from "@/lib/tokens/service";
import { hashToken } from "@/lib/tokens/crypto";
import type { Role } from "@/generated/prisma/client";

vi.mock("@/lib/firebase/admin", () => {
  const identity = (uid: string) => {
    if (!uid.startsWith("fixture-")) throw new Error("Invalid test identity");
    return { uid, email: `${uid}@example.test`, name: "Voorbeeld Medewerker" };
  };
  return {
    isFirebaseAdminConfigured: () => true,
    adminAuth: {
      verifyIdToken: identity, verifySessionCookie: identity, createSessionCookie: (uid: string) => uid,
    },
  };
});

const testDatabase = process.env.PRACTICE_SECURITY_INTEGRATION === "1";
if (testDatabase) {
  const url = new URL(process.env.DATABASE_URL ?? "invalid");
  if (url.hostname !== "127.0.0.1" || url.pathname !== "/practice_security_test") {
    throw new Error("Use an isolated local practice_security_test database");
  }
}

function request(uid: string, body?: object, query = "") {
  return new NextRequest(`http://example.test/api/test${query}`, {
    method: body ? "POST" : "GET",
    headers: { cookie: `session=${uid}`, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const fixtureId = () => `fixture-${randomUUID()}`;

async function practice(name: string) {
  const organization = await prisma.practice.create({ data: { name, slug: randomUUID() } });
  async function member(role: Role) {
    const firebaseUid = fixtureId();
    const user = await prisma.user.create({
      data: { firebaseUid, email: `${firebaseUid}@example.test`, firstName: "Demo", lastName: role },
    });
    const membership = await prisma.practiceMember.create({
      data: { userId: user.id, practiceId: organization.id, role },
    });
    return { ...user, membership };
  }
  const owner = await member("OWNER");
  const client = await prisma.client.create({
    data: { firstName: name, lastName: "Fictief", practiceId: organization.id },
  });
  const type = await prisma.appointmentType.create({
    data: { name: "Voorbeeld consult", price: 1234, practiceId: organization.id },
  });
  const startTime = new Date("2026-11-14T08:00:00Z");
  const booking = await prisma.appointment.create({
    data: { practiceId: organization.id, clientId: client.id, practitionerId: owner.id,
      appointmentTypeId: type.id, startTime, endTime: new Date(+startTime + 1_800_000) },
  });
  const entry = await prisma.waitlistEntry.create({
    data: { practiceId: organization.id, clientId: client.id, appointmentTypeId: type.id },
  });
  return { organization, member, owner, client, type, booking, entry };
}

describe.runIf(testDatabase)("practice rights against PostgreSQL with mocked Firebase", () => {
  let a: Awaited<ReturnType<typeof practice>>;
  let b: typeof a;
  let assistant: Awaited<ReturnType<typeof a.member>>;
  let admin: typeof assistant;
  let practitioner: typeof assistant;

  beforeAll(async () => {
    a = await practice("Fictieve praktijk A");
    b = await practice("Fictieve praktijk B");
    [assistant, admin, practitioner] = await Promise.all([
      a.member("ASSISTANT"), a.member("ADMIN"), a.member("PRACTITIONER"),
    ]);
  });

  afterAll(() => prisma.$disconnect());

  it("enforces owner permissions and validates settings before writing", async () => {
    for (const employee of [admin, assistant, practitioner]) {
      expect((await settings(request(employee.firebaseUid, { name: "Andere naam" }))).status).toBe(403);
      expect((await members(request(employee.firebaseUid))).status).toBe(403);
    }
    const owner = a.owner.firebaseUid;
    expect((await settings(request(owner, { name: false }))).status).toBe(400);
    expect((await settings(request(owner, { name: "Fictieve praktijk A2" }))).status).toBe(200);
    expect((await prisma.practice.findUniqueOrThrow({ where: { id: b.organization.id } })).name).toBe("Fictieve praktijk B");
    expect((await (await members(request(owner))).json()).members).toHaveLength(4);
  });

  it("allows daily work within the practice and restricts deletion or archiving", async () => {
    const uid = assistant.firebaseUid;
    expect((await addPatient(request(uid, { firstName: "Demo", lastName: "Controle" }))).status).toBe(201);
    expect((await editPatient(request(uid, { phone: "0600000000", isActive: true }), ctx(a.client.id))).status).toBe(200);
    expect((await editPatient(request(uid, { isActive: false }), ctx(a.client.id))).status).toBe(403);
    expect((await removePatient(request(uid), ctx(a.client.id))).status).toBe(403);
    expect((await removeAppointment(request(uid), ctx(a.booking.id))).status).toBe(403);
    expect((await removeWaitlist(request(practitioner.firebaseUid), ctx(a.entry.id))).status).toBe(403);
    expect((await appointment(request(uid), ctx(a.booking.id))).status).toBe(200);
    expect((await waitlist(request(uid), ctx(a.entry.id))).status).toBe(200);
  });

  it("scopes reading, writing and relationships to the signed-in practice", async () => {
    const uid = a.owner.firebaseUid;
    const list = await patients(request(uid, undefined, `?practiceId=${b.organization.id}`));
    expect((await list.json()).items.map((item: { id: string }) => item.id)).not.toContain(b.client.id);
    expect((await patient(request(uid), ctx(b.client.id))).status).toBe(404);
    expect((await editPatient(request(uid, { firstName: "Onjuist" }), ctx(b.client.id))).status).toBe(404);
    expect((await removePatient(request(uid), ctx(b.client.id))).status).toBe(404);
    expect((await appointment(request(uid), ctx(b.booking.id))).status).toBe(404);
    expect((await removeAppointment(request(uid), ctx(b.booking.id))).status).toBe(404);
    expect((await editAppointment(request(uid, { practitionerId: b.owner.id }), ctx(a.booking.id))).status).toBe(404);
    expect((await addAppointment(request(uid, { clientId: b.client.id, practitionerId: a.owner.id,
      appointmentTypeId: a.type.id, startTime: a.booking.startTime.toISOString() }))).status).toBe(404);
    expect((await waitlist(request(uid), ctx(b.entry.id))).status).toBe(404);
    expect((await removeWaitlist(request(uid), ctx(b.entry.id))).status).toBe(404);
    expect((await addWaitlist(request(uid, { clientId: b.client.id }))).status).toBe(404);
    expect((await addWaitlist(request(uid, { clientId: a.client.id, appointmentTypeId: b.type.id }))).status).toBe(404);
    expect((await editWaitlist(request(uid, { appointmentTypeId: b.type.id }), ctx(a.entry.id))).status).toBe(404);
    expect((await createToken(request(uid, { clientId: a.client.id, appointmentId: b.booking.id, action: "confirm_appointment" }))).status).toBe(404);
    expect(await prisma.waitlistEntry.findUniqueOrThrow({ where: { id: a.entry.id } })).toMatchObject({ appointmentTypeId: a.type.id });
    expect((await editWaitlist(request(uid, { appointmentTypeId: null }), ctx(a.entry.id))).status).toBe(200);
    expect((await editWaitlist(request(uid, { appointmentTypeId: a.type.id }), ctx(a.entry.id))).status).toBe(200);
  });

  it("keeps correctly linked offers visible and excludes inconsistent historical links", async () => {
    const { id: practiceId } = a.organization;
    const { id: slotId } = await prisma.openSlot.create({
      data: { practiceId, practitionerId: a.owner.id, appointmentTypeId: a.type.id,
        startTime: a.booking.startTime, endTime: a.booking.endTime, durationMinutes: 30 },
    });
    const aUid = a.owner.firebaseUid;
    const bUid = b.owner.firebaseUid;
    expect((await readSlot(request(aUid), ctx(slotId))).status).toBe(200);
    expect((await readSlot(request(bUid), ctx(slotId))).status).toBe(404);
    expect((await editSlot(request(bUid, { status: "EXPIRED" }), ctx(slotId))).status).toBe(404);
    expect((await createSlot(request(bUid, { practitionerId: a.owner.id,
      startTime: a.booking.startTime.toISOString(), durationMinutes: 30 }))).status).toBe(404);
    const mismatch = await prisma.waitlistEntry.create({
      data: { practiceId, clientId: a.client.id, appointmentTypeId: b.type.id },
    });
    expect((await waitlist(request(a.owner.firebaseUid), ctx(mismatch.id))).status).toBe(404);
    expect((await findMatchesForSlot(slotId, practiceId)).map((entry) => entry.id)).toEqual([a.entry.id]);
    const raw = `${slotId}.fixture-claim`;
    await prisma.patientActionToken.create({
      data: { practiceId, clientId: a.client.id, tokenHash: hashToken(raw),
        action: "claim_open_slot", expiresAt: new Date(Date.now() + 60_000) },
    });
    expect(await lookupToken(raw)).toMatchObject({ openSlot: { id: slotId, practiceId } });
    expect(await lookupToken("unknown-fixture")).toBeNull();
  });

  it("revokes access without changing existing appointments, waitlists or tariffs", async () => {
    const uid = assistant.firebaseUid;
    const owner = a.owner.firebaseUid;
    expect((await me(request(uid))).status).toBe(200);
    expect((await revoke(request(admin.firebaseUid), ctx(assistant.membership.id))).status).toBe(403);
    expect((await revoke(request(owner), ctx(b.owner.membership.id))).status).toBe(404);
    expect((await revoke(request(owner), ctx(a.owner.membership.id))).status).toBe(404);
    const total = await prisma.practice.count();
    expect((await revoke(request(owner), ctx(assistant.membership.id))).status).toBe(204);
    expect((await me(request(uid))).status).toBe(401);
    expect((await patients(request(uid))).status).toBe(401);
    expect((await editWaitlist(request(uid, { appointmentTypeId: null }), ctx(a.entry.id))).status).toBe(401);
    const relogin = await login(request(uid, { idToken: uid }));
    expect(relogin.status).toBe(403);
    expect((await register(request(uid, { idToken: uid, firstName: "Demo", lastName: "Beheerder", practiceName: "Fictief nieuw" }))).status).toBe(403);
    expect(await prisma.practice.count()).toBe(total);
    expect(await prisma.practiceMember.findUnique({ where: { id: assistant.membership.id } })).toMatchObject({ role: "ASSISTANT", isActive: false });
    expect(await prisma.appointment.findUnique({ where: { id: a.booking.id } })).toMatchObject({ practitionerId: a.owner.id, status: "SCHEDULED" });
    expect(await prisma.waitlistEntry.findUnique({ where: { id: b.entry.id } })).toMatchObject({ appointmentTypeId: b.type.id });
    expect(await prisma.appointmentType.findUnique({ where: { id: a.type.id } })).toMatchObject({ price: 1234 });
  });

  it("supports new registration, legacy repair and repeated registration", async () => {
    const uid = fixtureId();
    const payload = { idToken: uid, firstName: "Demo", lastName: "Eigenaar", practiceName: "Fictieve nieuwe praktijk" };
    const before = await prisma.practice.count();
    const result = await Promise.all([register(request(uid, payload)), register(request(uid, payload))]);
    expect(result.map(({ status }) => status)).toEqual([200, 200]);
    const user = (await (await me(request(uid))).json()).user;
    expect(user.role).toBe("OWNER");
    expect(await prisma.appointmentType.count({ where: { practiceId: user.practiceId } })).toBeGreaterThan(0);
    expect(await prisma.practice.count()).toBe(before + 1);
    const legacy = fixtureId();
    await prisma.user.create({ data: { firebaseUid: legacy, email: `${legacy}@example.test`, firstName: "Demo", lastName: "Ouder account" } });
    expect((await login(request(legacy, { idToken: legacy }))).status).toBe(200);
    expect((await (await me(request(legacy))).json()).user.role).toBe("OWNER");
  });
});

describe.runIf(testDatabase)("appointment claim in Dutch practice time", () => {
  it.each([
    ["2026-11-15T12:00:00Z", "2026-11-18", "09:00", "email"],
    ["2026-07-15T12:00:00Z", "2026-07-18", "08:00", "sms"],
    ["2026-03-28T23:10:00Z", "2026-03-29", "08:00", "email"],
    ["2026-10-24T22:10:00Z", "2026-10-25", "09:00", "email"],
  ] as const)("preserves the slot time through cancellation, %s matching, claim and confirmation", async (now, day, utcTime, channel) => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(now));
    vi.stubEnv("EMAIL_TEST_MODE", "true");
    vi.stubEnv("SMS_TEST_MODE", "true");
    vi.stubEnv("AUTO_OFFER_ENABLED", "false");
    try {
      const { owner, organization, booking, client, entry, type } = await practice("Fictieve claimpraktijk");
      const practiceId = organization.id;
      const uid = owner.firebaseUid;
      const fixtureStart = new Date(`${day}T${utcTime}:00Z`);
      const fixtureEnd = new Date(+fixtureStart + 30 * 60_000);
      await prisma.appointment.update({
        where: { id: booking.id },
        data: { startTime: fixtureStart, endTime: fixtureEnd, revenueEstimateCents: 5701 },
      });
      const waitingClient = await prisma.client.create({
        data: { practiceId, firstName: "Wachtlijst", lastName: "Fictief", email: "wachtlijst@example.test", phone: "0612345678" },
      });
      await prisma.waitlistEntry.update({
        where: { id: entry.id },
        data: { clientId: waitingClient.id, preferredTime: "10:00-11:00", status: "EXPIRED" },
      });

      const cancel = await createActionToken({ practiceId, appointmentId: booking.id, clientId: client.id, action: "cancel_appointment" });
      expect((await executePatientAction(request(uid, { token: cancel.rawToken }))).status).toBe(200);
      const slot = await prisma.openSlot.findUniqueOrThrow({ where: { sourceAppointmentId: booking.id } });
      expect(slot).toMatchObject({ startTime: fixtureStart, endTime: fixtureEnd, status: "AVAILABLE" });

      await prisma.waitlistEntry.update({ where: { id: entry.id }, data: { status: "WAITING" } });

      // Simulate the persisted divergence found in the November Preview.
      await prisma.appointment.update({
        where: { id: booking.id },
        data: { startTime: new Date(+fixtureStart - 3_600_000), endTime: new Date(+fixtureEnd - 3_600_000) },
      });
      await prisma.messageLog.create({
        data: { practiceId, appointmentId: booking.id, clientId: client.id, channel: "email", to: "", body: "Andere afspraakmelding", status: "sent" },
      });
      const before = await (await readDashboard(request(uid))).json();
      expect(before.automation.summary).toMatchObject({ open: 1, inProgress: 0 });
      expect(before.automation.worklist[0]).toMatchObject({ startTime: fixtureStart.toISOString() });
      expect(before.automation.worklist[0].details).toContainEqual(expect.stringContaining("10:00"));
      expect(await findMatchesForSlot(slot.id, practiceId)).toContainEqual(expect.objectContaining({
        id: entry.id, reasons: expect.arrayContaining(["Preferred time (10:00-11:00) matches"]),
      }));

      const offerResponse = await offerSlot(request(uid, { waitlistEntryId: entry.id, channel }), ctx(slot.id));
      expect(offerResponse.status).toBe(200);
      const { results } = await offerResponse.json();
      expect(results[0].status).toBe("test");
      const claimToken = new URL(results[0].claimUrl).pathname.split("/").pop()!;
      const offered = await (await readDashboard(request(uid))).json();
      expect(offered.automation.summary).toMatchObject({ open: 0, inProgress: 1 });
      expect(offered.automation.worklist[0].offerSummary).toMatchObject({ mock: 1, sent: 0, total: 1 });
      expect(renderToStaticMarkup(await ActionPage({ params: Promise.resolve({ token: claimToken }) }))).toContain("10:00");

      if (channel === "sms") {
        const legacy = await createActionToken({ practiceId, appointmentId: booking.id, clientId: waitingClient.id, action: "claim_open_slot" });
        expect(renderToStaticMarkup(await ActionPage({ params: Promise.resolve({ token: legacy.rawToken }) }))).toContain("10:00");
      }

      const response = await executePatientAction(request(uid, { token: claimToken }));
      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result).toMatchObject({ outcome: "success", appointmentStartTime: fixtureStart.toISOString() });
      expect(formatActionDateTime(new Date(result.appointmentStartTime))).toContain("10:00");
      expect(await prisma.appointment.findUniqueOrThrow({ where: { id: result.appointmentId } })).toMatchObject({
        practiceId, clientId: waitingClient.id, status: "CONFIRMED", startTime: fixtureStart, endTime: fixtureEnd,
        appointmentTypeId: type.id, revenueEstimateCents: 5701,
      });
      expect(await prisma.waitlistEntry.findUniqueOrThrow({ where: { id: entry.id } })).toMatchObject({ status: "ACCEPTED" });
      const agenda = await (await listAppointments(request(uid, undefined, `?dateFrom=${day}&dateTo=${day}`))).json();
      expect(agenda.items).toContainEqual(expect.objectContaining({ id: result.appointmentId, startTime: fixtureStart.toISOString() }));
      const dashboard = await (await readDashboard(request(uid))).json();
      expect(dashboard.automation.summary).toMatchObject({ open: 0, inProgress: 0, filled: 1 });
      expect(dashboard.automation.worklist[0]).toMatchObject({ startTime: fixtureStart.toISOString() });
      if (amsterdamDateKey(new Date(now)) === day) expect(dashboard.kpis.appointmentsToday).toBe(2);
    } finally {
      vi.unstubAllEnvs();
      vi.useRealTimers();
    }
  });

  it("counts open slots beyond the worklist limit", async () => {
    const { owner, organization, type } = await practice("Fictieve tellerspraktijk");
    const startTime = new Date(Date.now() + 86_400_000);
    await prisma.openSlot.createMany({
      data: Array.from({ length: 61 }, () => ({
        practiceId: organization.id, practitionerId: owner.id, appointmentTypeId: type.id,
        startTime, endTime: new Date(+startTime + 1_800_000), durationMinutes: 30,
      })),
    });
    const response = await (await readDashboard(request(owner.firebaseUid))).json();
    expect(response.automation.summary.open).toBe(61);
    expect(response.automation.worklist).toHaveLength(12);
  });
});
