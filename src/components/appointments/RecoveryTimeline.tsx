import { CalendarX, Clock3, Send, CheckCheck, CalendarCheck } from "lucide-react";
import { prisma } from "@/lib/db";

interface Props {
  practiceId: string;
  sourceAppointmentId: string;
  /** Highlights the matching node so the user knows where they are. */
  currentAppointmentId?: string;
}

function fmt(d: Date) {
  return new Date(d).toLocaleString("nl-NL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtRelative(from: Date, to: Date): string {
  const diffMin = Math.max(0, Math.round((to.getTime() - from.getTime()) / 60_000));
  if (diffMin < 1) return "< 1 min later";
  if (diffMin < 60) return `${diffMin} min later`;
  if (diffMin < 1440) return `${Math.round(diffMin / 60)} uur later`;
  return `${Math.round(diffMin / 1440)} dag(en) later`;
}

export async function RecoveryTimeline({
  practiceId,
  sourceAppointmentId,
  currentAppointmentId,
}: Props) {
  const [sourceAppt, openSlot, offerLogs, claimLog] = await Promise.all([
    prisma.appointment.findFirst({
      where: { id: sourceAppointmentId, practiceId },
      select: {
        id: true,
        startTime: true,
        updatedAt: true,
        client: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.openSlot.findFirst({
      where: { sourceAppointmentId, practiceId },
      select: { id: true, createdAt: true, status: true, startTime: true, practitionerId: true },
    }),
    prisma.actionLog.findMany({
      where: {
        practiceId,
        appointmentId: sourceAppointmentId,
        action: { in: ["auto_offer_sent", "auto_offer_skipped"] },
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, action: true, outcome: true, createdAt: true, clientId: true },
    }),
    prisma.actionLog.findFirst({
      where: {
        practiceId,
        appointmentId: sourceAppointmentId,
        action: "claim_open_slot",
        outcome: "success",
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, createdAt: true, clientId: true },
    }),
  ]);

  const newAppt =
    claimLog?.clientId && openSlot
      ? await prisma.appointment.findFirst({
          where: {
            practiceId,
            clientId: claimLog.clientId,
            practitionerId: openSlot.practitionerId,
            startTime: openSlot.startTime,
          },
          select: {
            id: true,
            client: { select: { id: true, firstName: true, lastName: true } },
            revenueEstimateCents: true,
          },
        })
      : null;

  if (!sourceAppt && !openSlot) return null;

  const sentOffers = offerLogs.filter((l) => l.action === "auto_offer_sent");
  const offerClientIds = [
    ...new Set(sentOffers.map((l) => l.clientId).filter((id): id is string => Boolean(id))),
  ];
  const offerClients = offerClientIds.length
    ? await prisma.client.findMany({
        where: { id: { in: offerClientIds }, practiceId },
        select: { id: true, firstName: true, lastName: true },
      })
    : [];
  const offerClientById = new Map(offerClients.map((c) => [c.id, c]));

  const cancelledAt = sourceAppt?.updatedAt ?? null;
  const slotCreatedAt = openSlot?.createdAt ?? null;
  const claimedAt = claimLog?.createdAt ?? null;

  const steps = [
    {
      key: "cancel",
      icon: CalendarX,
      title: "Afspraak geannuleerd",
      done: !!cancelledAt,
      tone: "red" as const,
      time: cancelledAt ? fmt(cancelledAt) : null,
      detail: sourceAppt
        ? `${sourceAppt.client.firstName} ${sourceAppt.client.lastName}`
        : null,
      isCurrent: currentAppointmentId === sourceAppointmentId,
    },
    {
      key: "freed",
      icon: Clock3,
      title: "Open plek aangemaakt",
      done: !!slotCreatedAt,
      tone: "amber" as const,
      time: slotCreatedAt ? fmt(slotCreatedAt) : null,
      detail:
        slotCreatedAt && cancelledAt
          ? fmtRelative(cancelledAt, slotCreatedAt)
          : "Wachten op cancellation hook",
    },
    {
      key: "offers",
      icon: Send,
      title: "Aanbiedingen verstuurd",
      done: sentOffers.length > 0,
      tone: "blue" as const,
      time:
        sentOffers.length > 0 && slotCreatedAt
          ? fmtRelative(slotCreatedAt, sentOffers[0]!.createdAt)
          : null,
      detail:
        sentOffers.length > 0
          ? `${sentOffers.length} patiënt${sentOffers.length === 1 ? "" : "en"} aangeschreven`
          : "Nog geen aanbiedingen verstuurd",
      sublist: sentOffers.slice(0, 3).map((l) => {
        const c = l.clientId ? offerClientById.get(l.clientId) : null;
        return c ? `${c.firstName} ${c.lastName}` : "Onbekende patiënt";
      }),
    },
    {
      key: "claim",
      icon: CheckCheck,
      title: "Plek geclaimd",
      done: !!claimedAt,
      tone: "emerald" as const,
      time:
        claimedAt && slotCreatedAt ? fmtRelative(slotCreatedAt, claimedAt) : null,
      detail: newAppt
        ? `${newAppt.client.firstName} ${newAppt.client.lastName}`
        : claimedAt
          ? "Patiënt onbekend"
          : "Wachtend op claim",
    },
    {
      key: "booked",
      icon: CalendarCheck,
      title: "Nieuwe afspraak ingepland",
      done: !!newAppt,
      tone: "emerald" as const,
      time: newAppt && claimedAt ? fmt(claimedAt) : null,
      detail: newAppt
        ? `€${((Number.isFinite(newAppt.revenueEstimateCents) ? newAppt.revenueEstimateCents : 0) / 100).toFixed(2)} teruggewonnen`
        : "Nog niet ingepland",
      isCurrent: currentAppointmentId === newAppt?.id,
    },
  ];

  const tones = {
    red: "bg-red-100 text-red-700 ring-red-200 dark:bg-red-900/30 dark:text-red-300 dark:ring-red-900/40",
    amber:
      "bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-900/40",
    blue: "bg-blue-100 text-blue-700 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-900/40",
    emerald:
      "bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-900/40",
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Recovery timeline
      </h2>
      <p className="mt-1 text-xs text-zinc-500">
        Van annulering tot nieuwe afspraak
      </p>

      <ol className="mt-6 space-y-0">
        {steps.map((step, i) => {
          const Icon = step.icon;
          const isLast = i === steps.length - 1;
          const ringTone = step.done ? tones[step.tone] : "bg-zinc-100 text-zinc-400 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-500 dark:ring-zinc-700";
          return (
            <li key={step.key} className="relative flex gap-4 pb-6 last:pb-0">
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={`absolute left-[19px] top-10 -bottom-2 w-px ${
                    step.done ? "bg-emerald-200 dark:bg-emerald-900/40" : "bg-zinc-200 dark:bg-zinc-800"
                  }`}
                />
              )}
              <div
                className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-4 ${ringTone}`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1 pt-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p
                    className={`text-sm font-semibold ${
                      step.isCurrent
                        ? "text-blue-700 dark:text-blue-300"
                        : "text-zinc-900 dark:text-white"
                    }`}
                  >
                    {step.title}
                    {step.isCurrent && (
                      <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        Huidige
                      </span>
                    )}
                  </p>
                  {step.time && (
                    <span className="text-xs tabular-nums text-zinc-500">{step.time}</span>
                  )}
                </div>
                {step.detail && (
                  <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                    {step.detail}
                  </p>
                )}
                {"sublist" in step && step.sublist && step.sublist.length > 0 && (
                  <ul className="mt-2 space-y-0.5 text-xs text-zinc-500">
                    {step.sublist.map((name, idx) => (
                      <li key={idx}>• {name}</li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
