"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  PlayCircle,
  Loader2,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  CalendarX,
  Send,
  CheckCheck,
  Clock3,
  Euro,
} from "lucide-react";

interface Metrics {
  slotsFreed: number;
  offersSent: number;
  slotsFilled: number;
  fillRate: number;
  avgMinutesToFill: number | null;
  recoveredRevenueCents: number;
}

function formatEuros(cents: number | null | undefined) {
  // Defensive: null/undefined/NaN must never render as "€NaN". Coerce to 0.
  const safe = Number.isFinite(cents as number) ? (cents as number) : 0;
  return `€${(safe / 100).toFixed(0)}`;
}

interface LogItem {
  id: string;
  action: string;
  outcome: string;
  createdAt: string;
  clientName: string | null;
  details: string | null;
}

interface DemoResult {
  ok: boolean;
  demoTag: string;
  appointmentId: string;
  slotId: string | null;
  offers: { tokenId: string; clientName: string; expiresAt: string; used: boolean }[];
  steps: string[];
}

const ACTION_LABELS: Record<string, string> = {
  slot_freed: "Plek vrijgekomen",
  auto_offer_sent: "Aanbod verstuurd",
  auto_offer_skipped: "Aanbod overgeslagen",
  claim_open_slot: "Plek opnieuw ingevuld",
};

// Outcome strings come from the ActionLog table as raw tokens (success,
// cooldown, expired, sent, mock, failed, skipped). Render-time Dutch labels
// so the demo viewer sees narrative, not database enums.
const OUTCOME_LABELS: Record<string, string> = {
  success: "Gelukt",
  sent: "Verstuurd",
  mock: "Verstuurd (test)",
  cooldown: "Wachttijd actief",
  expired: "Verlopen",
  skipped: "Overgeslagen",
  failed: "Mislukt",
};

