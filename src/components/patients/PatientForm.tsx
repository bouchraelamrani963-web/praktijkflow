"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export interface PatientFormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  bsn: string;
  address: string;
  city: string;
  zipCode: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  notes: string;
  isActive: boolean;
  waitlistOptIn: boolean;
  communicationPreference: "EMAIL" | "SMS" | "PHONE" | "NONE";
}

export const emptyPatient: PatientFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  bsn: "",
  address: "",
  city: "",
  zipCode: "",
  riskLevel: "LOW",
  notes: "",
  isActive: true,
  waitlistOptIn: false,
  communicationPreference: "EMAIL",
};

interface Props {
  initial: PatientFormValues;
  mode: "create" | "edit";
  patientId?: string;
}

const inputCls =
  "mt-1 block w-full rounded-lg border border-practice-field bg-practice-surface px-3 py-2 text-sm text-practice-heading placeholder-practice-subtle focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-practice-focus/20 ";
const labelCls = "block text-sm font-medium text-practice-ink ";

export function PatientForm({ initial, mode, patientId }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<PatientFormValues>(initial);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof PatientFormValues>(key: K, val: PatientFormValues[K]) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const url = mode === "create" ? "/api/patients" : `/api/patients/${patientId}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Opslaan mislukt");
      }
      const data = await res.json();
      toast.success(mode === "create" ? "Patiënt aangemaakt" : "Patiënt bijgewerkt");
      router.push(`/patients/${data.patient.id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Er is iets misgegaan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section>
        <h2 className="text-base font-semibold text-practice-heading">Persoonsgegevens</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="firstName">Voornaam *</label>
            <input id="firstName" required className={inputCls} value={values.firstName} onChange={(e) => set("firstName", e.target.value)} />
          </div>
          <div>
            <label className={labelCls} htmlFor="lastName">Achternaam *</label>
            <input id="lastName" required className={inputCls} value={values.lastName} onChange={(e) => set("lastName", e.target.value)} />
          </div>
          <div>
            <label className={labelCls} htmlFor="dateOfBirth">Geboortedatum</label>
            {/* min/max bound the year-spinner so users can't accidentally land on
                e.g. year 0009 by typing a single digit (which is HTML5 default
                behaviour without bounds). today is recomputed each render so
                the upper bound stays accurate. */}
            <input
              id="dateOfBirth"
              type="date"
              className={inputCls}
              value={values.dateOfBirth}
              onChange={(e) => set("dateOfBirth", e.target.value)}
              min="1900-01-01"
              max={new Date().toISOString().slice(0, 10)}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="bsn">BSN</label>
            <input id="bsn" inputMode="numeric" pattern="\d{8,9}" className={inputCls} value={values.bsn} onChange={(e) => set("bsn", e.target.value)} placeholder="123456789" />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-practice-heading">Contact</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="email">E-mail</label>
            <input id="email" type="email" className={inputCls} value={values.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div>
            <label className={labelCls} htmlFor="phone">Telefoon</label>
            <input id="phone" type="tel" className={inputCls} value={values.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+31 6 12345678" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="address">Adres</label>
            <input id="address" className={inputCls} value={values.address} onChange={(e) => set("address", e.target.value)} />
          </div>
          <div>
            <label className={labelCls} htmlFor="city">Plaats</label>
            <input id="city" className={inputCls} value={values.city} onChange={(e) => set("city", e.target.value)} />
          </div>
          <div>
            <label className={labelCls} htmlFor="zipCode">Postcode</label>
            <input id="zipCode" className={inputCls} value={values.zipCode} onChange={(e) => set("zipCode", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="communicationPreference">Contactvoorkeur</label>
            <select
              id="communicationPreference"
              className={inputCls}
              value={values.communicationPreference}
              onChange={(e) => set("communicationPreference", e.target.value as PatientFormValues["communicationPreference"])}
            >
              <option value="EMAIL">E-mail</option>
              <option value="SMS">SMS</option>
              <option value="PHONE">Telefoon</option>
              <option value="NONE">Geen contact</option>
            </select>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-practice-heading">Klinisch</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="riskLevel">Risiconiveau</label>
            <select
              id="riskLevel"
              className={inputCls}
              value={values.riskLevel}
              onChange={(e) => set("riskLevel", e.target.value as PatientFormValues["riskLevel"])}
            >
              <option value="LOW">Laag</option>
              <option value="MEDIUM">Gemiddeld</option>
              <option value="HIGH">Hoog</option>
              <option value="CRITICAL">Kritiek</option>
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-practice-ink">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-practice-field text-practice-link focus:ring-practice-focus"
                checked={values.waitlistOptIn}
                onChange={(e) => set("waitlistOptIn", e.target.checked)}
              />
              Aanmelden voor wachtlijst-meldingen
            </label>
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="notes">Notities</label>
            <textarea
              id="notes"
              rows={4}
              className={inputCls}
              value={values.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Klinische notities, voorkeuren, toegankelijkheidsbehoeften…"
            />
          </div>
          {mode === "edit" && (
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-practice-ink">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-practice-field text-practice-link focus:ring-practice-focus"
                  checked={values.isActive}
                  onChange={(e) => set("isActive", e.target.checked)}
                />
                Actieve patiënt
              </label>
            </div>
          )}
        </div>
      </section>

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
          {saving ? "Opslaan…" : mode === "create" ? "Patiënt aanmaken" : "Wijzigingen opslaan"}
        </button>
      </div>
    </form>
  );
}
