import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Pencil, Clock, User, Calendar, DollarSign, ShieldAlert, Zap, TrendingUp } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { StatusSelector } from "@/components/appointments/StatusSelector";
import { ReminderButton } from "@/components/appointments/ReminderButton";
import { AddToWaitlistButton } from "@/components/appointments/AddToWaitlistButton";
import { RecoveryTimeline } from "@/components/appointments/RecoveryTimeline";
import { RISK_LABELS, TYPE_LABELS } from "@/lib/labels";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const riskColors: Record<string, string> = {
  LOW: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  MEDIUM: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  CRITICAL: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

function fmt(d: Date) {
  return new Date(d).toLocaleString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function durationMin(start: Date, end: Date) {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60_000);
}

export default async function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.practiceId) redirect("/dashboard");

  const appt = await prisma.appointment.findFirst({
    where: { id, practiceId: user.practiceId },
    include: {
      client: true,
      practitioner: { select: { id: true, firstName: true, lastName: true, email: true } },
      appointmentType: true,
    },
  });

  if (!appt) notFound();

  const dur = durationMin(appt.startTime, appt.endTime);

  // ── Waitlist claim detection ──────────────────────────────────────────────
  // A claimed OpenSlot shares exact startTime/endTime/practitionerId with the
  // appointment that was created during the claim flow.
  const claimedSlot = await prisma.openSlot.findFirst({
    where: {
      practiceId: appt.practiceId,
      practitionerId: appt.practitionerId,
      startTime: appt.startTime,
      endTime: appt.endTime,
      status: "CLAIMED",
    },
    select: {
      id: true,
      createdAt: true,
      sourceAppointment: {
        select: { id: true, startTime: true, status: true },
      },
    },
  });

  // ActionLog written at claim time: appointmentId = sourceAppointmentId, clientId = claimer
  const claimLog = claimedSlot?.sourceAppointment
    ? await prisma.actionLog.findFirst({
        where: {
          action: "claim_open_slot",
          outcome: "success",
          appointmentId: claimedSlot.sourceAppointment.id,
          clientId: appt.clientId,
        },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      })
    : null;

  // ── Reverse view: was a slot freed by THIS appointment later claimed? ────────
  // Shown on the cancelled appointment to surface who took the recovered slot.
  const recoveredSlot = await prisma.openSlot.findFirst({
    where: { sourceAppointmentId: appt.id, status: "CLAIMED" },
    select: { startTime: true, createdAt: true, updatedAt: true },
  });

  const recoveredDetail = await (async () => {
    if (!recoveredSlot) return null;

    const log = await prisma.actionLog.findFirst({
      where: { action: "claim_open_slot", outcome: "success", appointmentId: appt.id },
      orderBy: { createdAt: "desc" },
      select: { clientId: true, createdAt: true },
    });
    if (!log?.clientId) return null;

    const [claimingClient, newAppt] = await Promise.all([
      prisma.client.findFirst({
        where: { id: log.clientId },
        select: { id: true, firstName: true, lastName: true },
      }),
      prisma.appointment.findFirst({
        where: {
          practiceId: appt.practiceId,
          clientId: log.clientId,
          practitionerId: appt.practitionerId,
          startTime: appt.startTime,
        },
        select: { id: true, revenueEstimateCents: true },
      }),
    ]);

    const freedAt  = recoveredSlot.createdAt;   // slot created = moment of cancellation
    const claimedAt = log.createdAt;
    const diffMs   = claimedAt.getTime() - freedAt.getTime();
    const diffMin  = Math.round(diffMs / 60_000);

    let fillTime: string;
    if (diffMin < 1)        fillTime = "Binnen 1 min ingevuld";
    else if (diffMin < 60)  fillTime = `Binnen ${diffMin} min ingevuld`;
    else if (diffMin < 1440) fillTime = `Binnen ${Math.round(diffMin / 60)} uur ingevuld`;
    else                    fillTime = `Binnen ${Math.round(diffMin / 1440)} dag${Math.round(diffMin / 1440) === 1 ? "" : "en"} ingevuld`;

    return {
      clientId: log.clientId,
      clientName: claimingClient
        ? `${claimingClient.firstName} ${claimingClient.lastName}`
        : "Onbekende patiënt",
      claimedAt,
      slotStartTime: recoveredSlot.startTime,
      revenueEstimateCents: newAppt?.revenueEstimateCents ?? appt.revenueEstimateCents,
      newAppointmentId: newAppt?.id ?? null,
      fillTime,
    };
  })();

  return (
    <div>
      <Link
        href="/appointments"
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Terug naar afspraken
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
              {appt.appointmentType
                ? (TYPE_LABELS[appt.appointmentType.name] ?? appt.appointmentType.name)
                : "Afspraak"}
            </h1>
            {/* Drop the raw risk score from the page header — it's a
                technical signal, not a conversion signal. The Planning panel
                still shows the explicit "Score: X/100" for operational use. */}
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${riskColors[appt.riskLevel]}`}>
              {RISK_LABELS[appt.riskLevel] ?? appt.riskLevel}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-500">{fmt(appt.startTime)}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusSelector
            appointmentId={appt.id}
            current={appt.status as Parameters<typeof StatusSelector>[0]["current"]}
          />
          <AddToWaitlistButton
            clientId={appt.client.id}
            appointmentTypeId={appt.appointmentTypeId}
          />
          <Link
            href={`/appointments/${appt.id}/edit`}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            <Pencil className="h-4 w-4" />
            Bewerken
          </Link>
        </div>
      </div>

      <div className={`grid gap-6 ${claimedSlot || recoveredDetail ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        {/* Scheduling */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-white">
            <Calendar className="h-4 w-4" />
            Planning
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-xs uppercase text-zinc-500">Start</dt>
              <dd className="mt-1 text-zinc-700 dark:text-zinc-300">{fmt(appt.startTime)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-zinc-500">Einde</dt>
              <dd className="mt-1 text-zinc-700 dark:text-zinc-300">{fmt(appt.endTime)}</dd>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-zinc-400" />
              <span className="text-zinc-700 dark:text-zinc-300">{dur} minuten</span>
            </div>
            {appt.appointmentType && (
              <div>
                <dt className="text-xs uppercase text-zinc-500">Type</dt>
                <dd className="mt-1 flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: appt.appointmentType.color }}
                  />
                  {TYPE_LABELS[appt.appointmentType.name] ?? appt.appointmentType.name}
                </dd>
              </div>
            )}
            {/*
              Revenue rule: only appointments that actually happened (or are
              still on track to happen) contribute to revenue. CANCELLED and
              NO_SHOW appointments carry no billable value, so we render
              "Geen omzet" instead of the stale estimate to avoid creating the
              impression that lost time equals money.
            */}
            <div className="flex items-center gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
              <DollarSign className="h-4 w-4 text-zinc-400" />
              {appt.status === "CANCELLED" || appt.status === "NO_SHOW" ? (
                <>
                  <span className="font-mono text-zinc-400 line-through">
                    €{((Number.isFinite(appt.revenueEstimateCents) ? appt.revenueEstimateCents : 0) / 100).toFixed(2)}
                  </span>
                  <span className="text-xs text-red-600 dark:text-red-400">
                    Geen omzet — {appt.status === "CANCELLED" ? "geannuleerd" : "niet verschenen"}
                  </span>
                </>
              ) : (
                <>
                  <span className="font-mono text-zinc-700 dark:text-zinc-300">
                    €{((Number.isFinite(appt.revenueEstimateCents) ? appt.revenueEstimateCents : 0) / 100).toFixed(2)}
                  </span>
                  <span className="text-xs text-zinc-500">geschat</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
              <ShieldAlert className="h-4 w-4 text-zinc-400" />
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${riskColors[appt.riskLevel]}`}>
                {RISK_LABELS[appt.riskLevel] ?? appt.riskLevel}
              </span>
              <span className="text-xs tabular-nums text-zinc-500">Score: {appt.riskScore}/100</span>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
              <ReminderButton
                appointmentId={appt.id}
                type="48h"
                alreadySent={appt.reminder48hSent}
                hasPhone={Boolean(appt.client.phone)}
              />
              <ReminderButton
                appointmentId={appt.id}
                type="24h"
                alreadySent={appt.reminder24hSent}
                hasPhone={Boolean(appt.client.phone)}
              />
            </div>
          </dl>
        </div>

        {/* Patient */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-white">
            <User className="h-4 w-4" />
            Patiënt
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-xs uppercase text-zinc-500">Naam</dt>
              <dd className="mt-1">
                <Link
                  href={`/patients/${appt.client.id}`}
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  {appt.client.firstName} {appt.client.lastName}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-zinc-500">Risiconiveau</dt>
              <dd className="mt-1">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${riskColors[appt.client.riskLevel]}`}>
                  {RISK_LABELS[appt.client.riskLevel] ?? appt.client.riskLevel}
                </span>
              </dd>
            </div>
            {appt.client.email && (
              <div>
                <dt className="text-xs uppercase text-zinc-500">E-mail</dt>
                <dd className="mt-1 text-zinc-700 dark:text-zinc-300">{appt.client.email}</dd>
              </div>
            )}
            {appt.client.phone && (
              <div>
                <dt className="text-xs uppercase text-zinc-500">Telefoon</dt>
                <dd className="mt-1 text-zinc-700 dark:text-zinc-300">{appt.client.phone}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Waitlist claim — only shown when this appointment was filled via the waitlist */}
        {claimedSlot && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-800 dark:bg-emerald-950/30">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
              <Zap className="h-4 w-4" />
              Omzet teruggewonnen via de wachtlijst
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              {claimLog && (
                <div>
                  <dt className="text-xs uppercase text-emerald-700 dark:text-emerald-400">Opnieuw ingevuld op</dt>
                  <dd className="mt-1 text-emerald-900 dark:text-emerald-200">
                    {new Date(claimLog.createdAt).toLocaleString("nl-NL", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </dd>
                </div>
              )}
              {claimedSlot.sourceAppointment && (
                <div>
                  <dt className="text-xs uppercase text-emerald-700 dark:text-emerald-400">Vrijgekomen via</dt>
                  <dd className="mt-1 text-emerald-900 dark:text-emerald-200">
                    Annulering op{" "}
                    {new Date(claimedSlot.sourceAppointment.startTime).toLocaleString("nl-NL", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </dd>
                  <dd className="mt-1">
                    <Link
                      href={`/appointments/${claimedSlot.sourceAppointment.id}`}
                      className="text-xs text-emerald-700 underline hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300"
                    >
                      Bekijk geannuleerde afspraak →
                    </Link>
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs uppercase text-emerald-700 dark:text-emerald-400">Open plek aangemaakt</dt>
                <dd className="mt-1 text-emerald-900 dark:text-emerald-200">
                  {new Date(claimedSlot.createdAt).toLocaleString("nl-NL", {
                    day: "numeric",
                    month: "long",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </dd>
              </div>
            </dl>
          </div>
        )}

        {/* Recovered slot — shown on the cancelled appointment whose freed slot was claimed */}
        {recoveredDetail && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-800 dark:bg-emerald-950/30">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
              <TrendingUp className="h-4 w-4" />
              Omzet teruggewonnen via de wachtlijst
            </h2>
            <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
              Deze omzet was anders verloren gegaan — nu automatisch hersteld
            </p>
            <p className="mt-1 text-xs font-medium text-emerald-800 dark:text-emerald-300">
              {recoveredDetail.fillTime}
            </p>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-xs uppercase text-emerald-700 dark:text-emerald-400">Patiënt</dt>
                <dd className="mt-1 font-medium text-emerald-900 dark:text-emerald-200">
                  {recoveredDetail.newAppointmentId ? (
                    <Link
                      href={`/appointments/${recoveredDetail.newAppointmentId}`}
                      className="underline hover:text-emerald-700 dark:hover:text-emerald-300"
                    >
                      {recoveredDetail.clientName}
                    </Link>
                  ) : (
                    recoveredDetail.clientName
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-emerald-700 dark:text-emerald-400">Opnieuw ingevuld op</dt>
                <dd className="mt-1 text-emerald-900 dark:text-emerald-200">
                  {fmt(recoveredDetail.claimedAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-emerald-700 dark:text-emerald-400">Originele plek</dt>
                <dd className="mt-1 text-emerald-900 dark:text-emerald-200">
                  {fmt(recoveredDetail.slotStartTime)}
                </dd>
              </div>
              <div className="border-t border-emerald-200 pt-3 dark:border-emerald-800">
                <dt className="text-xs uppercase text-emerald-700 dark:text-emerald-400">Teruggewonnen omzet</dt>
                <dd className="mt-1 font-mono font-semibold text-emerald-900 dark:text-emerald-200">
                  €{((Number.isFinite(recoveredDetail.revenueEstimateCents) ? recoveredDetail.revenueEstimateCents : 0) / 100).toFixed(2)} teruggewonnen
                </dd>
              </div>
            </dl>
          </div>
        )}

        {/* Practitioner + Notes */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-1">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Details</h2>

          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-xs uppercase text-zinc-500">Behandelaar</dt>
              <dd className="mt-1 text-zinc-700 dark:text-zinc-300">
                {appt.practitioner.firstName} {appt.practitioner.lastName}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-zinc-500">Notities</dt>
              <dd className="mt-1 whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
                {appt.notes ?? "—"}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {(() => {
        const sourceId =
          claimedSlot?.sourceAppointment?.id ?? (recoveredDetail ? appt.id : null);
        if (!sourceId) return null;

        // Recovery duration in minutes, derived from whichever side of the flow
        // this appointment is on. Both branches reduce to the same window:
        // (slot freed → slot claimed).
        let fillMinutes: number | null = null;
        if (claimedSlot && claimLog) {
          fillMinutes = Math.max(
            0,
            Math.round(
              (new Date(claimLog.createdAt).getTime() -
                new Date(claimedSlot.createdAt).getTime()) /
                60_000,
            ),
          );
        } else if (recoveredDetail) {
          // recoveredDetail.fillTime is a localized string, but we have raw
          // timestamps available via recoveredSlot + recoveredDetail.claimedAt.
          fillMinutes = Math.max(
            0,
            Math.round(
              (new Date(recoveredDetail.claimedAt).getTime() -
                new Date(recoveredSlot!.createdAt).getTime()) /
                60_000,
            ),
          );
        }

        const headline = (() => {
          if (fillMinutes === null) {
            return "Deze geannuleerde afspraak werd automatisch opnieuw ingevuld via de wachtlijst — zonder tussenkomst van de praktijk.";
          }
          if (fillMinutes < 1) {
            return "Deze geannuleerde afspraak werd binnen 1 minuut automatisch opnieuw ingevuld via de wachtlijst — zonder tussenkomst van de praktijk.";
          }
          if (fillMinutes < 60) {
            const unit = fillMinutes === 1 ? "minuut" : "minuten";
            return `Deze geannuleerde afspraak werd binnen ${fillMinutes} ${unit} automatisch opnieuw ingevuld via de wachtlijst — zonder tussenkomst van de praktijk.`;
          }
          if (fillMinutes < 1440) {
            const hours = Math.round(fillMinutes / 60);
            const unit = hours === 1 ? "uur" : "uur";
            return `Deze geannuleerde afspraak werd binnen ${hours} ${unit} automatisch opnieuw ingevuld via de wachtlijst — zonder tussenkomst van de praktijk.`;
          }
          const days = Math.round(fillMinutes / 1440);
          const unit = days === 1 ? "dag" : "dagen";
          return `Deze geannuleerde afspraak werd binnen ${days} ${unit} automatisch opnieuw ingevuld via de wachtlijst — zonder tussenkomst van de praktijk.`;
        })();

        // ── Fill-time label for step 3 of the mini logic diagram ─────────
        const stepThreeFillLabel = (() => {
          if (fillMinutes === null) return "Automatisch opnieuw ingevuld";
          if (fillMinutes < 1) return "Binnen 1 minuut opnieuw ingevuld";
          if (fillMinutes < 60) {
            const unit = fillMinutes === 1 ? "minuut" : "minuten";
            return `Binnen ${fillMinutes} ${unit} opnieuw ingevuld`;
          }
          if (fillMinutes < 1440) {
            const hours = Math.round(fillMinutes / 60);
            return `Binnen ${hours} uur opnieuw ingevuld`;
          }
          const days = Math.round(fillMinutes / 1440);
          const unit = days === 1 ? "dag" : "dagen";
          return `Binnen ${days} ${unit} opnieuw ingevuld`;
        })();

        // ── Revenue "behouden" line — uses the same cents source as the
        // emerald side-panel so the number stays consistent across the page.
        const recoveredCents =
          recoveredDetail?.revenueEstimateCents ?? appt.revenueEstimateCents ?? 0;
        const recoveredLabel =
          recoveredCents > 0
            ? `€${(recoveredCents / 100).toFixed(2).replace(".", ",")} omzet behouden die anders verloren was gegaan`
            : "Omzet behouden die anders verloren was gegaan";

        return (
          <div className="mt-6">
            <div className="mb-3 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-100/60 p-4 dark:border-emerald-800 dark:from-emerald-900/30 dark:to-emerald-900/10">
              <p className="text-base font-semibold text-emerald-900 dark:text-emerald-200">
                {headline}
              </p>

              {/* 3-step logic — text only, no new page, no tooltip. Reinforces
                  the automatic-recovery narrative with zero ambiguity. */}
              <ol className="mt-3 grid gap-2 text-sm text-emerald-900 dark:text-emerald-200 sm:grid-cols-3">
                <li className="flex items-start gap-2">
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-semibold text-white">
                    1
                  </span>
                  <span>Afspraak geannuleerd</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-semibold text-white">
                    2
                  </span>
                  <span>Automatisch aangeboden aan wachtlijst</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-semibold text-white">
                    3
                  </span>
                  <span>{stepThreeFillLabel}</span>
                </li>
              </ol>

              {/* Revenue-behouden line — the punchline under the 3-step list. */}
              <p className="mt-3 border-t border-emerald-200 pt-3 text-sm font-semibold text-emerald-900 dark:border-emerald-800 dark:text-emerald-200">
                {recoveredLabel}
              </p>

              {/* Conversion moment — placed INSIDE the emerald block so the
                  CTA rides the same narrative as the wow-moment above. No
                  new layout primitive, no new component; buttons reuse the
                  existing primary/secondary patterns from the landing hero. */}
              <div className="mt-4 border-t border-emerald-200 pt-4 dark:border-emerald-800">
                <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                  Wilt u dit ook automatisch in uw praktijk?
                </p>
                <p className="mt-1 text-xs text-emerald-800/90 dark:text-emerald-300/90">
                  Start binnen 1 dag — geen technische installatie nodig.
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Link
                    href="/pricing"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                  >
                    Start met terugwinnen (€79 / maand)
                  </Link>
                  <Link
                    href="mailto:demo@noshowcontrol.nl?subject=Demo%20aanvraag"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700"
                  >
                    Plan korte demo
                  </Link>
                </div>
              </div>
            </div>
            <RecoveryTimeline
              practiceId={appt.practiceId}
              sourceAppointmentId={sourceId}
              currentAppointmentId={appt.id}
            />
          </div>
        );
      })()}
    </div>
  );
}
