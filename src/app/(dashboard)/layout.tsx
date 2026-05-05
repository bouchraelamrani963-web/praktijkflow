"use client";

import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
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

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading, signOut, profile } = useAuth();
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
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
