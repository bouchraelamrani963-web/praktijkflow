"use client";

import { Suspense, useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  Upload,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  PlayCircle,
  CalendarCheck,
} from "lucide-react";
import { RISK_LABELS, TYPE_LABELS } from "@/lib/labels";
import { Badge } from "@/components/ui";

type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

interface AppointmentRow {
  id: string;
  startTime: string;
  endTime: string;
  status: "SCHEDULED" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  revenueEstimateCents: number;
  riskScore: number;
  riskLevel: RiskLevel;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    riskLevel: RiskLevel;
  };
  practitioner: { id: string; firstName: string; lastName: string };
  appointmentType: { id: string; name: string; color: string } | null;
}

interface PractitionerOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface ApiResponse {
  items: AppointmentRow[];
  total: number;
  page: number;
  pageSize: number;
}

type RiskTone = "success" | "warning" | "danger";
const riskTone: Record<AppointmentRow["client"]["riskLevel"], RiskTone> = {
  LOW: "success",
  MEDIUM: "warning",
  HIGH: "warning",
  CRITICAL: "danger",
};

type StatusTone = "info" | "success" | "danger" | "muted" | "warning";
const statusTone: Record<AppointmentRow["status"], StatusTone> = {
  SCHEDULED:   "info",
  CONFIRMED:   "info",
  IN_PROGRESS: "warning",
  COMPLETED:   "success",
  CANCELLED:   "muted",
  NO_SHOW:     "danger",
};

const statusIcon: Record<AppointmentRow["status"], ComponentType<{ className?: string }>> = {
  SCHEDULED:   Calendar,
  CONFIRMED:   CalendarCheck,
  IN_PROGRESS: PlayCircle,
  COMPLETED:   CheckCircle2,
  CANCELLED:   Clock,
  NO_SHOW:     XCircle,
};

const statusLabels: Record<AppointmentRow["status"], string> = {
  SCHEDULED: "Gepland",
  CONFIRMED: "Bevestigd",
  IN_PROGRESS: "Bezig",
  COMPLETED: "Afgerond",
  CANCELLED: "Geannuleerd",
  NO_SHOW: "Niet verschenen",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Bucket an appointment timestamp into a short relative label that orients
 * the user faster than the full date — "Vandaag", "Morgen", "Deze week",
 * "Vorige week" or null (no badge for further-out dates).
 *
 * Boundaries are computed against the local-day start so a 23:30 appointment
 * still reads as "Vandaag" and a 00:30 next-day appointment reads as "Morgen".
 */
function relativeDayLabel(iso: string): { label: string; tone: "info" | "success" | "neutral" } | null {
  const start = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDay = new Date(start);
  startDay.setHours(0, 0, 0, 0);
  const diffDays = Math.round((startDay.getTime() - today.getTime()) / 86_400_000);

  if (diffDays === 0)  return { label: "Vandaag",     tone: "success" };
  if (diffDays === 1)  return { label: "Morgen",      tone: "info" };
  if (diffDays >= 2 && diffDays <= 6)  return { label: "Deze week",   tone: "info" };
  if (diffDays === -1) return { label: "Gisteren",    tone: "neutral" };
  if (diffDays >= -7 && diffDays < -1) return { label: "Vorige week", tone: "neutral" };
  return null;
}

export function AppointmentsList({
  practitioners,
  initialData,
}: {
  practitioners: PractitionerOption[];
  initialData?: ApiResponse;
}) {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-zinc-500">Laden…</div>}>
      <Inner practitioners={practitioners} initialData={initialData} />
    </Suspense>
  );
}

