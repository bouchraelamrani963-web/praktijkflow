"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Plus, AlertTriangle } from "lucide-react";
import { RISK_LABELS } from "@/lib/labels";

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  isActive: boolean;
  waitlistOptIn: boolean;
  communicationPreference: "EMAIL" | "SMS" | "PHONE" | "NONE";
}

interface ApiResponse {
  items: Patient[];
  total: number;
  page: number;
  pageSize: number;
}

const riskColors: Record<Patient["riskLevel"], string> = {
  LOW: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  MEDIUM: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  CRITICAL: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

export default function PatientsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-practice-subtle">Laden…</div>}>
      <PatientsList />
    </Suspense>
  );
}

function PatientsList() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [risk, setRisk] = useState(searchParams.get("riskLevel") ?? "");
  const [status, setStatus] = useState(searchParams.get("isActive") ?? "true");
  const [waitlist, setWaitlist] = useState(searchParams.get("waitlistOptIn") ?? "");
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (risk) params.set("riskLevel", risk);
    if (status) params.set("isActive", status);
    if (waitlist) params.set("waitlistOptIn", waitlist);

    try {
      const res = await fetch(`/api/patients?${params.toString()}`);
      if (!res.ok) throw new Error("Patiënten konden niet geladen worden");
      const json: ApiResponse = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onbekende fout");
    } finally {
      setLoading(false);
    }
  }, [query, risk, status, waitlist]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      fetchPatients();
      // Sync URL
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (risk) params.set("riskLevel", risk);
      if (status && status !== "true") params.set("isActive", status);
      if (waitlist) params.set("waitlistOptIn", waitlist);
      const qs = params.toString();
      router.replace(qs ? `/patients?${qs}` : "/patients", { scroll: false });
    }, 250);
    return () => clearTimeout(t);
  }, [query, risk, status, waitlist, fetchPatients, router]);

  const items = data?.items ?? [];

  return (
    <div className="ns-app-patients">
      <div className="ns-app-collection-header mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="ns-app-eyebrow">PATIËNTENADMINISTRATIE</p>
          <h1 className="text-2xl font-bold text-practice-heading">Patiënten</h1>
          <p className="mt-1 text-sm text-practice-subtle">
            {data ? `${data.total} patiënt${data.total === 1 ? "" : "en"}` : "Laden…"}
          </p>
        </div>
        <Link
          href="/patients/new"
          className="inline-flex items-center gap-2 rounded-lg bg-practice-primary px-4 py-2 text-sm font-medium text-practice-on-primary hover:bg-practice-primary-hover"
        >
          <Plus className="h-4 w-4" />
          Nieuwe patiënt
        </Link>
      </div>

      {/* Filters */}
      <div className="ns-app-patient-filters mb-6 flex flex-wrap gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-practice-subtle" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zoek op naam, e-mail, telefoon…"
            aria-label="Zoek patiënten"
            className="w-full rounded-lg border border-practice-field bg-practice-surface py-2 pl-9 pr-3 text-sm text-practice-heading placeholder-practice-subtle focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-practice-focus/20"
          />
        </div>
        <select
          value={risk}
          onChange={(e) => setRisk(e.target.value)}
          aria-label="Filter op risiconiveau"
          className="rounded-lg border border-practice-field bg-practice-surface px-3 py-2 text-sm text-practice-heading focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-practice-focus/20"
        >
          <option value="">Alle risiconiveaus</option>
          <option value="LOW">Laag</option>
          <option value="MEDIUM">Gemiddeld</option>
          <option value="HIGH">Hoog</option>
          <option value="CRITICAL">Kritiek</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter op patiëntstatus"
          className="rounded-lg border border-practice-field bg-practice-surface px-3 py-2 text-sm text-practice-heading focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-practice-focus/20"
        >
          <option value="true">Actief</option>
          <option value="false">Inactief</option>
          <option value="all">Alle</option>
        </select>
        <select
          value={waitlist}
          onChange={(e) => setWaitlist(e.target.value)}
          aria-label="Filter op wachtlijst-aanmelding"
          className="rounded-lg border border-practice-field bg-practice-surface px-3 py-2 text-sm text-practice-heading focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-practice-focus/20"
        >
          <option value="">Wachtlijst</option>
          <option value="true">Aangemeld</option>
          <option value="false">Niet aangemeld</option>
        </select>
      </div>

      {/* Table */}
      <div className="ns-app-collection-table overflow-hidden rounded-xl border border-practice-line bg-practice-surface">
        {error ? (
          <div className="flex items-center gap-2 p-8 text-sm text-red-600 dark:text-red-300">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-practice-subtle">Geen patiënten gevonden.</p>
            <Link href="/patients/new" className="mt-4 inline-flex text-sm font-medium text-practice-link hover:text-practice-heading">
              Voeg je eerste patiënt toe
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-practice-line">
              <thead className="bg-practice-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-practice-subtle">Naam</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-practice-subtle">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-practice-subtle">Plaats</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-practice-subtle">Risico</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-practice-subtle">Wachtlijst</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-practice-subtle">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-practice-line">
                {items.map((p) => (
                  <tr
                    key={p.id}
                    className="cursor-pointer hover:bg-practice-hover"
                    onClick={() => router.push(`/patients/${p.id}`)}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-practice-heading">
                      {p.firstName} {p.lastName}
                    </td>
                    <td className="px-4 py-3 text-sm text-practice-subtle">
                      <div>{p.email ?? "—"}</div>
                      <div className="text-xs text-practice-subtle">{p.phone ?? ""}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-practice-subtle">{p.city ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${riskColors[p.riskLevel]}`}>
                        {RISK_LABELS[p.riskLevel] ?? p.riskLevel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-practice-subtle">
                      {p.waitlistOptIn ? "Aangemeld" : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {p.isActive ? (
                        <span className="text-emerald-700 dark:text-emerald-300">Actief</span>
                      ) : (
                        <span className="text-practice-subtle">Inactief</span>
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
