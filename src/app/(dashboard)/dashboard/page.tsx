"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Inbox,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";

type AutomationCategory = "open" | "in_progress" | "filled" | "action_needed";

interface AutomationDashboardItem {
  id: string;
  category: AutomationCategory;
  priority: "high" | "normal" | "low";
  title: string;
  description: string;
  statusLabel: string;
  slotStatus: string;
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

interface DashboardData {
  automation: {
    summary: {
      open: number;
      inProgress: number;
      filled: number;
      actionNeeded: number;
    };
    worklist: AutomationDashboardItem[];
  };
  userName: string | null;
  degraded?: boolean;
}

const CATEGORY_COPY: Record<
  AutomationCategory,
  {
    label: string;
    description: string;
    icon: typeof Inbox;
    cardClass: string;
    badgeClass: string;
  }
> = {
  open: {
    label: "Open plekken",
    description: "Beschikbaar en klaar om aan de wachtlijst aan te bieden.",
    icon: Inbox,
    cardClass: "border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900",
    badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  in_progress: {
    label: "In behandeling",
    description: "Aanbod loopt; er wordt gewacht op reactie.",
    icon: Clock3,
    cardClass: "border-blue-200 bg-blue-50/60 dark:border-blue-900/50 dark:bg-blue-950/20",
    badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  filled: {
    label: "Ingevuld",
    description: "Geclaimd binnen NoShow Control.",
    icon: CheckCircle2,
    cardClass: "border-teal-200 bg-teal-50/60 dark:border-teal-900/50 dark:bg-teal-950/20",
    badgeClass: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  },
  action_needed: {
    label: "Actie nodig",
    description: "Uitzonderingen die de praktijk moet beoordelen.",
    icon: AlertTriangle,
    cardClass: "border-amber-200 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/20",
    badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  },
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function categoryCount(data: DashboardData, category: AutomationCategory): number {
  if (category === "open") return data.automation.summary.open;
  if (category === "in_progress") return data.automation.summary.inProgress;
  if (category === "filled") return data.automation.summary.filled;
  return data.automation.summary.actionNeeded;
}

function WorklistEmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-6 py-10 text-center dark:border-zinc-700 dark:bg-zinc-900">
      <CheckCircle2 className="mx-auto h-8 w-8 text-teal-600 dark:text-teal-400" />
      <h2 className="mt-3 text-sm font-semibold text-zinc-900 dark:text-white">
        Geen lopende open plekken
      </h2>
      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-zinc-500 dark:text-zinc-400">
        Zodra een afspraak wordt geannuleerd, als no-show wordt gemarkeerd of handmatig als open plek wordt
        aangemaakt, verschijnt deze hier.
      </p>
      <Link
        href="/open-slots/new"
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        Nieuwe open plek
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export default function DashboardPage() {
  const { profile } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error("Dashboard kon niet geladen worden");
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dashboard kon niet geladen worden");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  const sortedWorklist = useMemo(() => data?.automation.worklist ?? [], [data]);

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          Dashboard laden...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-lg border border-red-200 bg-red-50 p-8 text-center dark:border-red-900/50 dark:bg-red-950/20">
        <AlertTriangle className="h-8 w-8 text-red-500" />
        <p className="text-sm font-medium text-red-700 dark:text-red-300">
          {error ?? "Dashboard kon niet geladen worden"}
        </p>
        <button
          type="button"
          onClick={() => void loadDashboard()}
          className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:border-red-900/60 dark:bg-zinc-950 dark:text-red-300"
        >
          <RefreshCw className="h-4 w-4" />
          Opnieuw proberen
        </button>
      </div>
    );
  }

  const greetingName = data.userName ?? profile?.firstName ?? "collega";
  const categories: AutomationCategory[] = ["action_needed", "open", "in_progress", "filled"];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Automation First</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-zinc-950 dark:text-white">
            Goedemorgen, {greetingName}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Zie direct welke plekken automatisch worden opgevolgd en waar de praktijk moet ingrijpen.
            Statussen zijn gebaseerd op bestaande open plekken, aanbiedingen en claims.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadDashboard()}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <RefreshCw className="h-4 w-4" />
          Vernieuwen
        </button>
      </header>

      {data.degraded && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Dashboardgegevens konden niet volledig worden geladen. Probeer te vernieuwen of controleer later opnieuw.
        </div>
      )}

