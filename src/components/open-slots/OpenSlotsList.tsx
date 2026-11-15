"use client";

import { formatEuroCents } from "@/lib/currency";
import { PRACTICE_TIME_ZONE } from "@/lib/practice-time";
import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, AlertTriangle, Send } from "lucide-react";

type SlotStatus = "AVAILABLE" | "OFFERED" | "CLAIMED" | "EXPIRED";

interface SlotRow {
  id: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: SlotStatus;
  sourceAppointmentId: string | null;
  notes: string | null;
  practitioner: { id: string; firstName: string; lastName: string };
  appointmentType: { id: string; name: string; color: string } | null;
  cancelledAt: string | null;
  cancelledBy: { id: string; firstName: string; lastName: string } | null;
  cancelledByLabel: string | null;
  offeredCount: number;
  offeredAt: string | null;
  claimedAt: string | null;
  // `id` may be null — the claimed-client name is an immutable snapshot, not
  // a live FK, so the upstream Client may be unresolvable.
  claimedBy: { id: string | null; firstName: string; lastName: string } | null;
  claimedAppointmentId: string | null;
  claimedAppointmentType: string | null;
  fillMinutes: number | null;
  recoveredRevenueCents: number | null;
}

interface PractitionerOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface ApiResponse {
  items: SlotRow[];
  total: number;
  page: number;
  pageSize: number;
}

const statusColors: Record<SlotStatus, string> = {
  AVAILABLE: "bg-practice-muted text-practice-ink ",
  OFFERED: "bg-blue-50 text-practice-link ring-1 ring-blue-100 dark:bg-blue-900/20 dark:ring-blue-900/40",
  CLAIMED: "bg-teal-50 text-teal-700 ring-1 ring-teal-100 dark:bg-teal-900/20 dark:text-teal-300 dark:ring-teal-900/40",
  EXPIRED: "bg-practice-line text-practice-subtle ",
};

const statusLabels: Record<SlotStatus, string> = {
  AVAILABLE: "Vrijgekomen",
  OFFERED: "Aangeboden",
  CLAIMED: "Opnieuw ingevuld",
  EXPIRED: "Niet hersteld",
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


export function OpenSlotsList({ practitioners }: { practitioners: PractitionerOption[] }) {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-practice-subtle">Laden…</div>}>
      <Inner practitioners={practitioners} />
    </Suspense>
  );
}

