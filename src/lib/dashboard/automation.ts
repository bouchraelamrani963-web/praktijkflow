import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { hashToken } from "@/lib/tokens/crypto";
import { findMatchesForSlot } from "@/lib/waitlist/matching";
import { DASHBOARD_PAGE_SIZE, type DashboardSlot, type DashboardSlotPage } from "./types";

const pageSize = DASHBOARD_PAGE_SIZE;
const slotSelect = {
  id: true, startTime: true, durationMinutes: true, status: true, claimedAppointmentId: true,
  practitioner: { select: { firstName: true, lastName: true, memberships: { select: { practiceId: true } } } },
  appointmentType: { select: { name: true, practiceId: true } },
} satisfies Prisma.OpenSlotSelect;
type Slot = Prisma.OpenSlotGetPayload<{ select: typeof slotSelect }>;

function slotItem(slot: Slot, practiceId: string) {
  return {
    id: slot.id,
    startTime: slot.startTime.toISOString(),
    durationMinutes: slot.durationMinutes,
    appointmentType: slot.appointmentType?.practiceId === practiceId ? slot.appointmentType.name : null,
    practitioner: slot.practitioner.memberships.some((membership) => membership.practiceId === practiceId)
      ? `${slot.practitioner.firstName} ${slot.practitioner.lastName}`
      : "Zorgverlener onbekend",
    status: slot.status,
    href: `/open-slots/${slot.id}/matches`,
  };
}

export async function loadDashboardActions(
  practiceId: string,
  now: Date,
  dayEnd: Date,
  page: number,
): Promise<DashboardSlotPage> {
  const slots = await prisma.openSlot.findMany({
    where: { practiceId, startTime: { gt: now }, status: { in: ["AVAILABLE", "OFFERED"] } },
    orderBy: [{ startTime: "asc" }, { id: "asc" }],
    select: slotSelect,
  });
  if (!slots.length) return { items: [], total: 0 };

  // Offer links and failure markers identify the slot explicitly. An appointment ID alone
  // also matches reminders and other messages, so it is insufficient for attribution.
  const offers = new Map(slots.map((slot) => [
    slot.id, { sent: new Set<string>(), simulated: new Set<string>(), failed: false },
  ]));
  const sent = new Map<string, { slotId: string; clientId: string }>();
  for (let index = 0; index < slots.length; index += 100) {
    const logs = await prisma.messageLog.findMany({
      where: {
        practiceId,
        channel: { in: ["email", "sms"] },
        status: { in: ["sent", "mock", "failed"] },
        OR: slots.slice(index, index + 100).flatMap(({ id }) => [
          { body: { contains: `/action/${id}.` } },
          { body: { equals: `open-slot:${id}` } },
        ]),
      },
      select: { body: true, status: true, clientId: true },
    });
    for (const log of logs) {
      const link = log.body.match(/\/action\/([\da-f-]{36})\.([\w-]+)/i);
      const slotId = link?.[1] ?? log.body.match(/^open-slot:([\da-f-]{36})$/i)?.[1];
      const offer = slotId ? offers.get(slotId) : undefined;
      if (!offer || !slotId) continue;
      if (log.status === "failed") offer.failed = true;
      if (!link) continue;
      const hash = hashToken(`${slotId}.${link[2]}`);
      if (log.status === "mock") offer.simulated.add(hash);
      if (log.status === "sent") sent.set(hash, { slotId, clientId: log.clientId });
    }
  }

  if (sent.size) {
    const hashes = [...sent.keys()];
    // Bound the number of SQL parameters per query even for large practices.
    for (let index = 0; index < hashes.length; index += 1000) {
      const tokens = await prisma.patientActionToken.findMany({
        where: {
          practiceId, action: "claim_open_slot", usedAt: null, expiresAt: { gt: now },
          tokenHash: { in: hashes.slice(index, index + 1000) },
        },
        select: { tokenHash: true, clientId: true },
      });
      for (const token of tokens) {
        const log = sent.get(token.tokenHash);
        if (log?.clientId === token.clientId) offers.get(log.slotId)?.sent.add(token.tokenHash);
      }
    }
  }

  const items = slots.map((slot): DashboardSlot => {
    const offer = offers.get(slot.id)!;
    const action = offer.sent.size > 0 ? "waiting"
      : offer.failed ? "failed"
      : slot.status === "OFFERED" ? "review-offer"
      : "candidates";
    return {
      ...slotItem(slot, practiceId),
      action,
      urgent: action !== "waiting" && slot.startTime < dayEnd,
      sent: offer.sent.size,
      simulated: offer.simulated.size,
    };
  });
  const order = (item: DashboardSlot) => item.urgent ? 0 : item.action === "waiting" ? 2 : 1;
  items.sort((a, b) => order(a) - order(b));

  const visible = items.slice((page - 1) * pageSize, page * pageSize);
  const withCandidates = await Promise.all(visible.map(async (item) => {
    if (item.action !== "candidates") return item;
    const matches = await findMatchesForSlot(item.id, practiceId);
    return matches.length > 0 ? item : { ...item, action: "no-candidates" as const };
  }));
  return { items: withCandidates, total: items.length };
}

export async function loadDashboardHistory(
  practiceId: string,
  now: Date,
  page: number,
): Promise<DashboardSlotPage> {
  const where: Prisma.OpenSlotWhereInput = {
    practiceId,
    OR: [{ startTime: { lte: now } }, { status: { in: ["CLAIMED", "EXPIRED"] } }],
  };
  const [total, slots] = await prisma.$transaction([
    prisma.openSlot.count({ where }),
    prisma.openSlot.findMany({
      where, orderBy: [{ startTime: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize, take: pageSize, select: slotSelect,
    }),
  ]);
  return {
    total,
    items: slots.map((slot) => ({
      ...slotItem(slot, practiceId),
      href: slot.status === "CLAIMED" && slot.claimedAppointmentId
        ? `/appointments/${slot.claimedAppointmentId}`
        : `/open-slots/${slot.id}/matches`,
      action: "history", urgent: false, sent: 0, simulated: 0,
    })),
  };
}
