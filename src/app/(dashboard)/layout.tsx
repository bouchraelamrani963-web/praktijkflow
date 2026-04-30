"use client";

import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import toast from "react-hot-toast";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Settings,
  LogOut,
  CreditCard,
  CalendarClock,
  ClipboardList,
  HelpCircle,
  Sparkles,
} from "lucide-react";

const sidebarLinks = [
  { href: "/dashboard",    label: "Dashboard",    icon: LayoutDashboard },
  { href: "/appointments", label: "Afspraken",    icon: Calendar },
  { href: "/open-slots",   label: "Open plekken", icon: CalendarClock },
  { href: "/waitlist",     label: "Wachtlijst",   icon: ClipboardList },
  { href: "/patients",     label: "Patiënten",    icon: Users },
  { href: "/facturatie",   label: "Facturatie",   icon: CreditCard },
  { href: "/instellingen", label: "Instellingen", icon: Settings },
  { href: "/help",         label: "Hulp",         icon: HelpCircle },
];

/**
 * Match a sidebar link to the current path. The /dashboard root is matched
 * exactly — sub-routes like /dashboard/foo would still highlight Dashboard,
 * which is the right UX. All other links match their root prefix.
 */
function isLinkActive(linkHref: string, pathname: string | null): boolean {
  if (!pathname) return false;
  if (linkHref === "/dashboard") return pathname === "/dashboard";
  return pathname === linkHref || pathname.startsWith(`${linkHref}/`);
}

/**
 * Demo banner. Shown only when the auth bypass is active. Lets the user
 * trigger the idempotent demo-seed with one click — far safer than the
 * "auto-seed inside getCurrentUser" pattern (race conditions, hidden writes).
 *
 * State machine:
 *   - idle:              ready, button enabled
 *   - seeding:           POST in flight, button disabled with spinner copy
 *   - missing-db:        last attempt returned `databaseConfigured: false`;
 *                        show persistent inline guidance below the row so
 *                        the user knows the toast wasn't a one-off
 *   - error:             last attempt returned an unexpected error message;
 *                        show inline message + still allow retry
 */
type SeedUiState =
  | { kind: "idle" }
  | { kind: "seeding" }
  | { kind: "missing-db"; hint: string }
  | { kind: "error"; message: string };

function DemoBanner({ profile }: { profile: { fullName?: string | null } | null }) {
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
        // Persist DB-missing state inline so the user sees the cause even
        // after the toast disappears. Other errors clear back to idle on
        // next interaction but show a one-shot inline message until then.
        if (data.databaseConfigured === false) {
          const hint = data.hint ?? "Configureer DATABASE_URL in Vercel.";
          setState({ kind: "missing-db", hint });
          toast.error(`${data.error ?? "Geen database"} — ${hint}`);
        } else {
          const message = data.message ?? data.error ?? "Demo-data laden mislukt";
          setState({ kind: "error", message });
          toast.error(message);
        }
        return;
      }

      if (data.alreadySeeded) {
        toast.success("Demo-data is al aanwezig — pagina ververst.");
      } else {
        const c = data.counts ?? {};
        toast.success(
          `Demo-data geladen: ${c.clients ?? 0} patiënten · ${c.appointments ?? 0} afspraken.`,
        );
      }
      setState({ kind: "idle" });
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Demo-data laden mislukt";
      setState({ kind: "error", message });
      toast.error(message);
    }
  }

  return (
    <div className="border-b border-amber-300/40 bg-amber-50 text-sm text-amber-900 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-200">
      <div className="mx-auto max-w-6xl px-4 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            <span>
              <strong className="font-semibold">Demo-modus actief</strong>
              <span className="ml-2 text-amber-800/80 dark:text-amber-200/80">
                data is fictief{profile?.fullName ? ` · ingelogd als ${profile.fullName}` : ""}
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={handleSeed}
            disabled={seeding}
            aria-busy={seeding}
            className="inline-flex items-center gap-1.5 rounded-md border border-amber-400/60 bg-white/60 px-3 py-1 text-xs font-medium text-amber-900 transition hover:bg-white disabled:opacity-60 dark:border-amber-700/60 dark:bg-amber-900/30 dark:text-amber-100 dark:hover:bg-amber-900/50"
          >
            {seeding && (
              <span
                aria-hidden="true"
                className="h-3 w-3 animate-spin rounded-full border-2 border-amber-700/40 border-t-amber-800 dark:border-amber-300/30 dark:border-t-amber-100"
              />
            )}
            {seeding ? "Bezig met laden…" : "Demo-data laden"}
          </button>
        </div>

        {state.kind === "missing-db" && (
          <p className="mt-1.5 text-xs text-amber-800/90 dark:text-amber-200/90">
            <strong>DATABASE_URL ontbreekt.</strong> {state.hint}
          </p>
        )}
        {state.kind === "error" && (
          <p className="mt-1.5 text-xs text-amber-800/90 dark:text-amber-200/90">
            <strong>Laden mislukt:</strong> {state.message}
          </p>
        )}
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading, signOut, profile, devMode } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 lg:flex">
        <div className="flex h-16 items-center border-b border-zinc-200 px-6 dark:border-zinc-800">
          <Link href="/" className="text-lg font-bold text-zinc-900 dark:text-white">
            NoShow Control
          </Link>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {sidebarLinks.map((link) => {
            const active = isLinkActive(link.href, pathname);
            // Active state: blue-tinted background + left accent bar + glow on
            // the icon. Hover state for inactive links keeps the existing
            // soft-zinc affordance so the click target reads consistently.
            const cls = active
              ? "relative flex items-center gap-3 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 shadow-sm shadow-blue-500/10 ring-1 ring-blue-500/15 dark:bg-blue-900/30 dark:text-blue-200 dark:ring-blue-700/40"
              : "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800";
            return (
              <Link
                key={link.label}
                href={link.href}
                className={cls}
                aria-current={active ? "page" : undefined}
              >
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-blue-500"
                  />
                )}
                <link.icon className={`h-5 w-5 ${active ? "text-blue-600 dark:text-blue-300" : ""}`} />
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-600">
              {profile?.firstName?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="flex-1 truncate">
              <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">
                {profile?.fullName ?? "User"}
              </p>
              <p className="truncate text-xs text-zinc-500">{user.email}</p>
            </div>
            <button
              onClick={() => signOut()}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              aria-label="Uitloggen"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {devMode && <DemoBanner profile={profile} />}
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