function Inner({ practitioners }: { practitioners: PractitionerOption[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [practitionerId, setPractitionerId] = useState(searchParams.get("practitionerId") ?? "");

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (practitionerId) params.set("practitionerId", practitionerId);

    try {
      const res = await fetch(`/api/open-slots?${params.toString()}`);
      if (!res.ok) throw new Error("Open plekken konden niet geladen worden");
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onbekende fout");
    } finally {
      setLoading(false);
    }
  }, [status, practitionerId]);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchSlots();
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (practitionerId) params.set("practitionerId", practitionerId);
      const qs = params.toString();
      router.replace(qs ? `/open-slots?${qs}` : "/open-slots", { scroll: false });
    }, 200);
    return () => clearTimeout(t);
  }, [status, practitionerId, fetchSlots, router]);

  const items = data?.items ?? [];

  // First CLAIMED row is the most recent success story — we highlight it with
  // a "kijk hier" badge so first-time viewers have an obvious entry point into
  // the recovery flow (→ appointment detail).
  const firstClaimedId = items.find((s) => s.status === "CLAIMED" && s.claimedAppointmentId)?.id ?? null;

  // T4: when the dashboard banner routes here with status=CLAIMED (optionally
  // plus #scroll-claimed), bring the first CLAIMED row into view so the
  // guided demo flow never dead-ends on an empty viewport.
  useEffect(() => {
    if (loading || items.length === 0) return;
    const shouldScroll =
      status === "CLAIMED" ||
      (typeof window !== "undefined" && window.location.hash === "#scroll-claimed");
    if (!shouldScroll) return;
    // Wait a frame so the row has painted before measuring.
    const raf = window.requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>("[data-slot-status='CLAIMED']");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return () => window.cancelAnimationFrame(raf);
  }, [loading, items, status]);

  return (
    <div className="ns-app-slots">
      <div className="ns-app-collection-header mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="ns-app-eyebrow">AGENDA & VRIJGEKOMEN TIJD</p>
          <h1 className="text-2xl font-bold text-practice-heading">Open plekken</h1>
          <p className="mt-1 text-sm text-practice-subtle">
            {data ? `${data.total} plek${data.total === 1 ? "" : "ken"}` : "Laden…"}
          </p>
          {/* Step-2 micro-guidance — tells the user WHAT they're looking at
              and WHERE to click next. Inline text, no tooltip. */}
          <p className="mt-1 text-xs text-practice-subtle">
            Bekijk welke plekken beschikbaar zijn, waar een aanbod loopt en welke afspraken opnieuw zijn bevestigd.
          </p>
        </div>
        <Link
          href="/open-slots/new"
          className="inline-flex items-center gap-2 rounded-lg bg-practice-primary px-4 py-2 text-sm font-medium text-practice-on-primary hover:bg-practice-primary-hover"
        >
          <Plus className="h-4 w-4" />
          Nieuwe plek
        </Link>
      </div>

      {/* Filters */}
      <div className="ns-app-slot-filters mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="block text-xs font-medium uppercase text-practice-subtle">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter op status"
            className="mt-1 w-full rounded-lg border border-practice-field bg-practice-surface px-3 py-2 text-sm text-practice-heading"
          >
            <option value="">Alle</option>
            <option value="AVAILABLE">Vrijgekomen</option>
            <option value="OFFERED">Aangeboden</option>
            <option value="CLAIMED">Opnieuw ingevuld</option>
            <option value="EXPIRED">Niet hersteld</option>
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
            <p className="text-sm font-medium text-practice-ink">
              Geen open plekken gevonden.
            </p>
            <p className="mt-1 text-sm text-practice-subtle">
              Zodra een afspraak wordt geannuleerd of handmatig wordt aangemaakt, verschijnt deze hier.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-practice-line">
              <thead className="bg-practice-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-practice-subtle">Tijd</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-practice-subtle">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-practice-subtle">Behandelaar</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-practice-subtle">Bron</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-practice-subtle">Opvolging</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-practice-subtle">Geschatte afspraakwaarde</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-practice-subtle">Actie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-practice-line">
                {items.map((s) => {
                  // T3: a row is clickable ONLY when the status is CLAIMED and
                  // a linked appointment id exists. AVAILABLE rows are NOT
                  // click-through targets from this table — the "Vind patiënten"
                  // action button in the last column is the only path there.
                  const isClickable =
                    s.status === "CLAIMED" && !!s.claimedAppointmentId;
                  const rowTarget = isClickable
                    ? `/appointments/${s.claimedAppointmentId}`
                    : null;
                  // T3: handleClick guard — never navigate from a non-clickable
                  // row even if something upstream wires an onClick by mistake.
                  const handleRowClick = () => {
                    if (!isClickable || !rowTarget) return;
                    router.push(rowTarget);
                  };
                  return (
                    <tr
                      key={s.id}
                      // T4: data-slot-status powers the dashboard banner's
                      // auto-scroll into the first CLAIMED row on arrival.
                      data-slot-status={s.status}
                      onClick={isClickable ? handleRowClick : undefined}
                      className={`transition ${
                        isClickable
                          ? "cursor-pointer hover:bg-practice-hover "
                          : ""
                      }`}
                    >
                      <td className="px-4 py-3 text-sm text-practice-ink">
                        {formatDateTime(s.startTime)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[s.status]}`}
                        >
                          {statusLabels[s.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-practice-subtle">
                        {s.practitioner.firstName} {s.practitioner.lastName}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {s.sourceAppointmentId ? (
                          <div className="flex flex-col gap-0.5">
                          <span className="inline-flex w-fit rounded-full bg-practice-muted px-2 py-0.5 text-xs font-medium text-practice-ink">
                              Geannuleerde afspraak
                            </span>
                            {s.cancelledByLabel && (
                              <span className="text-xs text-practice-subtle">
                                Geannuleerd door:{" "}
                                <span className="font-medium text-practice-ink">
                                  {s.cancelledByLabel}
                                </span>
                              </span>
                            )}
                            {s.cancelledAt && (
                              <span className="text-xs text-practice-subtle">
                                Geannuleerd op: {formatDateTime(s.cancelledAt)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex rounded-full bg-practice-muted px-2 py-0.5 text-xs font-medium text-practice-ink">
                            Handmatig
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {s.status === "CLAIMED" ? (
                          <div className="ns-app-slot-trail flex flex-col gap-0.5 text-xs text-practice-subtle">
                            <span>
                              Opnieuw ingevuld door:{" "}
                              <span className="font-medium text-practice-ink">
                                {s.claimedBy
                                  ? `${s.claimedBy.firstName} ${s.claimedBy.lastName}`
                                  : "Patiënt onbekend"}
                              </span>
                            </span>
                            <span>
                              Opnieuw ingevuld op:{" "}
                              {s.claimedAt ? formatDateTime(s.claimedAt) : "—"}
                            </span>
                            <span>
                              Invultijd:{" "}
                              {s.fillMinutes !== null ? `${s.fillMinutes} min` : "—"}
                            </span>
                          </div>
                        ) : s.status === "OFFERED" ? (
                          <span className="text-xs text-practice-link">
                            Aanbod verzonden aan {s.offeredCount} patiënt{s.offeredCount === 1 ? "" : "en"}
                          </span>
                        ) : s.status === "AVAILABLE" ? (
                          <span className="text-xs text-practice-subtle">
                            Nog niet ingevuld
                          </span>
                        ) : (
                          <span className="text-xs italic text-practice-subtle">
                            Niet hersteld (omzet gemist)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium">
                        {s.status === "CLAIMED" ? (
                          s.recoveredRevenueCents !== null ? (
                            <span className="text-teal-700 dark:text-teal-300">
                              {formatEuroCents(s.recoveredRevenueCents)}
                            </span>
                          ) : (
                            <span className="text-xs italic text-practice-subtle">
                              Waarde onbekend
                            </span>
                          )
                        ) : (
                          <span className="text-xs italic text-practice-subtle">
                            Nog geen waarde
                          </span>
                        )}
                      </td>
                      <td
                        className="px-4 py-3 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {s.status === "AVAILABLE" || s.status === "OFFERED" ? (
                          <Link
                            href={`/open-slots/${s.id}/matches`}
                            className="inline-flex items-center gap-1 rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-medium text-practice-link hover:border-blue-200 hover:bg-blue-100 dark:border-blue-900/40 dark:bg-blue-900/20 dark:hover:bg-blue-900/40"
                          >
                            <Send className="h-3 w-3" />
                            {s.status === "OFFERED" ? "Bekijk aanbiedingen" : "Vind patiënten"}
                          </Link>
                        ) : s.status === "CLAIMED" && s.claimedAppointmentId ? (
                          <div className="flex flex-col items-end gap-1">
                            {s.id === firstClaimedId && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-800">
                                Opnieuw bevestigd
                              </span>
                            )}
                            <Link
                              href={`/appointments/${s.claimedAppointmentId}`}
                              className="text-xs font-medium text-practice-link hover:text-practice-heading"
                            >
                              Bekijk afspraak →
                            </Link>
                          </div>
                        ) : s.status === "CLAIMED" ? (
                          // T3: CLAIMED without a linked appointment = orphaned
                          // snapshot. Communicate explicitly instead of a dash.
                          <span className="text-xs italic text-practice-subtle">
                            Details niet beschikbaar
                          </span>
                        ) : (
                          <span className="text-xs text-practice-subtle">—</span>
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
