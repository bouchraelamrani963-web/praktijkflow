"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Search } from "lucide-react";
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
  WAITING: "bg-practice-muted text-practice-ink ",
  OFFERED: "bg-blue-50 text-practice-link ring-1 ring-blue-100 dark:bg-blue-900/20 dark:ring-blue-900/40",
  ACCEPTED: "bg-teal-50 text-teal-700 ring-1 ring-teal-100 dark:bg-teal-900/20 dark:text-teal-300 dark:ring-teal-900/40",
  EXPIRED: "bg-practice-line text-practice-subtle ",
  CANCELLED: "bg-practice-line text-practice-subtle ",
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
    <Suspense fallback={<div className="p-8 text-sm text-practice-subtle">Laden...</div>}>
      <WaitlistInner />
    </Suspense>
  );
}

function WaitlistInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [query, setQuery] = useState("");
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

  const items = useMemo(() => data?.items ?? [], [data]);
  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return items;
    return items.filter((entry) =>
      [
        entry.client.firstName,
        entry.client.lastName,
        entry.appointmentType?.name ?? "",
        entry.preferredDay ?? "",
        entry.preferredTime ?? "",
        entry.notes ?? "",
      ].some((value) => value.toLowerCase().includes(normalizedQuery)),
    );
  }, [items, query]);

  return (
    <div className="ns-app-waitlist">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="ns-app-eyebrow">PATIËNTEN & BESCHIKBAARHEID</p>
          <h1 className="text-2xl font-semibold text-practice-heading">Wachtlijst</h1>
          <p className="mt-1 text-sm text-practice-subtle">
            {data ? `${data.total} vermelding${data.total === 1 ? "" : "en"}` : "Laden..."}
          </p>
          <p className="mt-2 max-w-3xl text-sm text-practice-ink">
            Deze patiënten wachten op een passende plek. Gebruik deze lijst om
            bij annuleringen snel en overzichtelijk een aanbod te sturen.
          </p>
          <p className="mt-1 text-xs text-practice-subtle">
            Tip: vul voorkeuren en e-mailadres zorgvuldig in voor betere matches.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="ns-app-filters mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_14rem]">
        <div>
          <label htmlFor="wl-search" className="block text-xs font-medium uppercase text-practice-subtle">
            Zoeken
          </label>
          <div className="relative mt-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-practice-subtle" />
            <input
              id="wl-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Naam, voorkeur of behandeling"
              className="w-full rounded-lg border border-practice-field bg-practice-surface py-2 pl-9 pr-3 text-sm text-practice-heading"
            />
          </div>
        </div>
        <div>
          <label htmlFor="wl-status" className="block text-xs font-medium uppercase text-practice-subtle">
            Status
          </label>
          <select
            id="wl-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter op status"
            className="mt-1 w-full rounded-lg border border-practice-field bg-practice-surface px-3 py-2 text-sm text-practice-heading"
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
      <div className="ns-app-table-shell overflow-hidden rounded-xl border border-practice-line bg-practice-surface">
        {error ? (
          <div className="flex items-center gap-2 p-8 text-sm text-red-600 dark:text-red-300">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-practice-subtle">
              Geen patiënten op de wachtlijst.
            </p>
            <p className="mt-1 text-sm text-practice-subtle">
              Voeg patiënten toe die eerder beschikbaar zijn, zodat open plekken later makkelijker kunnen worden aangeboden.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-practice-line">
              <thead className="bg-practice-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-practice-subtle">Patiënt</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-practice-subtle">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-practice-subtle">Voorkeur dag</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-practice-subtle">Voorkeur tijd</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-practice-subtle">Flexibel</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-practice-subtle">Sinds</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-practice-subtle">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-practice-line">
                {visibleItems.map((entry) => (
                  <tr
                    key={entry.id}
                    onClick={() => router.push(`/waitlist/${entry.id}`)}
                    className="cursor-pointer transition hover:bg-practice-hover"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-practice-heading">
                      {entry.client.firstName} {entry.client.lastName}
                    </td>
                    <td className="px-4 py-3 text-sm text-practice-subtle">
                      {entry.appointmentType
                        ? (TYPE_LABELS[entry.appointmentType.name] ?? entry.appointmentType.name)
                        : "Geen voorkeur"}
                    </td>
                    <td className="px-4 py-3 text-sm text-practice-subtle">
                      {entry.preferredDay
                        ? (DAY_LABELS[entry.preferredDay] ?? entry.preferredDay)
                        : "Geen voorkeur"}
                    </td>
                    <td className="px-4 py-3 text-sm text-practice-subtle">
                      {entry.preferredTime
                        ? (TIME_LABELS[entry.preferredTime] ?? entry.preferredTime)
                        : "Geen voorkeur"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {entry.isFlexible ? (
                        <span className="inline-flex rounded-full bg-practice-muted px-2 py-0.5 text-xs font-medium text-practice-ink">
                          Ja
                        </span>
                      ) : (
                        <span className="text-practice-subtle">Nee</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-practice-subtle">
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
