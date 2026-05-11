"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Sun, Moon, Monitor, Sparkles, ListPlus } from "lucide-react";
import toast from "react-hot-toast";

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

type Theme = "light" | "dark" | "system";

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  return (localStorage.getItem("pf-theme") as Theme) ?? "system";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else if (theme === "light") {
    root.classList.remove("dark");
  } else {
    // system
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }
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
  const [practice, setPractice] = useState<PracticeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [theme, setTheme] = useState<Theme>("system");
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
    setTheme(getStoredTheme());
    setLocal(getLocalSettings());
  }, [fetchPractice]);

  function handleTheme(t: Theme) {
    setTheme(t);
    localStorage.setItem("pf-theme", t);
    applyTheme(t);
  }

  function handleLocalChange(key: keyof LocalSettings, value: boolean | string) {
    const next = { ...local, [key]: value };
    setLocal(next);
    localStorage.setItem("pf-settings", JSON.stringify(next));
    toast.success("Instelling opgeslagen");
  }

  async function handleSavePractice(e: React.FormEvent) {
    e.preventDefault();
    if (!practice) return;
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
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Instellingen</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Beheer uw praktijkgegevens en voorkeuren
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Practice info */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Praktijkgegevens</h2>
          {practice && (
            <form onSubmit={handleSavePractice} className="mt-4 space-y-4">
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
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? "Opslaan…" : "Opslaan"}
              </button>
            </form>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Theme */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Thema</h2>
            <div className="mt-4 flex gap-2">
              {([
                { value: "light" as Theme, icon: Sun, label: "Licht" },
                { value: "dark" as Theme, icon: Moon, label: "Donker" },
                { value: "system" as Theme, icon: Monitor, label: "Systeem" },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleTheme(opt.value)}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    theme === opt.value
                      ? "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      : "border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                >
                  <opt.icon className="h-4 w-4" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reminder settings */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">No-show herinneringen</h2>
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

          {/* Standard treatment-type catalog restore. Idempotent — only
              adds the default Dutch dental codes that aren't already
              present in this practice. Useful for older accounts that
              were created before /api/auth/register seeded them, or after
              an accidental delete. */}
          <RestoreTreatmentTypesPanel />

          {/* Demo / sample data — moved here from the prior dashboard
              top-banner. Lives in settings because (a) it's an admin action,
              not part of normal daily flow, and (b) production users never
              need to see "Demo-modus actief" splashed across their dashboard. */}
          <DemoDataPanel />

          {/* Opening hours */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Openingstijden</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-500">Opening</label>
                <input
                  type="time"
                  value={local.openingTime}
                  onChange={(e) => handleLocalChange("openingTime", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500">Sluiting</label>
                <input
                  type="time"
                  value={local.closingTime}
                  onChange={(e) => handleLocalChange("closingTime", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
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
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-purple-500" aria-hidden="true" />
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Voorbeelddata
          </h2>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
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
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          {seeding && (
            <span
              aria-hidden="true"
              className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-400 border-t-zinc-700 dark:border-zinc-600 dark:border-t-zinc-200"
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
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start gap-3">
        <ListPlus className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" aria-hidden="true" />
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Standaard behandeltypes
          </h2>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            Voegt de standaard Nederlandse tandheelkundige behandelingen toe
            (C-, M-, A-, X-, V-, E-, T-, R-, P- en F-codes). Bestaande types
            met dezelfde naam worden overgeslagen — uw eigen aanpassingen
            blijven behouden.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRestore}
          disabled={running}
          aria-busy={running}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          {running && (
            <span
              aria-hidden="true"
              className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-400 border-t-zinc-700 dark:border-zinc-600 dark:border-t-zinc-200"
            />
          )}
          {running ? "Bezig…" : "Herstel standaard types"}
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
      <label className="block text-xs font-medium text-zinc-500">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
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
        <p className="text-sm font-medium text-zinc-900 dark:text-white">{label}</p>
        <p className="text-xs text-zinc-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
          checked ? "bg-blue-600" : "bg-zinc-200 dark:bg-zinc-700"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </label>
  );
}
