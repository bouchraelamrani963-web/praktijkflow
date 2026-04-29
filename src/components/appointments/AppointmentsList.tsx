"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Upload, AlertTriangle } from "lucide-react";
import { RISK_LABELS, TYPE_LABELS } from "@/lib/labels";

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

const riskColors: Record<AppointmentRow["client"]["riskLevel"], string> = {
  LOW: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  MEDIUM: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  CRITICAL: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const statusColors: Record<AppointmentRow["status"], string> = {
  SCHEDULED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  CONFIRMED: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  IN_PROGRESS: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  COMPLETED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  CANCELLED: "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300",
  NO_SHOW: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
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
          <div className="p-12 text-center">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Geen afspraken gevonden.</p>
            <Link
              href="/appointments/new"
              className="mt-4 inline-flex text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              Maak je eerste afspraak
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
                {items.map((a) => (
                  <tr
                    key={a.id}
                    className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    onClick={() => router.push(`/appointments/${a.id}`)}
                  >
                    <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                      {formatDateTime(a.startTime)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-white">
                      {a.client.firstName} {a.client.lastName}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${riskColors[a.riskLevel]}`}>
                        {RISK_LABELS[a.riskLevel] ?? a.riskLevel}
                      </span>
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
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[a.status]}`}>
                        {statusLabels[a.status]}
                      </span>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
