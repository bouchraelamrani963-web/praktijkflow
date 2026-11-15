"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Sun, Moon, Monitor, Sparkles, ListPlus } from "lucide-react";
import toast from "react-hot-toast";
import { can } from "@/lib/auth/permissions";
import type { Role } from "@/generated/prisma/client";
import { readPracticeTheme, setPracticeTheme, type PracticeTheme } from "@/lib/practice-theme";
import { useAuth } from "@/lib/hooks/useAuth";

interface Member {
  id: string;
  role: Role;
  isActive: boolean;
  user: { firstName: string; lastName: string };
}

const memberRoles: Record<Role, string> = {
  OWNER: "Eigenaar", ADMIN: "Beheerder", PRACTITIONER: "Zorgverlener", ASSISTANT: "Assistent",
};

function PracticeMembers() {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    setError("");
    try {
      const response = await fetch("/api/settings/members", { cache: "no-store", signal });
      if (!response.ok) throw new Error();
      const result = await response.json() as { members: Member[] };
      if (!signal?.aborted) setMembers(result.members);
    } catch {
      if (!signal?.aborted) setError("Medewerkers konden niet worden geladen.");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function revoke(id: string) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/settings/members/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      setMembers((current) => current?.map((member) => member.id === id
        ? { ...member, isActive: false } : member) ?? null);
      setConfirmation(null);
    } catch {
      setError("Toegang intrekken is mislukt.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-5 rounded-xl border border-practice-line bg-practice-surface p-4">
      <h2 className="text-sm font-semibold">Medewerkers en toegang</h2>
      {error && <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</p>}
      {!members && (error
        ? <button type="button" onClick={() => void load()} className="mt-2 text-sm underline">Opnieuw proberen</button>
        : <p role="status" className="mt-2 text-sm">Medewerkers laden…</p>)}
      {members && (
        <ul className="mt-2 divide-y divide-practice-line">
          {members.map((member) => (
            <li key={member.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <div className="min-w-0 break-words">
                <p className="font-medium">{member.user.firstName} {member.user.lastName}</p>
                <p>{memberRoles[member.role]}{!member.isActive && " · Toegang ingetrokken"}</p>
              </div>
              {member.isActive && member.role !== "OWNER" && (
                confirmation === member.id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" disabled={saving} onClick={() => setConfirmation(null)} className="min-h-10 px-2">Annuleren</button>
                    <button type="button" disabled={saving} onClick={() => void revoke(member.id)} className="min-h-10 rounded bg-red-700 px-2 text-practice-on-primary">Intrekken bevestigen</button>
                  </div>
                ) : (
                  <button type="button" disabled={saving} onClick={() => setConfirmation(member.id)} className="min-h-10 rounded border border-practice-field px-2">Toegang intrekken</button>
                )
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

interface PracticeData {
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  zipCode: string | null;
  kvkNumber: string | null;
  agbCode: string | null;
}

interface LocalSettings {
  reminder48h: boolean;
  reminder24h: boolean;
  openingTime: string;
  closingTime: string;
}

function getLocalSettings(): LocalSettings {
  if (typeof window === "undefined") {
    return { reminder48h: true, reminder24h: true, openingTime: "08:00", closingTime: "18:00" };
  }
  const raw = localStorage.getItem("pf-settings");
  if (raw) {
    try { return JSON.parse(raw); } catch { /* ignore */ }
  }
  return { reminder48h: true, reminder24h: true, openingTime: "08:00", closingTime: "18:00" };
}

export default function InstellingenPage() {
  const { profile } = useAuth();
  const canEditPractice = can(profile?.role ?? null, "practiceSettings");
  const [practice, setPractice] = useState<PracticeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [theme, setTheme] = useState<PracticeTheme>("light");
  const [local, setLocal] = useState<LocalSettings>({
    reminder48h: true,
    reminder24h: true,
    openingTime: "08:00",
    closingTime: "18:00",
  });

  const fetchPractice = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPractice(data.practice);
    } catch {
      toast.error("Kan instellingen niet laden");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPractice();
    setTheme(readPracticeTheme());
    setLocal(getLocalSettings());
  }, [fetchPractice]);

  function handleTheme(t: PracticeTheme) {
    setTheme(t);
    setPracticeTheme(t);
  }

  function handleLocalChange(key: keyof LocalSettings, value: boolean | string) {
    const next = { ...local, [key]: value };
    setLocal(next);
    localStorage.setItem("pf-settings", JSON.stringify(next));
    toast.success("Instelling opgeslagen");
  }

  async function handleSavePractice(e: React.FormEvent) {
    e.preventDefault();
    if (!practice || !canEditPractice) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(practice),
      });
      if (!res.ok) throw new Error();
      toast.success("Praktijkgegevens opgeslagen");
    } catch {
      toast.error("Opslaan mislukt");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="ns-app-settings">
      <div className="ns-app-settings-heading mb-6">
        <p className="ns-app-eyebrow">PRAKTIJKBEHEER</p>
        <h1 className="text-2xl font-bold text-practice-heading">Instellingen</h1>
        <p className="mt-1 text-sm text-practice-subtle">
          Beheer uw praktijkgegevens en voorkeuren
        </p>
      </div>

      <div className="ns-app-settings-grid grid gap-6 lg:grid-cols-2">
        {/* Practice info */}
        <div className="ns-app-settings-panel ns-app-settings-practice rounded-xl border border-practice-line bg-practice-surface p-6">
          <h2 className="text-sm font-semibold text-practice-heading">Praktijkgegevens</h2>
          {practice && (
            <form onSubmit={handleSavePractice} className="mt-4">
              {!canEditPractice && <p className="mb-3 text-sm text-practice-subtle">Alleen de praktijkeigenaar kan deze gegevens wijzigen.</p>}
              <fieldset disabled={!canEditPractice || saving} className="min-w-0 space-y-4">
                <Field label="Naam" value={practice.name} onChange={(v) => setPractice({ ...practice, name: v })} />
                <Field label="E-mail" value={practice.email ?? ""} onChange={(v) => setPractice({ ...practice, email: v || null })} type="email" />
                <Field label="Telefoon" value={practice.phone ?? ""} onChange={(v) => setPractice({ ...practice, phone: v || null })} />
                <Field label="Adres" value={practice.address ?? ""} onChange={(v) => setPractice({ ...practice, address: v || null })} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Postcode" value={practice.zipCode ?? ""} onChange={(v) => setPractice({ ...practice, zipCode: v || null })} />
                  <Field label="Plaats" value={practice.city ?? ""} onChange={(v) => setPractice({ ...practice, city: v || null })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="KVK-nummer" value={practice.kvkNumber ?? ""} onChange={(v) => setPractice({ ...practice, kvkNumber: v || null })} />
                  <Field label="AGB-code" value={practice.agbCode ?? ""} onChange={(v) => setPractice({ ...practice, agbCode: v || null })} />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-practice-primary px-4 py-2 text-sm font-medium text-practice-on-primary hover:bg-practice-primary-hover disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Opslaan…" : "Opslaan"}
                </button>
              </fieldset>
            </form>
          )}
          {canEditPractice && <PracticeMembers />}
        </div>

        {/* Right column */}
        <div className="ns-app-settings-aside space-y-6">
          {/* Theme */}
          <div className="rounded-xl border border-practice-line bg-practice-surface p-6">
            <h2 className="text-sm font-semibold text-practice-heading">Thema</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {([
                { value: "light" as PracticeTheme, icon: Sun, label: "Licht" },
                { value: "dark" as PracticeTheme, icon: Moon, label: "Donker" },
                { value: "system" as PracticeTheme, icon: Monitor, label: "Systeem" },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleTheme(opt.value)}
                  aria-pressed={theme === opt.value}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    theme === opt.value
                      ? "border-blue-600 bg-blue-50 text-practice-link dark:bg-blue-900/30 "
                      : "border-practice-line text-practice-ink hover:bg-practice-hover "
                  }`}
                >
                  <opt.icon className="h-4 w-4" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reminder settings */}
          <div className="rounded-xl border border-practice-line bg-practice-surface p-6">
            <h2 className="text-sm font-semibold text-practice-heading">No-show herinneringen</h2>
            <div className="mt-4 space-y-3">
              <Toggle
                label="48 uur herinnering"
                description="SMS-herinnering 48 uur voor de afspraak"
                checked={local.reminder48h}
                onChange={(v) => handleLocalChange("reminder48h", v)}
              />
              <Toggle
                label="24 uur herinnering"
                description="SMS-herinnering 24 uur voor de afspraak"
                checked={local.reminder24h}
                onChange={(v) => handleLocalChange("reminder24h", v)}
              />
            </div>
          </div>

          {/* Specialistische beheeracties blijven beschikbaar, maar
              domineren niet langer de dagelijkse praktijkinstellingen. */}
          {can(profile?.role ?? null, "demoData") && (
            <details className="ns-app-advanced">
              <summary>Geavanceerd beheer</summary>
              <div className="ns-app-advanced-content">
                {canEditPractice && <Nza2026ImportPanel />}
                <DemoDataPanel />
              </div>
            </details>
          )}

          {/* Opening hours */}
          <div className="rounded-xl border border-practice-line bg-practice-surface p-6">
            <h2 className="text-sm font-semibold text-practice-heading">Openingstijden</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-practice-subtle">Opening</label>
                <input
                  type="time"
                  value={local.openingTime}
                  onChange={(e) => handleLocalChange("openingTime", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-practice-field bg-practice-surface px-3 py-2 text-sm text-practice-heading focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-practice-focus/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-practice-subtle">Sluiting</label>
                <input
                  type="time"
                  value={local.closingTime}
                  onChange={(e) => handleLocalChange("closingTime", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-practice-field bg-practice-surface px-3 py-2 text-sm text-practice-heading focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-practice-focus/20"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


function Nza2026ImportPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<null | { total: number; created: number; updated: number; unchanged: number; deactivatedDuplicates: number; oldDentalUnverified: number }>(null);

  async function importFile() {
    if (!file || busy) return;
    setBusy(true);
    setResult(null);
    try {
      if (file.size > 400000 || !file.name.toLowerCase().endsWith(".json")) {
        throw new Error("Selecteer het gecontroleerde NZa 2026 JSON-bestand.");
      }
      const input = JSON.parse(await file.text());
      const res = await fetch("/api/admin/import-nza-2026", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const output = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(output.error || "Import mislukt.");
      setResult(output);
      toast.success("NZa 2026-tarieven verwerkt in Preview.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import mislukt.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-practice-surface p-6 dark:border-blue-900">
      <h2 className="text-sm font-semibold text-practice-heading">
        NZa tandheelkundige tarieven 2026 — Preview
      </h2>
      <p className="mt-2 text-xs leading-5 text-practice-subtle">
        Werk 322 vaste NZa-tarieven uit TB/REG-26616-01 bij. De vier codes
        zonder vast bedrag (A20, R90, J050 en Y02) worden niet ingevoerd.
        Orthodontie (F-codes) valt buiten deze bron. Bestaande afspraken en
        hun vastgelegde tarieven worden niet gewijzigd.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input type="file" accept=".json,application/json"
          aria-label="NZa 2026 JSON-bestand"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="max-w-full text-xs text-practice-ink" />
        <button type="button" onClick={importFile} disabled={!file || busy}
          className="rounded-md bg-practice-primary px-3 py-2 text-sm font-semibold text-practice-on-primary disabled:opacity-50">
          {busy ? "Importeren…" : "NZa 2026 importeren"}
        </button>
      </div>
      {result && <p className="mt-3 text-xs text-emerald-700 dark:text-emerald-400">
        {result.total} verwerkt: {result.created} toegevoegd, {result.updated} bijgewerkt,
        {result.unchanged} al actueel en {result.deactivatedDuplicates} dubbele codes verborgen.
        {result.oldDentalUnverified > 0 ? " Oude codes zonder vastgesteld 2026-tarief blijven apart te controleren." : ""}
      </p>}
    </div>
  );
}

/**
 * Demo / sample data loader.
 *
 * Calls the idempotent POST /api/admin/seed-demo endpoint. The endpoint
 * itself enforces the safety guards (DATABASE_URL must be set, Firebase
 * Admin must NOT be configured) — this UI just surfaces the result.
 *
 * State machine kept local; no global toast-only feedback so a dismissed
 * toast still leaves the operator looking at why the click did nothing.
 */
type SeedUiState =
  | { kind: "idle" }
  | { kind: "seeding" }
  | { kind: "missing-db"; hint: string }
  | { kind: "error"; message: string }
  | { kind: "done"; alreadySeeded: boolean; clients: number; appointments: number };

function DemoDataPanel() {
  const router = useRouter();
  const [state, setState] = useState<SeedUiState>({ kind: "idle" });
  const seeding = state.kind === "seeding";

  async function handleSeed() {
    setState({ kind: "seeding" });
    try {
      const res = await fetch("/api/admin/seed-demo", { method: "POST" });
      const data: {
        success?: boolean;
        databaseConfigured?: boolean;
        alreadySeeded?: boolean;
        error?: string;
        hint?: string;
        message?: string;
        counts?: { clients?: number; appointments?: number };
      } = await res.json().catch(() => ({}));

      if (!res.ok || data.success === false) {
        if (data.databaseConfigured === false) {
          const hint = data.hint ?? "Configureer DATABASE_URL in Vercel.";
          setState({ kind: "missing-db", hint });
          toast.error(`${data.error ?? "Geen database"} — ${hint}`);
        } else {
          const message = data.message ?? data.error ?? "Voorbeelddata laden mislukt";
          setState({ kind: "error", message });
          toast.error(message);
        }
        return;
      }

      const c = data.counts ?? {};
      setState({
        kind: "done",
        alreadySeeded: !!data.alreadySeeded,
        clients: c.clients ?? 0,
        appointments: c.appointments ?? 0,
      });
      if (data.alreadySeeded) {
        toast.success("Voorbeelddata is al aanwezig.");
      } else {
        toast.success(`Voorbeelddata geladen: ${c.clients ?? 0} patiënten · ${c.appointments ?? 0} afspraken.`);
      }
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Voorbeelddata laden mislukt";
      setState({ kind: "error", message });
      toast.error(message);
    }
  }

  return (
    <div className="rounded-xl border border-practice-line bg-practice-surface p-6">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-purple-500" aria-hidden="true" />
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-practice-heading">
            Voorbeelddata
          </h2>
          <p className="mt-1 text-xs text-practice-subtle">
            Vul de praktijk eenmalig met een complete demo-set: 1 praktijk
            met 2 behandelaren, 15 patiënten, 27 afspraken (verleden, vandaag
            en toekomst), 2 open plekken, 4 wachtlijstvermeldingen en 4
            facturen. Idempotent — herhaaldelijk klikken doet niets als de
            data al bestaat.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSeed}
          disabled={seeding}
          aria-busy={seeding}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-practice-field bg-practice-surface px-3 py-1.5 text-xs font-medium text-practice-ink transition hover:bg-practice-hover disabled:opacity-60"
        >
          {seeding && (
            <span
              aria-hidden="true"
              className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-400 border-t-zinc-700 dark:border-t-zinc-200"
            />
          )}
          {seeding ? "Bezig…" : "Voorbeelddata laden"}
        </button>
      </div>

      {state.kind === "missing-db" && (
        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          <strong>DATABASE_URL ontbreekt.</strong> {state.hint}
        </p>
      )}
      {state.kind === "error" && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300">
          <strong>Laden mislukt:</strong> {state.message}
        </p>
      )}
      {state.kind === "done" && (
        <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
          {state.alreadySeeded
            ? "Voorbeelddata is al aanwezig — geen wijzigingen."
            : `Voorbeelddata geladen: ${state.clients} patiënten · ${state.appointments} afspraken.`}
        </p>
      )}
    </div>
  );
}

/**
 * Restore standard treatment-type catalog.
 *
 * Calls POST /api/admin/restore-treatment-types — endpoint is idempotent
 * (skips names already present, only adds missing ones), so the operator
 * can click this safely without worrying about duplicates of types they
 * already use.
 */
type RestoreUiState =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "done"; added: number; skipped: number; message: string }
  | { kind: "error"; message: string };

function RestoreTreatmentTypesPanel() {
  const router = useRouter();
  const [state, setState] = useState<RestoreUiState>({ kind: "idle" });
  const running = state.kind === "running";

  async function handleRestore() {
    setState({ kind: "running" });
    try {
      const res = await fetch("/api/admin/restore-treatment-types", { method: "POST" });
      const data: {
        success?: boolean;
        added?: number;
        skipped?: number;
        message?: string;
        error?: string;
      } = await res.json().catch(() => ({}));

      if (!res.ok || data.success === false) {
        const message = data.message ?? data.error ?? "Herstellen mislukt";
        setState({ kind: "error", message });
        toast.error(message);
        return;
      }

      const added = data.added ?? 0;
      const skipped = data.skipped ?? 0;
      setState({
        kind: "done",
        added,
        skipped,
        message: data.message ?? `${added} toegevoegd, ${skipped} overgeslagen.`,
      });
      if (added === 0) {
        toast.success("Alle standaard behandeltypes zijn al aanwezig.");
      } else {
        toast.success(`${added} behandeltype${added === 1 ? "" : "s"} toegevoegd.`);
      }
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Herstellen mislukt";
      setState({ kind: "error", message });
      toast.error(message);
    }
  }

  return (
    <div className="rounded-xl border border-practice-line bg-practice-surface p-6">
      <div className="flex items-start gap-3">
        <ListPlus className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" aria-hidden="true" />
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-practice-heading">
            Standaard behandelcodes 2025 laden
          </h2>
          <p className="mt-1 text-xs text-practice-subtle">
            Importeert de officiële KNMT-codes uit het Tarievenboekje 2025
            (C, X, M, A, B, V, E, R, G, H, P, T, J, U, Y en F). Tarieven
            zijn de NZa-maximumtarieven 2025. Bestaande codes met dezelfde
            naam worden overgeslagen — uw eigen aanpassingen blijven behouden.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRestore}
          disabled={running}
          aria-busy={running}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-practice-field bg-practice-surface px-3 py-1.5 text-xs font-medium text-practice-ink transition hover:bg-practice-hover disabled:opacity-60"
        >
          {running && (
            <span
              aria-hidden="true"
              className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-400 border-t-zinc-700 dark:border-t-zinc-200"
            />
          )}
          {running ? "Bezig…" : "Standaard behandelcodes 2025 laden"}
        </button>
      </div>

      {state.kind === "done" && (
        <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
          {state.message}
        </p>
      )}
      {state.kind === "error" && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300">
          <strong>Mislukt:</strong> {state.message}
        </p>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-practice-subtle">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-practice-field bg-practice-surface px-3 py-2 text-sm text-practice-heading focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-practice-focus/20"
      />
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-practice-heading">{label}</p>
        <p className="text-xs text-practice-subtle">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
          checked ? "bg-practice-primary" : "bg-practice-line "
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-practice-surface shadow-sm transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </label>
  );
}
