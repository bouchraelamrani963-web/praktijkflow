"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  CalendarClock,
  TrendingUp,
  ArrowRight,
  Sparkles,
  TrendingDown,
  Scale,
} from "lucide-react";
import { SlotFillPanel } from "@/components/dashboard/SlotFillPanel";
import { STATUS_LABELS, RISK_LABELS, TYPE_LABELS } from "@/lib/labels";

interface DashboardData {
  kpis: {
    appointmentsToday: number;
    totalClients: number;
    scheduled: number;
    confirmed: number;
    cancelled: number;
    noShow: number;
    completed: number;
    openSlotsCreated: number;
    openSlotsClaimed: number;
    revenueThisMonthCents: number;
    recoveredRevenueCents: number;
    recoveredRevenueThisMonthCents: number;
    missedRevenueThisMonthCents: number;
    netLossThisMonthCents: number;
    /** "Vandaag in je praktijk" — today-scoped figures, present from API onward. */
    noShowsToday?: number;
    revenueTodayCents?: number;
  };
  highRiskUpcoming: {
    id: string;
    startTime: string;
    riskLevel: string;
    client: { id: string; firstName: string; lastName: string };
    practitioner: { id: string; firstName: string; lastName: string };
    appointmentType: { name: string } | null;
  }[];
  recentCancellations: {
    id: string;
    updatedAt: string;
    client: { firstName: string; lastName: string };
    appointmentType: { name: string } | null;
  }[];
  recentOpenSlots: {
    id: string;
    startTime: string;
    status: string;
    createdAt: string;
    practitioner: { firstName: string; lastName: string };
    appointmentType: { id: string; name: string } | null;
    claimedAppointmentId: string | null;
  }[];
  userName: string | null;
  demoMode?: boolean;
}

