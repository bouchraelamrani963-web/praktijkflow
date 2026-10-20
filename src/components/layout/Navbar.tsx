"use client";

import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { Menu, X } from "lucide-react";
import { useState } from "react";

/**
 * Shared light-theme navbar. The landing page (`src/app/page.tsx`) uses its
 * own inline marketing navbar — this one is currently consumed by /pricing.
 *
 * Items match the landing nav order so the user sees a consistent menu.
 *   - "Naar app" always goes to /login. Authenticated users are redirected
 *     onward by the app.
 *   - Protected dashboard routes redirect unauthenticated users to /login.
 *   - Auth-aware twist: when the user is already logged in, swap "Inloggen"
 *     for "Uitloggen" so the menu stays useful instead of pointing at a
 *     login screen they'd be redirected away from.
 */
export function Navbar() {
  const { user, loading, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-xl font-bold text-zinc-900 dark:text-white">
          NoShow Control
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-6 md:flex">
          <Link
            href="/#how"
            className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            Hoe het werkt
          </Link>
          <Link
            href="/#features"
            className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            Functionaliteiten
          </Link>
          <Link
            href="/pricing"
            className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            Prijzen
          </Link>
          {!loading && (
            <>
              {user ? (
                <button
                  onClick={() => signOut()}
                  className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                >
                  Uitloggen
                </button>
              ) : (
                <Link
                  href="/login"
                  className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                >
                  Inloggen
                </Link>
              )}
              <Link
                href="/login"
                className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-800"
              >
                Naar app
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menu openen"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950 md:hidden">
          <div className="flex flex-col gap-3">
            <Link
              href="/#how"
              className="text-sm text-zinc-600 dark:text-zinc-400"
              onClick={() => setMobileOpen(false)}
            >
              Hoe het werkt
            </Link>
            <Link
              href="/#features"
              className="text-sm text-zinc-600 dark:text-zinc-400"
              onClick={() => setMobileOpen(false)}
            >
              Functionaliteiten
            </Link>
            <Link
              href="/pricing"
              className="text-sm text-zinc-600 dark:text-zinc-400"
              onClick={() => setMobileOpen(false)}
            >
              Prijzen
            </Link>
            {user ? (
              <button
                onClick={() => {
                  signOut();
                  setMobileOpen(false);
                }}
                className="text-left text-sm text-zinc-600 dark:text-zinc-400"
              >
                Uitloggen
              </button>
            ) : (
              <Link
                href="/login"
                className="text-sm text-zinc-600 dark:text-zinc-400"
                onClick={() => setMobileOpen(false)}
              >
                Inloggen
              </Link>
            )}
            <Link
              href="/login"
              className="text-sm font-medium text-blue-600"
              onClick={() => setMobileOpen(false)}
            >
              Naar app
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
