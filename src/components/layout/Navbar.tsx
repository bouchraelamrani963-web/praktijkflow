"use client";

import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { Menu, X } from "lucide-react";
import { useState } from "react";

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
          <Link href="/pricing" className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">
            Prijzen
          </Link>
          {!loading && (
            <>
              {user ? (
                <>
                  <Link href="/dashboard" className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">
                    Dashboard
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Uitloggen
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">
                    Inloggen
                  </Link>
                  <Link
                    href="/register"
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                  >
                    Start met terugwinnen
                  </Link>
                </>
              )}
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
            <Link href="/pricing" className="text-sm text-zinc-600 dark:text-zinc-400" onClick={() => setMobileOpen(false)}>
              Prijzen
            </Link>
            {user ? (
              <>
                <Link href="/dashboard" className="text-sm text-zinc-600 dark:text-zinc-400" onClick={() => setMobileOpen(false)}>
                  Dashboard
                </Link>
                <button onClick={() => { signOut(); setMobileOpen(false); }} className="text-left text-sm text-zinc-600 dark:text-zinc-400">
                  Uitloggen
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm text-zinc-600 dark:text-zinc-400" onClick={() => setMobileOpen(false)}>
                  Inloggen
                </Link>
                <Link href="/register" className="text-sm font-medium text-blue-600" onClick={() => setMobileOpen(false)}>
                  Aan de slag
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
