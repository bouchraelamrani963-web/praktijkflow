"use client";

import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { useRouter } from "next/navigation";
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
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/appointments", label: "Afspraken", icon: Calendar },
  { href: "/open-slots", label: "Open plekken", icon: CalendarClock },
  { href: "/waitlist", label: "Wachtlijst", icon: ClipboardList },
  { href: "/patients", label: "Patiënten", icon: Users },
  { href: "/facturatie", label: "Facturatie", icon: CreditCard },
  { href: "/instellingen", label: "Instellingen", icon: Settings },
  { href: "/help", label: "Hulp", icon: HelpCircle },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading, signOut, profile, devMode } = useAuth();
  const router = useRouter();

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
            PraktijkFlow
          </Link>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {sidebarLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <link.icon className="h-5 w-5" />
              {link.label}
            </Link>
          ))}
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
        {devMode && (
          <div className="border-b border-amber-300/40 bg-amber-50 px-4 py-1.5 text-center text-xs font-medium text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300">
            Dev-modus — Firebase auth overgeslagen — ingelogd als {profile?.fullName ?? "dev user"}
          </div>
        )}
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
