"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Plus, Trash2, Search, ListPlus } from "lucide-react";
import { RISK_LABELS, STATUS_LABELS, TYPE_LABELS } from "@/lib/labels";

export type AppointmentStatus =
  | "SCHEDULED"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export interface ClientOption {
  id: string;
  firstName: string;
  lastName: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}
export interface PractitionerOption {
  id: string;
  firstName: string;
  lastName: string;
}
export interface TypeOption {
  id: string;
  name: string;          // Catalog name as stored, e.g. "C001 — Consult ten behoeve"
  durationMinutes: number;
  price: number;         // cents
}

/**
 * Picked treatment row in the form. Stores only the catalog id + qty;
 * code/name/tariff are looked up against the `types` prop at render time.
 */
export interface TreatmentSelection {
  appointmentTypeId: string;
  quantity: number;
}

export interface AppointmentFormValues {
  clientId: string;
  practitionerId: string;
  /** Multi-code list. New canonical field. */
  treatments: TreatmentSelection[];
  /** Legacy single-id field — kept in sync with treatments[0] on submit. */
  appointmentTypeId: string;
  startTime: string; // local datetime string, e.g. "2026-05-01T09:00"
  durationMinutes: number;
  /** Manually-overridable euros string (auto-recomputed when treatments change unless user edited). */
  revenueEstimateEuros: string;
  /** Tracks whether the user explicitly typed a revenue value — if so we
   *  don't overwrite it on subsequent treatment changes. */
  revenueDirty: boolean;
  /** Same idea for duration. */
  durationDirty: boolean;
  status: AppointmentStatus;
  notes: string;
}

export const emptyAppointment: AppointmentFormValues = {
  clientId: "",
  practitionerId: "",
  treatments: [],
  appointmentTypeId: "",
  startTime: "",
  durationMinutes: 60,
  revenueEstimateEuros: "0",
  revenueDirty: false,
  durationDirty: false,
  status: "SCHEDULED",
  notes: "",
};

interface Props {
  initial: AppointmentFormValues;
  mode: "create" | "edit";
  appointmentId?: string;
  clients: ClientOption[];
  practitioners: PractitionerOption[];
  types: TypeOption[];
}

const inputCls =
  "mt-1 block w-full rounded-lg border border-practice-field bg-practice-surface px-3 py-2 text-sm text-practice-heading placeholder-practice-subtle focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-practice-focus/20 ";
const labelCls = "block text-sm font-medium text-practice-ink ";

/** Format Date as `YYYY-MM-DDTHH:mm` in local timezone for datetime-local. */
function localDateTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

/** Format cents → "€12,34" Dutch locale. */
function formatEuros(cents: number): string {
  const safe = Number.isFinite(cents) ? cents : 0;
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(safe / 100);
}

/** Pull the leading code (e.g. "C001") from a catalog name; fallback to name. */
function codeOf(name: string): string {
  const m = name.match(/^([A-Z]\d{2,4}[A-Z]?)\s*[—–-]/);
  return m ? m[1] : name.slice(0, 8);
}

/** Strip the "<CODE> — " prefix to get the bare description. */
function descOf(name: string): string {
  return name.replace(/^[A-Z]\d{2,4}[A-Z]?\s*[—–-]\s*/, "");
}

