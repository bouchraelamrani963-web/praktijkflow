"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { DAY_LABELS, TIME_LABELS, STATUS_LABELS, TYPE_LABELS } from "@/lib/labels";

type WaitlistStatus = "WAITING" | "OFFERED" | "ACCEPTED" | "EXPIRED" | "CANCELLED";

interface WaitlistRow {
  id: string;
  status: WaitlistStatus;
  preferredDay: string | null;
  preferredTime: string | null;
  isFlexible: boolean;
  notes: string | null;
  createdAt: string;
  client: { id: string; firstName: string; lastName: string; phone: string | null; email: string | null };
  appointmentType: { id: string; name: string } | null;
}

interface ApiResponse {
  items: WaitlistRow[];
  total: number;
  page: number;
  pageSize: number;
}

const statusColors: Record<WaitlistStatus, string> = {
  WAITING: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  OFFERED: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  ACCEPTED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  EXPIRED: "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300",
  CANCELLED: "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300",
};

// Keep a local typed alias against the shared map so the switch-on-union
// still narrows. Values come from `STATUS_LABELS` — single source of truth.
const statusLabels: Record<WaitlistStatus, string> = {
  WAITING: STATUS_LABELS.WAITING,
  OFFERED: STATUS_LABELS.OFFERED,
  ACCEPTED: STATUS_LABELS.ACCEPTED,
  EXPIRED: STATUS_LABELS.EXPIRED,
  CANCELLED: STATUS_LABELS.CANCELLED,
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function WaitlistPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-zinc-500">Laden...</div>}>
      <WaitlistInner />
    </Suspense>
  );
}

function WaitlistInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (status) params.set("status", status);

    try {
      const res = await fetch(`/api/waitlist?${params.toString()}`);
      if (!res.ok) throw new Error("Wachtlijst kon niet geladen worden");
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onbekende fout");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchEntries();
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      const qs = params.toString();
      router.replace(qs ? `/waitlist?${qs}` : "/waitlist", { scroll: false });
    }, 200);
    return () => clearTimeout(t);
  }, [status, fetchEntries, router]);

  const items = data?.items ?? [];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Wachtlijst</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {data ? `${data.total} vermelding${data.total === 1 ? "" : "en"}` : "Laden..."}
          </p>
          {/* Supporting-proof framing — explains WHY this page exists in the
              revenue story: these patients are the engine behind every filled
              slot. Inline, no tooltip. */}
          <p className="mt-2 max-w-3xl text-sm text-zinc-700 dark:text-zinc-300">
            Deze patiënten wachten actief op een plek — zij zorgen ervoor dat
            annuleringen direct worden opgevuld.
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Hoe groter de wachtlijst, hoe hoger het invulpercentage.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <div>
          <label htmlFor="wl-status" className="block text-xs font-medium uppercase text-zinc-500">
            Status
          </label>
          <select
            id="wl-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter op status"
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
          >
            <option value="">Alle statussen</option>
            <option value="WAITING">Wachtend</option>
            <option value="OFFERED">Aangeboden</option>
            <option value="ACCEPTED">Geaccepteerd</option>
            <option value="EXPIRED">Verlopen</option>
            <option value="CANCELLED">Geannuleerd</option>
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
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Geen patiënten op de wachtlijst — hierdoor kunnen annuleringen niet automatisch worden opgevuld.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">Patiënt</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">Voorkeur dag</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">Voorkeur tijd</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">Flexibel</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">Sinds</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {items.map((entry) => (
                  <tr
                    key={entry.id}
                    onClick={() => router.push(`/waitlist/${entry.id}`)}
                    className="cursor-pointer transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-white">
                      {entry.client.firstName} {entry.client.lastName}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                      {entry.appointmentType
                        ? (TYPE_LABELS[entry.appointmentType.name] ?? entry.appointmentType.name)
                        : "Geen voorkeur"}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                      {entry.preferredDay
                        ? (DAY_LABELS[entry.preferredDay] ?? entry.preferredDay)
                        : "Geen voorkeur"}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                      {entry.preferredTime
                        ? (TIME_LABELS[entry.preferredTime] ?? entry.preferredTime)
                        : "Geen voorkeur"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {entry.isFlexible ? (
                        <span className="inline-flex rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                          Ja
                        </span>
                      ) : (
                        <span className="text-zinc-400">Nee</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500">
                      {formatDate(entry.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[entry.status]}`}>
                        {statusLabels[entry.status]}
                      </span>
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