const ACTION_ICON: Record<string, typeof CalendarX> = {
  slot_freed: CalendarX,
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

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("nl-NL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SlotFillPanel({
  isAdmin,
  isDemoMode = false,
}: {
  isAdmin: boolean;
  /** Demo mode suppresses the red error card — the demo flow must never
   *  render a failure state, even if the metrics endpoint hiccups. */
  isDemoMode?: boolean;
}) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [logs, setLogs] = useState<LogItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [demoState, setDemoState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [demoResult, setDemoResult] = useState<DemoResult | null>(null);
  const [demoError, setDemoError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [mRes, lRes] = await Promise.all([
        fetch("/api/admin/slot-metrics"),
        isAdmin ? fetch("/api/admin/action-log?limit=10") : Promise.resolve(null),
      ]);

      if (!mRes.ok) throw new Error("Cijfers konden niet geladen worden");
      const m: Metrics = await mRes.json();
      setMetrics(m);

      if (lRes && lRes.ok) {
        const l = await lRes.json();
        setLogs(l.items ?? []);
      } else {
        setLogs(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fout bij laden");
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  async function runDemo() {
    setDemoState("loading");
    setDemoError(null);
    setDemoResult(null);
    try {
      const res = await fetch("/api/admin/demo-scenario", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      const data: DemoResult = await res.json();
      setDemoResult(data);
      setDemoState("ok");
      // Refresh metrics + logs to show the new activity
      await load();
    } catch (err) {
      setDemoState("error");
      setDemoError(err instanceof Error ? err.message : "Onbekende fout");
    }
  }

  // T6: wrap the whole metrics payload so every per-field read is guarded.
  // A missing metrics endpoint must not crash the panel in demo mode.
  const safeData = metrics ?? {
    slotsFreed: 0,
    offersSent: 0,
    slotsFilled: 0,
    fillRate: 0,
    avgMinutesToFill: null,
    recoveredRevenueCents: 0,
  };

  const metricCards = (metrics || isDemoMode)
    ? [
        { label: "Vrijgekomen plekken",    value: safeData.slotsFreed ?? 0,   icon: CalendarX,  color: "text-red-500",     href: "/open-slots" },
        { label: "Verstuurde aanbiedingen", value: safeData.offersSent ?? 0,   icon: Send,        color: "text-blue-500",    href: "/waitlist" },
        { label: "Opnieuw ingevulde plekken", value: safeData.slotsFilled ?? 0,  icon: CheckCheck,  color: "text-emerald-500", href: "/open-slots?status=CLAIMED" },
        {
          label: "Gemiddelde invultijd",
          value:
            safeData.avgMinutesToFill !== null && safeData.avgMinutesToFill !== undefined
              ? `${safeData.avgMinutesToFill} min`
              : "Nog geen",
          icon: Clock3,
          color: "text-purple-500",
          href: "/open-slots",
        },
        {
          label: "Teruggewonnen omzet",
          value: formatEuros(safeData.recoveredRevenueCents),
          icon: Euro,
          color: "text-emerald-600",
          href: "/open-slots?status=CLAIMED",
        },
      ]
    : [];

  return (
    <div className="mt-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-white">
          <Activity className="h-5 w-5 text-blue-600" />
          Omzet-herstel via de wachtlijst
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Vernieuwen
          </button>
          {isAdmin && (
            <button
              onClick={runDemo}
              disabled={demoState === "loading"}
              className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-60"
            >
              {demoState === "loading" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <PlayCircle className="h-3.5 w-3.5" />
              )}
              Demo scenario
            </button>
          )}
        </div>
      </div>

      {/* Metric cards. T6: in demo mode we suppress the red error card so
          the demo never dead-ends on a "kon niet laden" block — we render
          the zero-valued safeData cards instead. */}
      {error && !isDemoMode ? (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      ) : metrics || isDemoMode ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {metricCards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="group block cursor-pointer rounded-xl border border-zinc-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-blue-500"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">{card.label}</span>
                <card.icon className={`h-5 w-5 ${card.color} transition group-hover:scale-110`} />
              </div>
              <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">{card.value}</p>
            </Link>
          ))}
        </div>
      ) : null}

      {/* Fill rate sub-bar — guarded via safeData so a missing fillRate
          never renders as "NaN%" and never explodes inline styles. */}
      {metrics && (safeData.slotsFreed ?? 0) > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">Invulpercentage</span>
            <span className="font-semibold text-zinc-900 dark:text-white">
              {Number.isFinite(safeData.fillRate) ? safeData.fillRate : 0}%
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-700">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{
                width: `${Number.isFinite(safeData.fillRate) ? safeData.fillRate : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Demo result */}
      {demoState === "ok" && demoResult && (
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-900/20">
          <div className="flex items-center gap-2 text-sm font-medium text-purple-900 dark:text-purple-200">
            <CheckCircle className="h-4 w-4" />
            Demo-scenario uitgevoerd — annulering automatisch opgevuld
          </div>
          <ul className="mt-3 space-y-1 text-xs text-purple-800 dark:text-purple-300">
            {demoResult.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
          {demoResult.offers.length > 0 && (
            <div className="mt-3 border-t border-purple-200 pt-3 dark:border-purple-800">
              <p className="text-xs font-medium text-purple-900 dark:text-purple-200">
                Aanbiedingen verstuurd aan:
              </p>
              <ul className="mt-1 space-y-0.5 text-xs text-purple-700 dark:text-purple-400">
                {demoResult.offers.map((o) => (
                  <li key={o.tokenId}>• {o.clientName}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs italic text-purple-600 dark:text-purple-500">
                Bekijk de ingevulde plekken direct op de{" "}
                <a href="/open-slots?status=CLAIMED" className="underline">open plekken-pagina</a>.
              </p>
            </div>
          )}
        </div>
      )}

      {/* T6: also hide demo failure block in demo mode. A first-time viewer
          must never see a "Demo mislukt" banner — we stay silent and let the
          guaranteed demo state from /api/dashboard carry the story. */}
      {demoState === "error" && demoError && !isDemoMode && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          <AlertTriangle className="h-4 w-4" />
          Demo mislukt: {demoError}
        </div>
      )}

      {/* Admin log viewer */}
      {isAdmin && logs !== null && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-white">
            <Activity className="h-4 w-4 text-zinc-400" />
            Recente activiteit (admin)
          </h3>
          {logs.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-400">Nog geen activiteit.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {logs.map((log) => {
                const Icon = ACTION_ICON[log.action] ?? Activity;
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
                          {OUTCOME_LABELS[log.outcome] ?? log.outcome}
                        </span>
                        {log.clientName && (
                          <span className="text-xs text-zinc-500">— {log.clientName}</span>
                        )}
                      </div>
                      {log.details && (
                        <p className="mt-0.5 truncate text-xs text-zinc-500">{log.details}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-zinc-400">
                      {formatDateTime(log.createdAt)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
