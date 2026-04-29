"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCard, TrendingUp, FileText, AlertCircle } from "lucide-react";

interface InvoiceRow {
  id: string;
  number: string;
  status: string;
  issueDate: string;
  dueDate: string;
  total: number;
  client: { firstName: string; lastName: string };
}

interface Stats {
  totalRevenue: number;
  paidTotal: number;
  openTotal: number;
  invoiceCount: number;
}

const statusLabels: Record<string, string> = {
  DRAFT: "Concept",
  SENT: "Verzonden",
  PAID: "Betaald",
  OVERDUE: "Te laat",
  CANCELLED: "Geannuleerd",
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  SENT: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  PAID: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  OVERDUE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  CANCELLED: "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500",
};

function euro(cents: number | null | undefined) {
  // Guard: null/undefined/NaN must never render as "€NaN". Coerce to 0.
  const safe = Number.isFinite(cents as number) ? (cents as number) : 0;
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(safe / 100);
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

export default function FacturatiePage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    try {
      const res = await fetch(`/api/invoices?${params.toString()}`);
      if (!res.ok) throw new Error("Kan facturen niet laden");
      const data = await res.json();
      setInvoices(data.invoices);
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fout bij laden");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Facturatie</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Overzicht van facturen en omzet
        </p>
      </div>

      {/* KPI cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={TrendingUp}
          label="Totale omzet"
          value={stats ? euro(stats.totalRevenue) : "—"}
          color="text-emerald-600"
        />
        <KpiCard
          icon={FileText}
          label="Aantal facturen"
          value={stats ? String(stats.invoiceCount) : "—"}
          color="text-blue-600"
        />
        <KpiCard
          icon={CreditCard}
          label="Betaald"
          value={stats ? euro(stats.paidTotal) : "—"}
          color="text-emerald-600"
        />
        <KpiCard
          icon={AlertCircle}
          label="Openstaand"
          value={stats ? euro(stats.openTotal) : "—"}
          color="text-orange-600"
        />
      </div>

      {/* Filter */}
      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter op status"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
        >
          <option value="ALL">Alle statussen</option>
          <option value="DRAFT">Concept</option>
          <option value="SENT">Verzonden</option>
          <option value="PAID">Betaald</option>
          <option value="OVERDUE">Te laat</option>
          <option value="CANCELLED">Geannuleerd</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {error ? (
          <div className="flex items-center gap-2 p-8 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Geen facturen gevonden.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">Nummer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">Datum</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">Patiënt</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">Bedrag</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">Vervaldatum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="px-4 py-3 text-sm font-mono text-zinc-900 dark:text-white">{inv.number}</td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{fmtDate(inv.issueDate)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-white">
                      {inv.client.firstName} {inv.client.lastName}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-zinc-700 dark:text-zinc-300">{euro(inv.total)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[inv.status] ?? ""}`}>
                        {statusLabels[inv.status] ?? inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{fmtDate(inv.dueDate)}</td>
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

function KpiCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-3">
        <Icon className={`h-5 w-5 ${color}`} />
        <span className="text-sm text-zinc-500">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">{value}</p>
    </div>
  );
}
