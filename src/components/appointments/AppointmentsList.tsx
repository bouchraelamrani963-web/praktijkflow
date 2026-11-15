"use client";

import { formatEuroCents } from "@/lib/currency";
import { PRACTICE_TIME_ZONE, amsterdamCalendarDayDifference } from "@/lib/practice-time";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
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
  /** Total treatments attached. >1 means we render a '+N' affordance next
   *  to the legacy single-type label. Optional because legacy callers /
   *  server prefetches that haven't been updated yet still work. */
  treatmentCount?: number;
  /** API alternative name — /api/appointments returns Prisma's _count shape. */
  _count?: { treatments: number };
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
type AgendaView = "day" | "week" | "list";
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
    timeZone: PRACTICE_TIME_ZONE,
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
  const diffDays = amsterdamCalendarDayDifference(new Date(iso), new Date());

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
    <Suspense fallback={<div className="p-8 text-sm text-practice-subtle">Laden…</div>}>
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
  const [agendaView, setAgendaView] = useState<AgendaView>("list");

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
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
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

  const items = useMemo(() => data?.items ?? [], [data]);
  const visibleItems = useMemo(() => {
    if (agendaView === "day") {
      return items.filter((appointment) => amsterdamCalendarDayDifference(new Date(appointment.startTime), new Date()) === 0);
    }
    if (agendaView === "week") {
      const today = new Date();
      return items.filter((appointment) => {
        const days = amsterdamCalendarDayDifference(new Date(appointment.startTime), today);
        return days >= 0 && days < 7;
      });
    }
    return items;
  }, [agendaView, items]);
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
    <div className="ns-app-agenda">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="ns-app-eyebrow">PLANNING & BESCHIKBAARHEID</p>
          <h1 className="mt-1 text-2xl font-semibold text-practice-heading">
            Beschikbaarheid en afspraken
          </h1>
          <p className="mt-1 text-sm text-practice-subtle">
            {data
              ? `${data.total} afspra${data.total === 1 ? "ak" : "ken"} · Geschatte omzet ${formatEuroCents(totalRevenue)}`
              : "Laden…"}
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-practice-subtle">
            NoShow Control toont hier de afspraken en vrijgekomen plekken die de app beheert. Dit is geen volledige externe praktijkagenda.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/appointments/import"
            className="inline-flex items-center gap-2 rounded-lg border border-practice-field bg-practice-surface px-4 py-2 text-sm font-medium text-practice-ink hover:bg-practice-hover"
          >
            <Upload className="h-4 w-4" />
            CSV importeren
          </Link>
          <Link
            href="/appointments/new"
            className="inline-flex items-center gap-2 rounded-lg bg-practice-primary px-4 py-2 text-sm font-medium text-practice-on-primary hover:bg-practice-primary-hover"
          >
            <Plus className="h-4 w-4" />
            Nieuwe afspraak
          </Link>
        </div>
      </div>

      <div className="ns-app-view-toggle mb-4 inline-flex w-full rounded-lg border border-practice-line bg-practice-muted p-1 sm:w-fit">
        {[
          { value: "day", label: "Dag" },
          { value: "week", label: "Week" },
          { value: "list", label: "Lijst" },
        ].map((view) => (
          <button
            key={view.value}
            type="button"
            onClick={() => setAgendaView(view.value as AgendaView)}
            className={`min-h-10 flex-1 rounded-md px-4 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-blue-500 sm:flex-none ${
              agendaView === view.value
                ? "bg-practice-surface text-practice-heading shadow-sm "
                : "text-practice-subtle hover:text-practice-heading "
            }`}
            aria-pressed={agendaView === view.value}
          >
            {view.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="ns-app-filters mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label className="block text-xs font-medium uppercase text-practice-subtle">Van</label>
          {/* Year-spinner bounds — without these, typing a single digit lands
              on year 0009 and the resulting filter range is nonsense. */}
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            aria-label="Filter vanaf datum"
            min="2000-01-01"
            max="2099-12-31"
            className="mt-1 w-full rounded-lg border border-practice-field bg-practice-surface px-3 py-2 text-sm text-practice-heading"
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase text-practice-subtle">Tot</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            aria-label="Filter tot datum"
            min="2000-01-01"
            max="2099-12-31"
            className="mt-1 w-full rounded-lg border border-practice-field bg-practice-surface px-3 py-2 text-sm text-practice-heading"
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase text-practice-subtle">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter op status"
            className="mt-1 w-full rounded-lg border border-practice-field bg-practice-surface px-3 py-2 text-sm text-practice-heading"
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
          <label className="block text-xs font-medium uppercase text-practice-subtle">Risico</label>
          <select
            value={risk}
            onChange={(e) => setRisk(e.target.value)}
            aria-label="Filter op risiconiveau"
            className="mt-1 w-full rounded-lg border border-practice-field bg-practice-surface px-3 py-2 text-sm text-practice-heading"
          >
            <option value="">Alle risiconiveaus</option>
            <option value="LOW">Laag</option>
            <option value="MEDIUM">Gemiddeld</option>
            <option value="HIGH">Hoog</option>
            <option value="CRITICAL">Kritiek</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium uppercase text-practice-subtle">Behandelaar</label>
          <select
            value={practitionerId}
            onChange={(e) => setPractitionerId(e.target.value)}
            aria-label="Filter op behandelaar"
            className="mt-1 w-full rounded-lg border border-practice-field bg-practice-surface px-3 py-2 text-sm text-practice-heading"
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
      <div className="overflow-hidden rounded-xl border border-practice-line bg-practice-surface">
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
          <div className="flex flex-col items-center justify-center gap-3 p-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-practice-link dark:bg-blue-900/30">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-practice-heading">Geen afspraken gevonden</p>
              <p className="mt-1 text-sm text-practice-subtle">
                Pas de filters of weergave aan, of plan een nieuwe afspraak.
              </p>
            </div>
            <Link
              href="/appointments/new"
              className="mt-2 inline-flex items-center gap-2 rounded-lg bg-practice-primary px-4 py-2 text-sm font-medium text-practice-on-primary shadow-sm transition hover:bg-practice-primary-hover"
            >
              <Plus className="h-4 w-4" />
              Nieuwe afspraak
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-practice-line">
              <thead className="bg-practice-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-practice-subtle">Wanneer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-practice-subtle">Patiënt</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-practice-subtle">Risico</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-practice-subtle">Behandelaar</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-practice-subtle">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-practice-subtle">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-practice-subtle">Omzet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-practice-line">
                {visibleItems.map((a) => {
                  const StatusIcon = statusIcon[a.status];
                  const rel = relativeDayLabel(a.startTime);
                  return (
                    <tr
                      key={a.id}
                      className="cursor-pointer transition hover:bg-blue-50/40 dark:hover:bg-blue-900/10"
                      onClick={() => router.push(`/appointments/${a.id}`)}
                    >
                      <td className="px-4 py-3 text-sm text-practice-ink">
                        <div className="flex items-center gap-2">
                          <span>{formatDateTime(a.startTime)}</span>
                          {rel && (
                            <Badge tone={rel.tone} className="font-normal">{rel.label}</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-practice-heading">
                        {a.client.firstName} {a.client.lastName}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={riskTone[a.riskLevel]}>
                          {RISK_LABELS[a.riskLevel] ?? a.riskLevel}
                        </Badge>
                        <span className="ml-1 text-xs tabular-nums text-practice-subtle">{a.riskScore}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-practice-subtle">
                        {a.practitioner.firstName} {a.practitioner.lastName}
                      </td>
                      <td className="px-4 py-3 text-sm text-practice-subtle">
                        {a.appointmentType ? (
                          <span className="flex items-center gap-1.5">
                            <span className="truncate">
                              {TYPE_LABELS[a.appointmentType.name] ?? a.appointmentType.name}
                            </span>
                            {/* '+N' affordance when this appointment carries
                                more than one treatment code. The first code
                                is shown via legacy appointmentType (kept in
                                sync with treatments[0] by the create/update
                                routes); the badge surfaces the rest exist. */}
                            {(() => {
                              const total = a.treatmentCount ?? a._count?.treatments ?? 0;
                              return total > 1 ? (
                                <span
                                  className="shrink-0 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-practice-link dark:bg-blue-900/30"
                                  title={`${total} behandelcodes — open de afspraak voor details`}
                                >
                                  +{total - 1}
                                </span>
                              ) : null;
                            })()}
                          </span>
                        ) : (
                          "—"
                        )}
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
                          <span className="text-practice-ink">
                            {formatEuroCents(a.revenueEstimateCents)}
                          </span>
                        ) : (
                          <span
                            className="text-practice-subtle line-through"
                            title={
                              a.status === "CANCELLED"
                                ? "Geannuleerd — geen omzet"
                                : "Niet verschenen — geen omzet"
                            }
                          >
                            {formatEuroCents(0)}
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