      <section aria-labelledby="automation-summary-heading">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="automation-summary-heading" className="text-base font-semibold text-zinc-950 dark:text-white">
            Overzicht
          </h2>
          <Link
            href="/open-slots"
            className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-800 dark:text-blue-300"
          >
            Alle open plekken
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {categories.map((category) => {
            const copy = CATEGORY_COPY[category];
            const Icon = copy.icon;
            const count = categoryCount(data, category);
            return (
              <article
                key={category}
                className={`rounded-lg border p-4 shadow-sm ${copy.cardClass}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">
                      {copy.label}
                    </h3>
                    <p className="mt-1 min-h-10 text-xs leading-5 text-zinc-600 dark:text-zinc-400">
                      {copy.description}
                    </p>
                  </div>
                  <span className={`rounded-lg p-2 ${copy.badgeClass}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-3 text-2xl font-semibold tabular-nums text-zinc-950 dark:text-white">
                  {count}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="worklist-heading">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="worklist-heading" className="text-base font-semibold text-zinc-950 dark:text-white">
              Werklijst
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Belangrijkste uitzonderingen staan bovenaan. Technische details staan ingeklapt.
            </p>
          </div>
          <Link
            href="/waitlist?status=WAITING"
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <Search className="h-4 w-4" />
            Wachtlijst bekijken
          </Link>
        </div>

        {sortedWorklist.length === 0 ? (
          <WorklistEmptyState />
        ) : (
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {sortedWorklist.map((item) => {
                const copy = CATEGORY_COPY[item.category];
                const hasException = item.category === "action_needed";
                return (
                  <li key={item.id} className="p-3 sm:p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${copy.badgeClass}`}>
                            {copy.label}
                          </span>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            {formatDateTime(item.startTime)}
                          </span>
                          {hasException && (
                            <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300">
                              Controle nodig
                            </span>
                          )}
                        </div>
                        <h3 className="mt-2 text-sm font-semibold text-zinc-950 dark:text-white">
                          {item.title}
                        </h3>
                        <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                          {item.description}
                        </p>

                        <dl className="mt-3 grid gap-2 text-xs text-zinc-500 sm:grid-cols-2 lg:grid-cols-4 dark:text-zinc-400">
                          <div>
                            <dt className="font-medium text-zinc-700 dark:text-zinc-300">Status</dt>
                            <dd>{item.statusLabel}</dd>
                          </div>
                          <div>
                            <dt className="font-medium text-zinc-700 dark:text-zinc-300">Behandelaar</dt>
                            <dd>{item.practitionerName}</dd>
                          </div>
                          <div>
                            <dt className="font-medium text-zinc-700 dark:text-zinc-300">Type</dt>
                            <dd>{item.appointmentTypeName ?? "Niet ingesteld"}</dd>
                          </div>
                          <div>
                            <dt className="font-medium text-zinc-700 dark:text-zinc-300">Aanbiedingen</dt>
                            <dd>
                              {item.offerSummary.total === 0
                                ? "Geen"
                                : `${item.offerSummary.total} totaal`}
                            </dd>
                          </div>
                        </dl>

                        <details className="mt-3">
                          <summary className="cursor-pointer text-xs font-medium text-blue-700 hover:text-blue-800 dark:text-blue-300">
                            Details tonen
                          </summary>
                          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                            {item.details.map((detail) => (
                              <li key={detail}>{detail}</li>
                            ))}
                            {item.offerSummary.sent > 0 && (
                              <li>
                                Verzonden betekent dat verzending is geregistreerd; dit is geen afleverbevestiging.
                              </li>
                            )}
                          </ul>
                        </details>
                      </div>

                      <Link
                        href={item.href}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 lg:min-w-40"
                      >
                        {item.primaryActionLabel}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
