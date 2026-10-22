"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useAuth } from "@/lib/hooks/useAuth";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Activity,
  Settings,
  LogOut,
  ClipboardList,
  Menu,
  X,
} from "lucide-react";

const sidebarLinks = [
  { href: "/dashboard",    label: "Dashboard",    icon: LayoutDashboard },
  { href: "/appointments", label: "Agenda",       icon: Calendar },
  { href: "/patients",     label: "Patiënten",    icon: Users },
  { href: "/waitlist",     label: "Wachtlijst",   icon: ClipboardList },
  { href: "/open-slots",   label: "Open plekken", icon: Activity },
  { href: "/instellingen", label: "Instellingen", icon: Settings },
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
 * The shared nav-list rendered inside both the desktop sidebar and the
 * mobile drawer. `onLinkClick` lets the drawer close itself when a link
 * is tapped — the desktop sidebar just passes nothing.
 */
function NavList({
  pathname,
  onLinkClick,
}: {
  pathname: string | null;
  onLinkClick?: () => void;
}) {
  return (
    <>
      {sidebarLinks.map((link) => {
        const active = isLinkActive(link.href, pathname);
        const cls = active
          ? "ns-app-navlink ns-app-navlink-active relative flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800 ring-1 ring-blue-100 dark:bg-zinc-800 dark:text-white dark:ring-zinc-700"
          : "ns-app-navlink flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800";
        return (
          <Link
            key={link.label}
            href={link.href}
            className={cls}
            aria-current={active ? "page" : undefined}
            onClick={onLinkClick}
          >
            {active && (
              <span
                aria-hidden="true"
                className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-blue-700"
              />
            )}
            <link.icon className={`h-4 w-4 ${active ? "text-blue-700 dark:text-blue-300" : ""}`} />
            {link.label}
          </Link>
        );
      })}
    </>
  );
}

/** Bottom block of the sidebar — avatar + email + logout. Shared between
 *  desktop sidebar and mobile drawer so the drawer feels complete. */
function UserFooter({
  fullName,
  firstName,
  email,
  onSignOut,
  signingOut,
  signOutError,
}: {
  fullName: string;
  firstName: string;
  email: string | null | undefined;
  onSignOut: () => void | Promise<void>;
  signingOut: boolean;
  signOutError: string | null;
}) {
  return (
    <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-sm font-medium text-zinc-700 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-700">
          {firstName?.[0]?.toUpperCase() ?? "U"}
        </div>
        <div className="flex-1 truncate">
          <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">
            {fullName}
          </p>
          <p className="truncate text-xs text-zinc-500">{email ?? ""}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onSignOut}
        disabled={signingOut}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-white"
      >
        <LogOut className="h-4 w-4" />
        Uitloggen
      </button>
      {signOutError && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">
          {signOutError}
        </p>
      )}
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading, signOut, profile } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      const redirect = pathname && pathname !== "/login"
        ? `/login?redirect=${encodeURIComponent(pathname)}`
        : "/login";
      window.location.assign(redirect);
    }
  }, [user, loading, pathname]);

  // Close the mobile drawer whenever the route changes — covers all entry
  // paths (link click, browser back/forward, programmatic push) in one place.
  useEffect(() => {
    const timer = window.setTimeout(() => setMobileOpen(false), 0);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  // ESC closes the drawer + lock body scroll while the drawer is open so
  // the page underneath doesn't bleed touch-scroll through the backdrop.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-zinc-50 px-4 text-center dark:bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Sessie verlopen. U wordt doorgestuurd naar inloggen...
        </p>
      </div>
    );
  }

  const fullName = profile?.fullName ?? "User";
  const firstName = profile?.firstName ?? "";

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError(null);
    try {
      await signOut();
      window.location.replace("/login");
    } catch {
      setSigningOut(false);
      setSignOutError("Uitloggen mislukt. Probeer opnieuw.");
    }
  }

  return (
    <div className="ns-app flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* ─── Desktop sidebar (lg+) ─────────────────────────────────────── */}
      <aside className="ns-app-sidebar hidden w-52 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 lg:flex">
        <div className="ns-app-brand-row flex h-14 items-center border-b border-zinc-200 px-4 dark:border-zinc-800">
          <Link href="/" className="ns-app-brand text-lg font-bold text-zinc-900 dark:text-white">
            <BrandLogo inverse compact />
          </Link>
        </div>
        <nav className="ns-app-navigation flex-1 space-y-1 px-3 py-4" aria-label="Praktijknavigatie">
          <NavList pathname={pathname} />
        </nav>
        <UserFooter
          fullName={fullName}
          firstName={firstName}
          email={user.email}
          onSignOut={handleSignOut}
          signingOut={signingOut}
          signOutError={signOutError}
        />
      </aside>

      {/* ─── Mobile drawer (< lg) ──────────────────────────────────────── */}
      {/* Backdrop — only mounted when open; click closes the drawer. */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Sluit menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
        />
      )}
      {/* Drawer itself — always mounted so the slide-out animation works on
          both open and close transitions. translate-x toggles visibility. */}
      <aside
        id="dashboard-drawer"
        className={`ns-app-sidebar fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85%] flex-col border-r border-zinc-200 bg-white transition-transform duration-200 ease-out dark:border-zinc-800 dark:bg-zinc-900 lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!mobileOpen}
      >
        <div className="flex h-14 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800">
          <Link
            href="/"
            className="text-base font-bold text-zinc-900 dark:text-white"
            onClick={() => setMobileOpen(false)}
          >
            <BrandLogo inverse compact />
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="-mr-1 rounded-md p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
            aria-label="Sluit menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="ns-app-navigation flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Mobiele praktijknavigatie">
          <NavList pathname={pathname} onLinkClick={() => setMobileOpen(false)} />
        </nav>
        <UserFooter
          fullName={fullName}
          firstName={firstName}
          email={user.email}
          onSignOut={() => {
            setMobileOpen(false);
            handleSignOut();
          }}
          signingOut={signingOut}
          signOutError={signOutError}
        />
      </aside>

      {/* ─── Main column ───────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Directly accessible account control on desktop; remains visible while scrolling. */}
        <header className="sticky top-0 z-30 hidden min-h-16 items-center justify-end gap-5 border-b border-[#D8E2D8] bg-[#F8F7F2]/95 px-6 backdrop-blur-sm lg:flex">
          <span className="truncate text-xs font-medium text-[#64806E]">
            Ingelogd als <strong className="text-[#234B3B]">{fullName}</strong>
          </span>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="inline-flex items-center justify-center gap-2 rounded-sm border border-[#C9D8CB] bg-white px-4 py-2.5 text-xs font-bold text-[#234B3B] transition-colors hover:border-[#AEC7B4] hover:bg-[#ECF3EB] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3F7556] disabled:cursor-wait disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            {signingOut ? "Uitloggen…" : "Uitloggen"}
          </button>
          {signOutError && <p role="alert" className="text-xs text-red-700">{signOutError}</p>}
        </header>
        {/* Mobile topbar — only on < lg. Has the hamburger button + brand
            + an avatar mirror of the sidebar identity. */}
        <header className="ns-app-mobile-header sticky top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="-ml-2 rounded-md p-2 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            aria-controls="dashboard-drawer"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/dashboard" className="ns-app-brand text-base font-bold text-zinc-900 dark:text-white">
            NoShow Control
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="inline-flex items-center gap-1.5 rounded-sm border border-[#C5D8C8] px-2.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#2F5C4B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8D9C9] disabled:opacity-50"
            aria-label={signingOut ? "Bezig met uitloggen" : "Uitloggen"}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span>{signingOut ? "Bezig…" : "Uitloggen"}</span>
          </button>
        </header>

        <main className="ns-app-main flex-1 overflow-y-auto">
          <div className="ns-app-content mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-7 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
