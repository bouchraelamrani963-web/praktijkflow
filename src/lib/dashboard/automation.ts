import type { OpenSlotStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { findMatchesForSlot } from "@/lib/waitlist/matching";

type MessageStatus = "pending" | "sent" | "failed" | "mock" | string;

export type AutomationCategory = "open" | "in_progress" | "filled" | "action_needed";

export interface AutomationSummary {
  open: number;
  inProgress: number;
  filled: number;
  actionNeeded: number;
}

export interface AutomationDashboardItem {
  id: string;
  category: AutomationCategory;
  priority: "high" | "normal" | "low";
  title: string;
  description: string;
  statusLabel: string;
  slotStatus: OpenSlotStatus;
  startTime: string;
  practitionerName: string;
  appointmentTypeName: string | null;
  sourceLabel: string;
  href: string;
  primaryActionLabel: string;
  matchCount: number | null;
  offerSummary: {
    total: number;
    pending: number;
    sent: number;
    mock: number;
    failed: number;
  };
  details: string[];
}

export interface AutomationDashboardModel {
  summary: AutomationSummary;
  worklist: AutomationDashboardItem[];
}

const EMPTY_SUMMARY: AutomationSummary = {
  open: 0,
  inProgress: 0,
  filled: 0,
  actionNeeded: 0,
};

export const EMPTY_AUTOMATION_DASHBOARD: AutomationDashboardModel = {
  summary: EMPTY_SUMMARY,
  worklist: [],
};

function openSlotLogMarker(slotId: string): string {
  return `open-slot:${slotId}`;
}

function formatShortDateTime(date: Date): string {
  return date.toLocaleString("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusText(status: OpenSlotStatus): string {
  if (status === "AVAILABLE") return "Beschikbaar";
  if (status === "OFFERED") return "Aanbod loopt";
  if (status === "CLAIMED") return "Ingevuld in NoShow Control";
  return "Niet meer beschikbaar";
}

function sourceText(hasSourceAppointment: boolean): string {
  return hasSourceAppointment ? "Vrijgekomen door annulering/no-show" : "Handmatig aangemaakt";
}

function countStatuses(logs: { status: MessageStatus }[]) {
  return {
    total: logs.length,
    pending: logs.filter((log) => log.status === "pending").length,
    sent: logs.filter((log) => log.status === "sent").length,
    mock: logs.filter((log) => log.status === "mock").length,
    failed: logs.filter((log) => log.status === "failed").length,
  };
}

function activeOfferCount(summary: ReturnType<typeof countStatuses>): number {
  return summary.pending + summary.sent + summary.mock;
}

function categorySortValue(category: AutomationCategory): number {
  if (category === "action_needed") return 0;
  if (category === "in_progress") return 1;
  if (category === "open") return 2;
  return 3;
}

export async function buildAutomationDashboardModel(
  practiceId: string,
): Promise<AutomationDashboardModel> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const slots = await prisma.openSlot.findMany({
    where: {
      practiceId,
      OR: [
        { status: { in: ["AVAILABLE", "OFFERED"] } },
        { status: "CLAIMED", claimedAt: { gte: monthStart, not: null } },
        { status: "EXPIRED", updatedAt: { gte: monthStart } },
      ],
    },
    orderBy: [{ status: "asc" }, { startTime: "asc" }],
    take: 60,
    include: {
      practitioner: { select: { firstName: true, lastName: true } },
      appointmentType: { select: { name: true } },
    },
  });

  if (slots.length === 0) return EMPTY_AUTOMATION_DASHBOARD;

  const sourceAppointmentIds = slots
    .map((slot) => slot.sourceAppointmentId)
    .filter((id): id is string => Boolean(id));

  const logFilters = slots.flatMap((slot) => [
    { body: { contains: `/action/${slot.id}.` } },
    { body: { contains: openSlotLogMarker(slot.id) } },
  ]);

  const logs = await prisma.messageLog.findMany({
    where: {
      practiceId,
      channel: "email",
      OR: [
        ...(sourceAppointmentIds.length > 0
          ? [{ appointmentId: { in: sourceAppointmentIds } }]
          : []),
        ...logFilters,
      ],
    },
    select: {
      id: true,
      appointmentId: true,
      body: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const logsBySlotId = new Map<string, typeof logs>();
  for (const slot of slots) {
    const relatedLogs = logs.filter((log) => {
      if (slot.sourceAppointmentId && log.appointmentId === slot.sourceAppointmentId) {
        return true;
      }
      return (
        log.body.includes(`/action/${slot.id}.`) ||
        log.body.includes(openSlotLogMarker(slot.id))
      );
    });
    logsBySlotId.set(slot.id, relatedLogs);
  }

  const matchCountBySlotId = new Map<string, number>();
  const matchableSlots = slots.filter((slot) => slot.status === "AVAILABLE");
  for (const slot of matchableSlots) {
    const matches = await findMatchesForSlot(slot.id, practiceId);
    matchCountBySlotId.set(slot.id, matches.length);
  }

  const worklist = slots.map<AutomationDashboardItem>((slot) => {
    const relatedLogs = logsBySlotId.get(slot.id) ?? [];
    const offerSummary = countStatuses(relatedLogs);
    const matchCount = matchCountBySlotId.get(slot.id) ?? null;
    const practitionerName = `${slot.practitioner.firstName} ${slot.practitioner.lastName}`;
    const slotTime = formatShortDateTime(slot.startTime);
    const sourceLabel = sourceText(Boolean(slot.sourceAppointmentId));
    const details = [
      `${sourceLabel}.`,
      `Tijd: ${slotTime}.`,
      `Behandelaar: ${practitionerName}.`,
    ];

    if (slot.appointmentType?.name) {
      details.push(`Behandeling: ${slot.appointmentType.name}.`);
    }

    if (offerSummary.total > 0) {
      details.push(
        `Aanbiedingen: ${offerSummary.mock} test, ${offerSummary.sent} verzonden, ${offerSummary.pending} bezig, ${offerSummary.failed} mislukt.`,
      );
    }

    if (matchCount !== null) {
      details.push(`${matchCount} passende wachtlijstkandidaat${matchCount === 1 ? "" : "en"} gevonden.`);
    }

    let category: AutomationCategory;
    let priority: AutomationDashboardItem["priority"] = "normal";
    let title: string;
    let description: string;
    let primaryActionLabel = "Bekijk details";
    let href = `/open-slots/${slot.id}/matches`;

    const activeOffers = activeOfferCount(offerSummary);

    if (slot.status === "CLAIMED") {
      category = "filled";
      priority = "low";
      title = "Plek opnieuw ingevuld";
      description = "Deze afspraak is ingevuld binnen NoShow Control.";
      primaryActionLabel = slot.claimedAppointmentId ? "Bekijk afspraak" : "Bekijk open plek";
      href = slot.claimedAppointmentId ? `/appointments/${slot.claimedAppointmentId}` : "/open-slots?status=CLAIMED";
    } else if (slot.status === "EXPIRED") {
      category = "action_needed";
      priority = "high";
      title = "Open plek is verlopen";
      description = "Deze plek is niet opnieuw ingevuld. Controleer of opvolging nodig is.";
      primaryActionLabel = "Bekijk open plek";
      href = "/open-slots?status=EXPIRED";
    } else if (activeOffers > 0) {
      category = "in_progress";
      title = "Reactie op aanbod wordt afgewacht";
      description =
        offerSummary.mock > 0
          ? "Testaanbod aangemaakt. Er is geen echt bericht verstuurd."
          : "Aanbod geregistreerd. Dit betekent verzending, niet gegarandeerde aflevering.";
      primaryActionLabel = "Bekijk aanbiedingen";
    } else if (slot.status === "OFFERED") {
      category = "action_needed";
      priority = "high";
      title = "Geen actieve aanbieding gevonden";
      description = "Deze plek staat als aangeboden, maar er is geen actieve aanbieding gevonden.";
      primaryActionLabel = "Bekijk aanbod";
    } else if (offerSummary.failed > 0) {
      category = "action_needed";
      priority = "high";
      title = "Aanbod kon niet worden verstuurd";
      description = "Er is een mislukte berichtpoging gevonden en er loopt geen actief aanbod.";
      primaryActionLabel = "Bekijk aanbod";
    } else if (slot.status === "AVAILABLE" && matchCount === 0) {
      category = "action_needed";
      priority = "high";
      title = "Geen passende wachtlijstkandidaten";
      description = "De plek is beschikbaar, maar er zijn nu geen passende wachtlijstpatiënten gevonden.";
      primaryActionLabel = "Bekijk wachtlijst";
    } else {
      category = "open";
      title = "Open plek klaar voor aanbod";
      description = "Er is een beschikbare plek waarvoor nog geen actief aanbod loopt.";
      primaryActionLabel = "Vind patiënten";
    }

    return {
      id: slot.id,
      category,
      priority,
      title,
      description,
      statusLabel: statusText(slot.status),
      slotStatus: slot.status,
      startTime: slot.startTime.toISOString(),
      practitionerName,
      appointmentTypeName: slot.appointmentType?.name ?? null,
      sourceLabel,
      href,
      primaryActionLabel,
      matchCount,
      offerSummary,
      details,
    };
  });

  worklist.sort((a, b) => {
    const categoryDiff = categorySortValue(a.category) - categorySortValue(b.category);
    if (categoryDiff !== 0) return categoryDiff;
    if (a.priority !== b.priority) return a.priority === "high" ? -1 : 1;
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  });

  const summary = worklist.reduce<AutomationSummary>(
    (acc, item) => {
      if (item.category === "open") acc.open += 1;
      if (item.category === "in_progress") acc.inProgress += 1;
      if (item.category === "filled") acc.filled += 1;
      if (item.category === "action_needed") acc.actionNeeded += 1;
      return acc;
    },
    { ...EMPTY_SUMMARY },
  );

  return {
    summary,
    worklist: worklist.slice(0, 12),
  };
}
