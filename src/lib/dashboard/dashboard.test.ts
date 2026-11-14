import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  $transaction: vi.fn(),
  appointment: { count: vi.fn() },
  openSlot: { count: vi.fn(), findMany: vi.fn() },
  messageLog: { findMany: vi.fn() },
  patientActionToken: { findMany: vi.fn() },
}));
const getCurrentUser = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser }));
vi.mock("@/lib/waitlist/matching", () => ({ findMatchesForSlot: vi.fn(async () => []) }));

import { NextRequest } from "next/server";
import { GET } from "@/app/api/dashboard/route";
import { appointmentQuerySchema } from "@/lib/validations/appointment";
import { hashToken } from "@/lib/tokens/crypto";
import { amsterdamDateRange, amsterdamToday } from "./amsterdam-day";
import { loadDashboardActions, loadDashboardHistory } from "./automation";
import { loadDashboardCounts } from "./counts";

const now = new Date("2026-11-14T09:00:00Z");
const today = amsterdamToday(now);
const practiceId = "practice-a";

beforeEach(() => {
  vi.resetAllMocks();
  db.$transaction.mockImplementation((queries) => Promise.all(queries));
  db.appointment.count.mockResolvedValue(0);
  db.openSlot.count.mockResolvedValue(0);
  db.openSlot.findMany.mockResolvedValue([]);
  db.messageLog.findMany.mockResolvedValue([]);
  db.patientActionToken.findMany.mockResolvedValue([]);
  getCurrentUser.mockResolvedValue({ practiceId });
});

describe("Amsterdam day", () => {
  it("uses the Amsterdam date before UTC midnight", () => {
    expect(amsterdamToday(new Date("2026-11-13T23:30:00Z"))).toEqual({
      day: "2026-11-14",
      start: new Date("2026-11-13T23:00:00Z"),
      end: new Date("2026-11-14T23:00:00Z"),
    });
  });

  it.each([
    ["2026-03-29", "2026-03-28T23:00:00Z", "2026-03-29T22:00:00Z", 23],
    ["2026-10-25", "2026-10-24T22:00:00Z", "2026-10-25T23:00:00Z", 25],
  ])("uses both midnight offsets on %s", (day, start, end, hours) => {
    const range = amsterdamDateRange(day)!;
    expect(range).toEqual({ start: new Date(start), end: new Date(end) });
    expect((+range.end - +range.start) / 3_600_000).toBe(hours);
  });

  it("uses the same calendar date for the agenda and preserves explicit timestamps", () => {
    const day = appointmentQuerySchema.parse({ dateFrom: today.day, dateTo: today.day, status: "PLANNED" });
    expect(day).toMatchObject({
      dateFrom: today.start, dateTo: new Date(+today.end - 1), status: "PLANNED",
    });
    expect(appointmentQuerySchema.parse({ dateTo: now.toISOString() }).dateTo).toEqual(now);
    expect(amsterdamDateRange("2026-02-30")).toBeUndefined();
  });
});

describe("dashboard counts", () => {
  it("counts every scoped row independently of list limits", async () => {
    db.appointment.count.mockResolvedValueOnce(86).mockResolvedValueOnce(4).mockResolvedValueOnce(9);
    db.openSlot.count.mockResolvedValueOnce(72).mockResolvedValueOnce(101).mockResolvedValueOnce(64);
    await expect(loadDashboardCounts(practiceId, now, today)).resolves.toEqual({
      appointments: 86, noShows: 4, cancellations: 9, released: 72, available: 101, filled: 64,
    });
    const range = { gte: today.start, lt: today.end };
    expect(db.appointment.count.mock.calls.flat()).toEqual([
      { where: { practiceId, startTime: range, status: { in: ["SCHEDULED", "CONFIRMED", "IN_PROGRESS", "COMPLETED"] } } },
      { where: { practiceId, startTime: range, status: "NO_SHOW" } },
      { where: { practiceId, startTime: range, status: "CANCELLED" } },
    ]);
    expect(db.openSlot.count.mock.calls.flat()).toEqual([
      { where: { practiceId, sourceAppointmentId: { not: null }, createdAt: range } },
      { where: { practiceId, status: "AVAILABLE", startTime: { gt: now } } },
      { where: { practiceId, status: "CLAIMED", claimedAt: range } },
    ]);
  });

  it("reports missing counts while retaining genuine zeroes and available sections", async () => {
    db.appointment.count.mockRejectedValueOnce(new Error("fixture unavailable"));
    const url = "https://example.test/api/dashboard?practiceId=other";
    const response = await GET(new NextRequest(url));
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toMatchObject({
      counts: null, actions: { total: 0, items: [] }, history: { total: 0, items: [] },
    });
    expect(db.appointment.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ practiceId }) }),
    );
    const success = await GET(new NextRequest(url));
    expect((await success.json()).counts.appointments).toBe(0);
  });

  it("rejects callers without a session or practice before reading data", async () => {
    getCurrentUser.mockResolvedValueOnce(null).mockResolvedValueOnce({ practiceId: null });
    const request = new NextRequest("https://example.test/api/dashboard");
    expect((await GET(request)).status).toBe(401);
    expect((await GET(request)).status).toBe(403);
    expect(db.openSlot.findMany).not.toHaveBeenCalled();
  });
});