export function AppointmentForm({
  initial,
  mode,
  appointmentId,
  clients,
  practitioners,
  types,
}: Props) {
  const router = useRouter();
  const [v, setV] = useState<AppointmentFormValues>(initial);
  const [saving, setSaving] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");

  function set<K extends keyof AppointmentFormValues>(key: K, val: AppointmentFormValues[K]) {
    setV((cur) => ({ ...cur, [key]: val }));
  }

  // Build a lookup so we don't .find() on every render row.
  const typeById = useMemo(() => {
    const m = new Map<string, TypeOption>();
    for (const t of types) m.set(t.id, t);
    return m;
  }, [types]);

  // Selected treatments → derived totals. Authoritative on the client (the
  // server recomputes server-side too — see /api/appointments POST/PATCH).
  const totals = useMemo(() => {
    let cents = 0;
    let minutes = 0;
    for (const sel of v.treatments) {
      const t = typeById.get(sel.appointmentTypeId);
      if (!t) continue;
      cents += t.price * sel.quantity;
      minutes += t.durationMinutes * sel.quantity;
    }
    return { cents, minutes };
  }, [v.treatments, typeById]);

  // Auto-sync revenue/duration to totals UNLESS the user has manually edited.
  // useMemo-as-effect avoids a separate useEffect.
  useMemo(() => {
    setV((cur) => {
      const nextRev = cur.revenueDirty
        ? cur.revenueEstimateEuros
        : (totals.cents / 100).toFixed(2);
      const nextDur = cur.durationDirty
        ? cur.durationMinutes
        : Math.max(5, Math.min(480, totals.minutes || cur.durationMinutes));
      if (nextRev === cur.revenueEstimateEuros && nextDur === cur.durationMinutes) return cur;
      return { ...cur, revenueEstimateEuros: nextRev, durationMinutes: nextDur };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totals.cents, totals.minutes]);

  function addTreatment(typeId: string) {
    setV((cur) => {
      const existing = cur.treatments.find((t) => t.appointmentTypeId === typeId);
      if (existing) {
        // Already added — bump quantity instead of duplicating.
        return {
          ...cur,
          treatments: cur.treatments.map((t) =>
            t.appointmentTypeId === typeId ? { ...t, quantity: Math.min(50, t.quantity + 1) } : t,
          ),
        };
      }
      return {
        ...cur,
        treatments: [...cur.treatments, { appointmentTypeId: typeId, quantity: 1 }],
      };
    });
    setPickerQuery("");
  }

  function updateQuantity(typeId: string, qty: number) {
    const safe = Math.max(1, Math.min(50, Math.floor(qty) || 1));
    setV((cur) => ({
      ...cur,
      treatments: cur.treatments.map((t) =>
        t.appointmentTypeId === typeId ? { ...t, quantity: safe } : t,
      ),
    }));
  }

  function removeTreatment(typeId: string) {
    setV((cur) => ({
      ...cur,
      treatments: cur.treatments.filter((t) => t.appointmentTypeId !== typeId),
    }));
  }

  // Show the complete catalog when browsing. A code prefix ("V", "V91")
  // filters on the treatment code; other searches also match descriptions.
  const filteredTypes = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    if (!q) return types;

    const isCodePrefix = /^[a-z]\d*$/.test(q);
    return types.filter((t) => {
      const code = codeOf(t.name).toLowerCase();
      return isCodePrefix
        ? code.startsWith(q)
        : code.includes(q) || descOf(t.name).toLowerCase().includes(q);
    });
  }, [types, pickerQuery]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        clientId: v.clientId,
        practitionerId: v.practitionerId,
        // Send treatments as the canonical multi-code list. Server is
        // authoritative for revenue/duration when this list is non-empty.
        treatments: v.treatments.map((t, idx) => ({
          appointmentTypeId: t.appointmentTypeId,
          quantity: t.quantity,
          sortOrder: idx,
        })),
        // Legacy single id — server keeps it in sync with treatments[0].
        appointmentTypeId:
          v.treatments[0]?.appointmentTypeId ?? v.appointmentTypeId ?? undefined,
        startTime: new Date(v.startTime).toISOString(),
        durationMinutes: Number(v.durationMinutes),
        status: v.status,
        notes: v.notes || undefined,
        revenueEstimateCents: Math.round(Number(v.revenueEstimateEuros || 0) * 100),
      };
      const url = mode === "create" ? "/api/appointments" : `/api/appointments/${appointmentId}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Opslaan mislukt");
      }
      const data = await res.json();
      toast.success(mode === "create" ? "Afspraak aangemaakt" : "Afspraak bijgewerkt");
      router.push(`/appointments/${data.appointment.id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Er is iets misgegaan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelCls} htmlFor="clientId">Patiënt *</label>
          <select
            id="clientId"
            required
            className={inputCls}
            value={v.clientId}
            onChange={(e) => set("clientId", e.target.value)}
          >
            <option value="">Kies een patiënt…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.lastName}, {c.firstName} — {RISK_LABELS[c.riskLevel] ?? c.riskLevel}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls} htmlFor="practitionerId">Behandelaar *</label>
          <select
            id="practitionerId"
            required
            className={inputCls}
            value={v.practitionerId}
            onChange={(e) => set("practitionerId", e.target.value)}
          >
            <option value="">Kies…</option>
            {practitioners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.firstName} {p.lastName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls} htmlFor="startTime">Starttijd *</label>
          <input
            id="startTime"
            type="datetime-local"
            required
            className={inputCls}
            value={v.startTime}
            onChange={(e) => set("startTime", e.target.value)}
            min={(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return localDateTime(d); })()}
            max={(() => { const d = new Date(); d.setFullYear(d.getFullYear() + 5); return localDateTime(d); })()}
          />
        </div>
      </div>

      {/* ─── Multi-code treatment picker ────────────────────────────────── */}
      <section
        aria-labelledby="treatments-heading"
        className="rounded-lg border border-practice-line bg-practice-muted/50 p-4"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3
            id="treatments-heading"
            className="flex items-center gap-2 text-sm font-semibold text-practice-heading"
          >
            <ListPlus className="h-4 w-4 text-blue-500" aria-hidden="true" />
            Behandelcodes
            <span className="text-xs font-normal text-practice-subtle">
              — Prijzen uit praktijkcatalogus
            </span>
          </h3>
          <span className="text-xs text-practice-subtle">
            {v.treatments.length} {v.treatments.length === 1 ? "code" : "codes"} · totaal {formatEuros(totals.cents)}
          </span>
        </div>

        {/* Selected list */}
        {v.treatments.length > 0 && (
          <ul className="mb-3 space-y-1.5">
            {v.treatments.map((sel) => {
              const t = typeById.get(sel.appointmentTypeId);
              if (!t) return null;
              const subtotal = t.price * sel.quantity;
              return (
                <li
                  key={sel.appointmentTypeId}
                  className="flex flex-wrap items-center gap-2 rounded-md border border-practice-line bg-practice-surface px-3 py-2 text-sm"
                >
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-practice-link dark:bg-blue-900/40">
                    {codeOf(t.name)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-practice-ink">
                    {descOf(TYPE_LABELS[t.name] ?? t.name)}
                  </span>
                  <span className="tabular-nums text-xs text-practice-subtle">
                    {formatEuros(t.price)}
                  </span>
                  <input
                    type="number"
                    aria-label={`Aantal voor ${codeOf(t.name)}`}
                    min={1}
                    max={50}
                    value={sel.quantity}
                    onChange={(e) => updateQuantity(sel.appointmentTypeId, Number(e.target.value))}
                    className="w-14 rounded border border-practice-field px-2 py-1 text-right text-xs tabular-nums"
                  />
                  <span className="w-20 text-right tabular-nums text-sm font-medium text-practice-heading">
                    {formatEuros(subtotal)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeTreatment(sel.appointmentTypeId)}
                    aria-label={`Verwijder ${codeOf(t.name)}`}
                    className="rounded p-1 text-practice-subtle hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* Picker */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-practice-subtle" />
            <input
              type="search"
              value={pickerQuery}
              onChange={(e) => setPickerQuery(e.target.value)}
              placeholder="Zoek op code (bv. C001) of omschrijving (bv. consult)…"
              aria-label="Zoek behandelcodes"
              className="w-full rounded-md border border-practice-field bg-practice-surface py-2 pl-9 pr-3 text-sm text-practice-heading placeholder-practice-subtle focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-practice-focus/20"
            />
          </div>

          {types.length === 0 ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
              Geen behandelcodes beschikbaar. Ga naar Instellingen →
              &laquo;NZa 2026 importeren&raquo; om de behandelcatalog
              te importeren.
            </p>
          ) : (
            <ul
              role="listbox"
              aria-label="Behandelcodes, scroll voor alle codes"
              className="max-h-96 overflow-y-auto overscroll-contain rounded-md border border-practice-line bg-practice-surface text-sm"
            >
              {filteredTypes.length === 0 && (
                <li className="px-3 py-2 text-xs text-practice-subtle">Geen resultaten.</li>
              )}
              {filteredTypes.map((t) => {
                const alreadySelected = v.treatments.some((sel) => sel.appointmentTypeId === t.id);
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => addTreatment(t.id)}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left transition hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    >
                      <span className="rounded bg-practice-muted px-1.5 py-0.5 font-mono text-xs text-practice-subtle">
                        {codeOf(t.name)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-practice-ink">
                        {descOf(TYPE_LABELS[t.name] ?? t.name)}
                      </span>
                      <span className="tabular-nums text-xs text-practice-subtle">
                        {t.durationMinutes}min · {formatEuros(t.price)}
                      </span>
                      <Plus
                        className={`h-4 w-4 shrink-0 ${
                          alreadySelected ? "text-emerald-500" : "text-blue-500"
                        }`}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={labelCls} htmlFor="durationMinutes">
            Duur (minuten)
            {!v.durationDirty && totals.minutes > 0 && (
              <span className="ml-2 text-xs font-normal text-practice-subtle">
                — automatisch
              </span>
            )}
          </label>
          <input
            id="durationMinutes"
            type="number"
            min={5}
            max={480}
            className={inputCls}
            value={v.durationMinutes}
            onChange={(e) => setV((cur) => ({
              ...cur,
              durationMinutes: Number(e.target.value),
              durationDirty: true,
            }))}
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="revenueEstimateEuros">
            Omzetverwachting (€)
            {!v.revenueDirty && totals.cents > 0 && (
              <span className="ml-2 text-xs font-normal text-practice-subtle">
                — uit codes
              </span>
            )}
          </label>
          <input
            id="revenueEstimateEuros"
            type="number"
            step="0.01"
            min={0}
            className={inputCls}
            value={v.revenueEstimateEuros}
            onChange={(e) => setV((cur) => ({
              ...cur,
              revenueEstimateEuros: e.target.value,
              revenueDirty: true,
            }))}
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="status">Status</label>
          <select
            id="status"
            className={inputCls}
            value={v.status}
            onChange={(e) => set("status", e.target.value as AppointmentStatus)}
          >
            <option value="SCHEDULED">{STATUS_LABELS.SCHEDULED}</option>
            <option value="CONFIRMED">{STATUS_LABELS.CONFIRMED}</option>
            <option value="IN_PROGRESS">{STATUS_LABELS.IN_PROGRESS}</option>
            <option value="COMPLETED">{STATUS_LABELS.COMPLETED}</option>
            <option value="CANCELLED">{STATUS_LABELS.CANCELLED}</option>
            <option value="NO_SHOW">{STATUS_LABELS.NO_SHOW}</option>
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls} htmlFor="notes">Notities</label>
        <textarea
          id="notes"
          rows={4}
          className={inputCls}
          value={v.notes}
          onChange={(e) => set("notes", e.target.value)}
        />
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-practice-line pt-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-practice-field px-4 py-2 text-sm font-medium text-practice-ink hover:bg-practice-hover"
        >
          Annuleren
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-practice-primary px-4 py-2 text-sm font-medium text-practice-on-primary hover:bg-practice-primary-hover disabled:opacity-50"
        >
          {saving ? "Opslaan…" : mode === "create" ? "Afspraak aanmaken" : "Wijzigingen opslaan"}
        </button>
      </div>
    </form>
  );
}