function formatCents(cents: number | null | undefined): string {
  // Defensive: a null, undefined, or non-finite value must never render as
  // "€NaN" on screen. Coerce to 0 and format normally.
  const safe = Number.isFinite(cents as number) ? (cents as number) : 0;
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(safe / 100);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function riskBadge(level: string) {
  const cls =
    level === "CRITICAL"
      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {RISK_LABELS[level] ?? level}
    </span>
  );
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    AVAILABLE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    CLAIMED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    EXPIRED: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? map.EXPIRED}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export default function DashboardPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then(async (res) => {
        if (!res.ok) throw new Error("Dashboard kon niet geladen worden");
        return res.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <AlertTriangle className="h-8 w-8 text-red-400" />
        <p className="text-sm text-red-600">{error ?? "Dashboard kon niet geladen worden"}</p>
        <button
          onClick={() => { setError(null); setLoading(true); fetch("/api/dashboard").then(async (res) => { if (!res.ok) throw new Error("Dashboard kon niet geladen worden"); return res.json(); }).then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false)); }}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Opnieuw proberen
        </button>
      </div>
    );
  }

  const k = data.kpis;

  // Local-date YYYY-MM-DD (sv-SE locale format matches the HTML <input type="date"> value).
  const todayIso = new Date().toLocaleDateString("sv-SE");

  // Fill rate — “Invulpercentage” in the revenue framing. Safely handle the
  // 0-denominator case so an empty practice doesn’t show NaN%.
  const fillPct =
    k.openSlotsCreated > 0
      ? Math.round((k.openSlotsClaimed / k.openSlotsCreated) * 100)
      : 0;

  type KpiCard = {
    label: string;
    value: string | number;
    icon: typeof Calendar;
    href: string;
    subtitle?: string;
  };

  const kpiCards: KpiCard[] = [
    // ─── Revenue trio FIRST — the money answer comes before operational data.
    // Order per conversion brief: Teruggewonnen → Gemiste → Netto.
    {
      label: "Teruggewonnen omzet",
      value: formatCents(k.recoveredRevenueThisMonthCents),
      icon: Sparkles,
      href: "/open-slots?status=CLAIMED",
      subtitle: "Omzet die anders verloren was gegaan — automatisch hersteld",
    },
    {
      label: "Gemiste omzet",
      value: formatCents(k.missedRevenueThisMonthCents),
      icon: TrendingDown,
      href: "/appointments?status=CANCELLED",
      subtitle: "Omzet verloren door no-shows en annuleringen",
    },
    {
      label: "Netto winst na herstel",
      value: formatCents(k.netLossThisMonthCents),
      icon: Scale,
      href: "/appointments?status=CANCELLED",
      subtitle: "Wat u daadwerkelijk verliest na herstel via de wachtlijst",
    },
    {
      label: "Invulpercentage",
      value: `${fillPct}%`,
      icon: CalendarClock,
      href: "/open-slots",
      subtitle: "Hoeveel vrijgekomen plekken opnieuw zijn ingevuld",
    },
    { label: "Omzet (maand)", value: formatCents(k.revenueThisMonthCents), icon: TrendingUp, href: "/appointments?status=COMPLETED" },
    // ─── Operationele metrics onderaan — nuttig, maar niet de hoofdboodschap.
    { label: "Afspraken vandaag", value: k.appointmentsToday, icon: Calendar, href: `/appointments?dateFrom=${todayIso}&dateTo=${todayIso}` },
    { label: "Gepland", value: k.scheduled, icon: Calendar, href: "/appointments?status=SCHEDULED" },
    { label: "Bevestigd", value: k.confirmed, icon: CheckCircle2, href: "/appointments?status=CONFIRMED" },
    { label: "Geannuleerd (maand)", value: k.cancelled, icon: XCircle, href: "/appointments?status=CANCELLED" },
    { label: "Niet verschenen (maand)", value: k.noShow, icon: AlertTriangle, href: "/appointments?status=NO_SHOW" },
    { label: "Totaal patiënten", value: k.totalClients, icon: Users, href: "/patients" },
  ];

  // ─── T5: in demo mode we only show the revenue quartet. Operational
  // metrics are noise for a first-time viewer who needs to grasp the
  // money story in under 2 minutes. Keeps ONLY the first four cards.
  const visibleKpiCards = data.demoMode ? kpiCards.slice(0, 4) : kpiCards;

  return (
    <div>
      {/* Demo-mode banner — frames the whole dashboard as a live recovery
          scenario. Keeps the user anchored in the "money just came back"
          narrative from second 1. */}
      <div
        role="status"
        className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200"
      >
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" />
        <span>
          <span className="font-semibold">Demo:</span> u ziet een praktijk waarin
          zojuist een annulering automatisch is opgevuld.
        </span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Welkom terug, {data.userName ?? profile?.firstName ?? "collega"}
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Hier is een overzicht van je praktijk.
        </p>
      </div>

      {/* "Vandaag in je praktijk" — three at-a-glance numbers scoped to today.
          Helps the user orient themselves the moment they open the dashboard:
          how busy is today, how many no-shows so far, what was actually billed.
          Each card links into the appointments list pre-filtered for context. */}
      <section className="mb-8" aria-labelledby="today-heading">
        <h2 id="today-heading" className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Vandaag in je praktijk
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link
            href={`/appointments?dateFrom=${todayIso}&dateTo=${todayIso}`}
            className="group rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-blue-700"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-600 dark:text-zinc-400">Afspraken vandaag</span>
              <Calendar className="h-4 w-4 text-blue-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">{k.appointmentsToday ?? 0}</p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
              {k.appointmentsToday > 0 ? "Bekijk alle afspraken van vandaag" : "Geen afspraken gepland"}
            </p>
          </Link>

          <Link
            href={`/appointments?status=NO_SHOW&dateFrom=${todayIso}&dateTo=${todayIso}`}
            className="group rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-amber-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-amber-700"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-600 dark:text-zinc-400">No-shows vandaag</span>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">{k.noShowsToday ?? 0}</p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
              {(k.noShowsToday ?? 0) > 0 ? "Plekken in te vullen vanuit wachtlijst" : "Alles op koers"}
            </p>
          </Link>

          <Link
            href={`/appointments?status=COMPLETED&dateFrom=${todayIso}&dateTo=${todayIso}`}
            className="group rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-emerald-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-700"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-600 dark:text-zinc-400">Omzet vandaag</span>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">{formatCents(k.revenueTodayCents)}</p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
              Som van afgeronde afspraken vandaag
            </p>
          </Link>
        </div>
      </section>

      {/* Prominent recovered-revenue banner — the headline number for the month.
          T4: force the click through router.push so the user always lands on
          /open-slots?status=CLAIMED, then scroll the first CLAIMED row into
          view so the guided demo flow never dead-ends on an empty viewport. */}
      <button
        type="button"
        onClick={() => {
          router.push("/open-slots?status=CLAIMED#scroll-claimed");
          // Post-navigation scroll is handled by the target page. We also
          // hint scroll here in case the user is already on /open-slots.
          if (typeof window !== "undefined") {
            window.requestAnimationFrame(() => {
              const el = document.querySelector<HTMLElement>(
                "[data-slot-status='CLAIMED']",
              );
              if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
            });
          }
        }}
        aria-label="Bekijk geclaimde plekken deze maand"
        className="group mb-6 block w-full overflow-hidden rounded-2xl border border-emerald-300/60 bg-gradient-to-r from-emerald-500 via-emerald-500 to-teal-500 p-6 text-left shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400/30 transition hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white dark:from-emerald-600 dark:via-emerald-600 dark:to-teal-600"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/30">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-50/90">
                Extra omzet teruggewonnen
              </p>
              <p className="mt-0.5 text-3xl font-bold text-white sm:text-4xl">
                {formatCents(k.recoveredRevenueThisMonthCents)}
                <span className="ml-2 text-base font-semibold text-emerald-50/90">
                  deze maand
                </span>
              </p>
              {/* Money-framing sub-copy: first line tells the user WHAT this
                  number represents ("omzet die anders verloren was gegaan"),
                  second line tells them HOW it got here. This is the 3-second
                  comprehension target. */}
              <p className="mt-1 text-sm font-medium text-white">
                Dit is omzet die anders verloren was gegaan
              </p>
              <p className="mt-0.5 text-xs text-emerald-50/90">
                Volledig automatisch via de wachtlijst — zonder bellen, zonder
                handmatig plannen. Uit {k.openSlotsClaimed} opnieuw ingevulde plek
                {k.openSlotsClaimed === 1 ? "" : "ken"}.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-white/15 px-3 py-2 text-sm font-medium text-white ring-1 ring-white/20 transition group-hover:bg-white/25">
            Bekijk hoe dit werkt
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </div>
        </div>
      </button>

      {/* Pricing reinforcement — converts the recovered-revenue banner into a
          cost/benefit frame. Rendered inline using dashboard data only; no
          new page, no popup, no new component surface. */}
      <PricingReinforcement
        recoveredCents={k.recoveredRevenueThisMonthCents}
        planCostEuros={79}
      />

      {/* KPI cards — each navigates to /appointments */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {visibleKpiCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            aria-label={`${card.label} — bekijk afspraken`}
            className="group block cursor-pointer rounded-xl border border-zinc-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-blue-500"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">{card.label}</span>
              <card.icon className="h-5 w-5 text-zinc-400 transition group-hover:text-blue-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">{card.value}</p>
            {card.subtitle && (
              <p className="mt-1 text-xs leading-snug text-zinc-500 dark:text-zinc-400">
                {card.subtitle}
              </p>
            )}
          </Link>
        ))}
      </div>

      {/* Activity panels */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* High-risk upcoming */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
          <div className="flex items-center justify-between">
            <Link
              href="/appointments?riskLevel=HIGH"
              className="text-lg font-semibold text-zinc-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
            >
              Afspraken met hoog risico
            </Link>
            <AlertTriangle className="h-5 w-5 text-orange-400" />
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Klik om details te zien.
          </p>
          {data.highRiskUpcoming.length === 0 ? (
            <div className="mt-4 flex h-32 items-center justify-center text-zinc-400">
              Geen risicovolle afspraken in de komende 7 dagen
            </div>
          ) : (
            <ul className="mt-4 space-y-1">
              {data.highRiskUpcoming.map((apt) => (
                <li key={apt.id}>
                  <Link
                    href={`/appointments/${apt.id}`}
                    className="flex items-center justify-between gap-2 rounded-lg p-2 transition hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">
                        {apt.client.firstName} {apt.client.lastName}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {formatDate(apt.startTime)} {formatTime(apt.startTime)}
                        {apt.appointmentType ? ` — ${TYPE_LABELS[apt.appointmentType.name] ?? apt.appointmentType.name}` : ""}
                      </p>
                    </div>
                    {riskBadge(apt.riskLevel)}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent cancellations */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
          <div className="flex items-center justify-between">
            <Link
              href="/appointments?status=CANCELLED"
              className="text-lg font-semibold text-zinc-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
            >
              Recente annuleringen
            </Link>
            <XCircle className="h-5 w-5 text-red-400" />
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Klik om te zien hoe de plek opnieuw is ingevuld.
          </p>
          {data.recentCancellations.length === 0 ? (
            <div className="mt-4 flex h-32 items-center justify-center text-zinc-400">
              Geen annuleringen in de afgelopen 7 dagen
            </div>
          ) : (
            <ul className="mt-4 space-y-1">
              {data.recentCancellations.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/appointments/${c.id}`}
                    className="flex items-center justify-between gap-2 rounded-lg p-2 transition hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">
                        {c.client.firstName} {c.client.lastName}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {c.appointmentType ? (TYPE_LABELS[c.appointmentType.name] ?? c.appointmentType.name) : "Afspraak"} — geannuleerd{" "}
                        {formatDate(c.updatedAt)}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-zinc-300 group-hover:text-zinc-500" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent open slots */}
        <div id="recent-open-slots" className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800 lg:col-span-2">
          <div className="flex items-center justify-between">
            <Link
              href="/open-slots"
              className="text-lg font-semibold text-zinc-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
            >
              Recente open plekken
            </Link>
            <CalendarClock className="h-5 w-5 text-blue-400" />
          </div>
          {/* Step-1 micro-guidance — points the user at the next node in the
              guided demo flow (dashboard → CLAIMED row → appointment detail). */}
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Klik op een ingevulde plek om te zien hoe deze omzet is teruggewonnen.
          </p>
          {data.recentOpenSlots.length === 0 ? (
            <div className="mt-4 flex h-32 items-center justify-center px-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Geen openstaande plekken — goed teken, er gaat momenteel geen omzet verloren
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-700">
                    <th className="pb-2 font-medium">Behandelaar</th>
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 font-medium">Tijd</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {data.recentOpenSlots.map((slot) => {
                    // Route by status — identical logic to OpenSlotsList so
                    // behaviour is consistent across surfaces.
                    const target =
                      slot.status === "CLAIMED" && slot.claimedAppointmentId
                        ? `/appointments/${slot.claimedAppointmentId}`
                        : slot.status === "AVAILABLE"
                          ? `/waitlist?status=WAITING${
                              slot.appointmentType
                                ? `&appointmentTypeId=${slot.appointmentType.id}`
                                : ""
                            }`
                          : null;
                    return (
                      <tr
                        key={slot.id}
                        className={`transition ${
                          target
                            ? "cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
                            : ""
                        }`}
                        onClick={target ? () => router.push(target) : undefined}
                      >
                        <td className="py-2 text-zinc-900 dark:text-white">
                          {slot.practitioner.firstName} {slot.practitioner.lastName}
                        </td>
                        <td className="py-2 text-zinc-600 dark:text-zinc-400">
                          {slot.appointmentType ? (TYPE_LABELS[slot.appointmentType.name] ?? slot.appointmentType.name) : "—"}
                        </td>
                        <td className="py-2 text-zinc-600 dark:text-zinc-400">
                          {formatDate(slot.startTime)} {formatTime(slot.startTime)}
                        </td>
                        <td className="py-2">{statusBadge(slot.status)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Waitlist / slot-fill metrics + demo + log viewer */}
      <SlotFillPanel
        isAdmin={profile?.role === "OWNER" || profile?.role === "ADMIN"}
        isDemoMode={!!data.demoMode}
      />
    </div>
  );
}

/**
 * Dashboard pricing reinforcement — frames the monthly subscription as an
 * investment against real recovered revenue. No popup, no new page, no new
 * component surface; rendered inline inside the existing dashboard layout.
 *
 * Uses `recoveredRevenueThisMonthCents` straight from the KPI payload so the
 * numbers are always consistent with the headline banner above.
 */
function PricingReinforcement({
  recoveredCents,
  planCostEuros,
}: {
  recoveredCents: number | null | undefined;
  planCostEuros: number;
}) {
  // Guard against null / undefined / NaN so the reinforcement strip never
  // renders "€NaN". Treat missing data as 0 recovered.
  const safeRecoveredCents = Number.isFinite(recoveredCents as number)
    ? (recoveredCents as number)
    : 0;
  const recoveredEuros = safeRecoveredCents / 100;
  const netEuros = recoveredEuros - planCostEuros;
  const isPositive = netEuros > 0;

  return (
    <div
      aria-label="Pricing terugverdien-overzicht"
      className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/60"
    >
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 text-sm">
        <div>
          <span className="text-zinc-600 dark:text-zinc-400">Deze maand teruggewonnen:</span>{" "}
          <span className="text-base font-semibold text-emerald-700 dark:text-emerald-300">
            {formatCents(safeRecoveredCents)}
          </span>
        </div>
        <div>
          <span className="text-zinc-600 dark:text-zinc-400">Kosten PraktijkFlow:</span>{" "}
          <span className="text-base font-semibold text-zinc-900 dark:text-white">
            €{planCostEuros}
          </span>
        </div>
        <div>
          <span className="text-zinc-600 dark:text-zinc-400">Netto winst na herstel:</span>{" "}
          <span
            className={`text-base font-semibold ${
              isPositive
                ? "text-emerald-700 dark:text-emerald-300"
                : "text-zinc-900 dark:text-white"
            }`}
          >
            {isPositive ? "+" : ""}
            {formatCents(Math.round(netEuros * 100))}
          </span>
        </div>
      </div>
      <Link
        href="/pricing"
        className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-blue-400 hover:text-blue-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
      >
        Bekijk abonnementen
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