function slot(index: number, status = "AVAILABLE", startTime = new Date("2026-11-14T12:00:00Z")) {
  return {
    id: `aaaa1111-0000-4000-8000-${String(index).padStart(12, "0")}`,
    startTime, status, durationMinutes: 30, claimedAppointmentId: null,
    practitioner: { firstName: "Demo", lastName: "Zorgverlener", memberships: [{ practiceId }] },
    appointmentType: { practiceId, name: "Intake" },
  };
}

it("paginates all current slots and prioritizes actions over real, valid offers", async () => {
  const waiting = slot(0, "OFFERED");
  const expiredLink = slot(1, "OFFERED");
  const simulated = slot(2, "OFFERED");
  const failed = slot(3, "OFFERED");
  db.openSlot.findMany.mockResolvedValue([
    waiting, expiredLink, simulated, failed, ...Array.from({ length: 65 }, (_, index) => slot(index + 4)),
  ]);
  const message = (id: string, status: string) => ({
    body: `https://example.test/action/${id}.fixture`, status, clientId: "client-a",
  });
  db.messageLog.findMany.mockResolvedValue([
    message(waiting.id, "sent"), message(expiredLink.id, "sent"), message(simulated.id, "mock"),
    { body: `open-slot:${failed.id}`, status: "failed", clientId: "client-a" },
  ]);
  db.patientActionToken.findMany.mockResolvedValue([
    { tokenHash: hashToken(`${waiting.id}.fixture`), clientId: "client-a" },
  ]);
  const first = await loadDashboardActions(practiceId, now, today.end, 1);
  const last = await loadDashboardActions(practiceId, now, today.end, 6);
  expect(first.total).toBe(69);
  expect(first.items.slice(0, 3).map(({ id, action, urgent, sent, simulated }) => (
    { id, action, urgent, sent, simulated }
  ))).toEqual([
    { id: expiredLink.id, action: "review-offer", urgent: true, sent: 0, simulated: 0 },
    { id: simulated.id, action: "review-offer", urgent: true, sent: 0, simulated: 1 },
    { id: failed.id, action: "failed", urgent: true, sent: 0, simulated: 0 },
  ]);
  expect(last.items.at(-1)).toMatchObject({ id: waiting.id, action: "waiting", urgent: false, sent: 1 });
  expect(db.patientActionToken.findMany).toHaveBeenCalledWith(expect.objectContaining({
    where: expect.objectContaining({ practiceId, action: "claim_open_slot", usedAt: null, expiresAt: { gt: now } }),
  }));
});

it("queries history separately, including slots whose start passed without a status update", async () => {
  const past = slot(1, "AVAILABLE", now);
  db.openSlot.findMany.mockResolvedValue([past]);
  db.openSlot.count.mockResolvedValue(61);
  const result = await loadDashboardHistory(practiceId, now, 6);
  expect(result).toMatchObject({ total: 61, items: [{ id: past.id, action: "history", urgent: false }] });
  expect(db.openSlot.findMany).toHaveBeenCalledWith(expect.objectContaining({
    where: { practiceId, OR: [{ startTime: { lte: now } }, { status: { in: ["CLAIMED", "EXPIRED"] } }] },
    skip: 60, take: 12,
  }));
});
