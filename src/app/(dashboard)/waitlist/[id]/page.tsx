import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Mail, Phone, CalendarClock, Send, CheckCheck, Clock3 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { DAY_LABELS, TIME_LABELS, TYPE_LABELS } from "@/lib/labels";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const statusColors: Record<string, string> = {
  WAITING: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  OFFERED: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  ACCEPTED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  EXPIRED: "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300",
  CANCELLED: "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300",
};

const statusLabels: Record<string, string> = {
  WAITING: "Wachtend",
  OFFERED: "Aangeboden",
  ACCEPTED: "Geaccepteerd",
  EXPIRED: "Verlopen",
  CANCELLED: "Geannuleerd",
};

const ACTION_LABELS: Record<string, string> = {
  auto_offer_sent: "Aanbod verstuurd",
  auto_offer_skipped: "Aanbod overgeslagen",
  claim_open_slot: "Plek opnieuw ingevuld",
};

const ACTION_ICONS: Record<string, typeof Send> = {
  auto_offer_sent: Send,
  auto_offer_skipped: Clock3,
  claim_open_slot: CheckCheck,
};

function outcomeClass(outcome: string): string {
  if (outcome === "success" || outcome === "sent" || outcome === "mock") {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
  }
  if (outcome === "cooldown" || outcome === "expired") {
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  }
  if (outcome === "failed") {
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
  }
  return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
}

function formatDateTime(d: Date) {
  return new Date(d).toLocaleString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function WaitlistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.practiceId) redirect("/dashboard");

  const entry = await prisma.waitlistEntry.findFirst({
    where: { id, practiceId: user.practiceId },
    include: {
      client: {
        select: { id: true, firstName: true, lastName: true, phone: true, email: true },
      },
      appointmentType: { select: { id: true, name: true } },
    },
  });
  if (!entry) notFound();

  const offerHistory = await prisma.actionLog.findMany({
    where: {
      practiceId: user.practiceId,
      clientId: entry.client.id,
      action: { in: ["auto_offer_sent", "auto_offer_skipped", "claim_open_slot"] },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      action: true,
      outcome: true,
      details: true,
      createdAt: true,
    },
  });

  return (
    <div>
      <Link
        href="/waitlist"
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Terug naar wachtlijst
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            <Link
              href={`/patients/${entry.client.id}`}
              className="hover:text-blue-600 dark:hover:text-blue-400"
            >
              {entry.client.firstName} {entry.client.lastName}
            </Link>
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Op de wachtlijst sinds {formatDate(entry.createdAt)}
          </p>
        </div>
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusColors[entry.status]}`}
        >
          {statusLabels[entry.status]}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Patient + preferences */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Patiënt
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              {entry.client.email && (
                <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                  <Mail className="h-4 w-4 text-zinc-400" />
                  <a
                    href={`mailto:${entry.client.email}`}
                    className="hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    {entry.client.email}
                  </a>
                </div>
              )}
              {entry.client.phone && (
                <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                  <Phone className="h-4 w-4 text-zinc-400" />
                  <a
                    href={`tel:${entry.client.phone}`}
                    className="hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    {entry.client.phone}
                  </a>
                </div>
              )}
              {!entry.client.email && !entry.client.phone && (
                <p className="text-zinc-400">Geen contactgegevens</p>
              )}
            </dl>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Voorkeuren
            </h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-zinc-500">Type behandeling</dt>
                <dd className="mt-1 text-sm text-zinc-900 dark:text-white">
                  {entry.appointmentType
                    ? (TYPE_LABELS[entry.appointmentType.name] ?? entry.appointmentType.name)
                    : "Geen voorkeur"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Voorkeur dag</dt>
                <dd className="mt-1 text-sm text-zinc-900 dark:text-white">
                  {entry.preferredDay
                    ? (DAY_LABELS[entry.preferredDay] ?? entry.preferredDay)
                    : "Geen voorkeur"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Voorkeur tijd</dt>
                <dd className="mt-1 text-sm text-zinc-900 dark:text-white">
                  {entry.preferredTime
                    ? (TIME_LABELS[entry.preferredTime] ?? entry.preferredTime)
                    : "Geen voorkeur"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Flexibel</dt>
                <dd className="mt-1 text-sm">
                  {entry.isFlexible ? (
                    <span className="inline-flex rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                      Ja — accepteert elke plek
                    </span>
                  ) : (
                    <span className="text-zinc-600 dark:text-zinc-400">Nee</span>
                  )}
                </dd>
              </div>
              {entry.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-zinc-500">Notities</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                    {entry.notes}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Offer history */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            <CalendarClock className="h-4 w-4" />
            Aanbiedingsgeschiedenis
          </h2>
          {offerHistory.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-400">
              Nog geen aanbiedingen voor deze patiënt.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {offerHistory.map((log) => {
                const Icon = ACTION_ICONS[log.action] ?? CalendarClock;
                return (
                  <li
                    key={log.id}
                    className="flex items-start gap-3 rounded-lg border border-zinc-100 p-3 dark:border-zinc-700"
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-zinc-900 dark:text-white">
                          {ACTION_LABELS[log.action] ?? log.action}
                        </span>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${outcomeClass(log.outcome)}`}
                        >
                          {log.outcome}
                        </span>
                      </div>
                      {log.details && (
                        <p className="mt-1 truncate text-xs text-zinc-500">
                          {log.details}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-zinc-400">
                        {formatDateTime(log.createdAt)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
