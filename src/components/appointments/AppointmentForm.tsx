"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
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
  name: string;
  durationMinutes: number;
  price: number; // cents
}

export interface AppointmentFormValues {
  clientId: string;
  practitionerId: string;
  appointmentTypeId: string;
  startTime: string; // local datetime string, e.g. "2026-05-01T09:00"
  durationMinutes: number;
  revenueEstimateEuros: string; // string so the input stays empty-able
  status: AppointmentStatus;
  notes: string;
}

export const emptyAppointment: AppointmentFormValues = {
  clientId: "",
  practitionerId: "",
  appointmentTypeId: "",
  startTime: "",
  durationMinutes: 60,
  revenueEstimateEuros: "0",
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
  "mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white";
const labelCls = "block text-sm font-medium text-zinc-700 dark:text-zinc-300";

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

  function set<K extends keyof AppointmentFormValues>(key: K, val: AppointmentFormValues[K]) {
    setV((cur) => ({ ...cur, [key]: val }));
  }

  function handleTypeChange(typeId: string) {
    const type = types.find((t) => t.id === typeId);
    setV((cur) => ({
      ...cur,
      appointmentTypeId: typeId,
      durationMinutes: type?.durationMinutes ?? cur.durationMinutes,
      revenueEstimateEuros: type ? ((Number.isFinite(type.price) ? type.price : 0) / 100).toFixed(2) : cur.revenueEstimateEuros,
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        clientId: v.clientId,
        practitionerId: v.practitionerId,
        appointmentTypeId: v.appointmentTypeId || undefined,
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
          <label className={labelCls} htmlFor="appointmentTypeId">Type behandeling</label>
          <select
            id="appointmentTypeId"
            className={inputCls}
            value={v.appointmentTypeId}
            onChange={(e) => handleTypeChange(e.target.value)}
          >
            <option value="">Geen</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {TYPE_LABELS[t.name] ?? t.name} ({t.durationMinutes} min · €{((Number.isFinite(t.price) ? t.price : 0) / 100).toFixed(2)})
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
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="durationMinutes">Duur (minuten)</label>
          <input
            id="durationMinutes"
            type="number"
            min={5}
            max={480}
            className={inputCls}
            value={v.durationMinutes}
            onChange={(e) => set("durationMinutes", Number(e.target.value))}
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="revenueEstimateEuros">Omzetverwachting (€)</label>
          <input
            id="revenueEstimateEuros"
            type="number"
            step="0.01"
            min={0}
            className={inputCls}
            value={v.revenueEstimateEuros}
            onChange={(e) => set("revenueEstimateEuros", e.target.value)}
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

        <div className="sm:col-span-2">
          <label className={labelCls} htmlFor="notes">Notities</label>
          <textarea
            id="notes"
            rows={4}
            className={inputCls}
            value={v.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Annuleren
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Opslaan…" : mode === "create" ? "Afspraak aanmaken" : "Wijzigingen opslaan"}
        </button>
      </div>
    </form>
  );
}