function Inner({
  practitioners,
  initialData,
}: {
  practitioners: PractitionerOption[];
  initialData?: ApiResponse;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [dateFrom, setDateFrom] = useState(searchParams.get("dateFrom") ?? "");
  const [dateTo, setDateTo] = useState(searchParams.get("dateTo") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [risk, setRisk] = useState(searchParams.get("riskLevel") ?? "");
  const [practitionerId, setPractitionerId] = useState(searchParams.get("practitionerId") ?? "");

  // Seed from server-rendered initial data when available (no loading flash).
  const [data, setData] = useState<ApiResponse | null>(initialData ?? null);
  const [loading, setLoading] = useState(initialData == null);
  const [error, setError] = useState<string | null>(null);

  // Skip the first effect run when the server already provided data.
  // Subsequent filter changes (skipFirstFetch.current === false) call the API normally.
  const skipFirstFetch = useRef(initialData != null);

  const fetchAppts = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (dateFrom) params.set("dateFrom", new Date(dateFrom).toISOString());
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      params.set("dateTo", end.toISOString());
    }
    if (status) params.set("status", status);
    if (risk) params.set("riskLevel", risk);
    if (practitionerId) params.set("practitionerId", practitionerId);

    try {
      const res = await fetch(`/api/appointments?${params.toString()}`);
      if (!res.ok) throw new Error("Afspraken konden niet geladen worden");
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onbekende fout");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, status, risk, practitionerId]);

  useEffect(() => {
    if (skipFirstFetch.current) {
      skipFirstFetch.current = false;
      return; // server already fetched this data — skip redundant API call
    }
    const t = setTimeout(() => {
      fetchAppts();
      const params = new URLSearchParams();
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (status) params.set("status", status);
      if (risk) params.set("riskLevel", risk);
      if (practitionerId) params.set("practitionerId", practitionerId);
      const qs = params.toString();
      router.replace(qs ? `/appointments?${qs}` : "/appointments", { scroll: false });
    }, 200);
    return () => clearTimeout(t);
  }, [dateFrom, dateTo, status, risk, practitionerId, fetchAppts, router]);

  const items = data?.items ?? [];
  // Revenue rule: CANCELLED and NO_SHOW appointments contribute €0 to
  // estimated revenue. They are shown as €0 in the row and excluded from the
  // total. Keeping the raw estimate on the record is fine; the display layer
  // is what owns the business rule.
  const countsForRevenue = (a: AppointmentRow) =>
    a.status !== "CANCELLED" && a.status !== "NO_SHOW";
  const totalRevenue = items.reduce(
    (sum, a) => sum + (countsForRevenue(a) ? a.revenueEstimateCents : 0),
    0,
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Afspraken</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {data
              ? `${data.total} afspra${data.total === 1 ? "ak" : "ken"} · Geschatte omzet €${((Number.isFinite(totalRevenue) ? totalRevenue : 0) / 100).toFixed(2)}`
              : "Laden…"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/appointments/import"
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            <Upload className="h-4 w-4" />
            CSV importeren
          </Link>
          <Link
            href="/appointments/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Nieuwe afspraak
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label className="block text-xs font-medium uppercase text-zinc-500">Van</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            aria-label="Filter vanaf datum"
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase text-zinc-500">Tot</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            aria-label="Filter tot datum"
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase text-zinc-500">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter op status"
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
          >
            <option value="">Alle statussen</option>
            <option value="SCHEDULED">Gepland</option>
            <option value="CONFIRMED">Bevestigd</option>
            <option value="IN_PROGRESS">Bezig</option>
            <option value="COMPLETED">Afgerond</option>
            <option value="CANCELLED">Geannuleerd</option>
            <option value="NO_SHOW">Niet verschenen</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium uppercase text-zinc-500">Risico</label>
          <select
            value={risk}
            onChange={(e) => setRisk(e.target.value)}
            aria-label="Filter op risiconiveau"
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
          >
            <option value="">Alle risiconiveaus</option>
            <option value="LOW">Laag</option>
            <option value="MEDIUM">Gemiddeld</option>
            <option value="HIGH">Hoog</option>
            <option value="CRITICAL">Kritiek</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium uppercase text-zinc-500">Behandelaar</label>
          <select
            value={practitionerId}
            onChange={(e) => setPractitionerId(e.target.value)}
            aria-label="Filter op behandelaar"
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
          >
            <option value="">Alle behandelaars</option>
            {practitioners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.firstName} {p.lastName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {error ? (
          <div className="flex items-center gap-2 p-8 text-sm text-red-600">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 p-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-white">Geen afspraken gevonden</p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Plan je eerste afspraak om te beginnen.
              </p>
            </div>
            <Link
              href="/appointments/new"
              className="mt-2 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-blue-500/20 transition hover:from-blue-700 hover:to-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Nieuwe afspraak
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">Wanneer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">Patiënt</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">Risico</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">Behandelaar</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-zinc-500">Omzet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {items.map((a) => {
                  const StatusIcon = statusIcon[a.status];
                  const rel = relativeDayLabel(a.startTime);
                  return (
                    <tr
                      key={a.id}
                      className="cursor-pointer transition hover:bg-blue-50/40 dark:hover:bg-blue-900/10"
                      onClick={() => router.push(`/appointments/${a.id}`)}
                    >
                      <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                        <div className="flex items-center gap-2">
                          <span>{formatDateTime(a.startTime)}</span>
                          {rel && (
                            <Badge tone={rel.tone} className="font-normal">{rel.label}</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-white">
                        {a.client.firstName} {a.client.lastName}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={riskTone[a.riskLevel]}>
                          {RISK_LABELS[a.riskLevel] ?? a.riskLevel}
                        </Badge>
                        <span className="ml-1 text-xs tabular-nums text-zinc-500">{a.riskScore}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                        {a.practitioner.firstName} {a.practitioner.lastName}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                        {a.appointmentType
                          ? (TYPE_LABELS[a.appointmentType.name] ?? a.appointmentType.name)
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          tone={statusTone[a.status]}
                          icon={<StatusIcon className="h-3 w-3" />}
                        >
                          {statusLabels[a.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-mono">
                        {countsForRevenue(a) ? (
                          <span className="text-zinc-700 dark:text-zinc-300">
                            €{((Number.isFinite(a.revenueEstimateCents) ? a.revenueEstimateCents : 0) / 100).toFixed(2)}
                          </span>
                        ) : (
                          <span
                            className="text-zinc-400 line-through"
                            title={
                              a.status === "CANCELLED"
                                ? "Geannuleerd — geen omzet"
                                : "Niet verschenen — geen omzet"
                            }
                          >
                            €0,00
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
