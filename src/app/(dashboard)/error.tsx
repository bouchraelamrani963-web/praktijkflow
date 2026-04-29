"use client";

/**
 * Next.js segment error boundary for the entire (dashboard) route group.
 *
 * Catches any uncaught error from a Server Component, Server Action, or
 * synchronous render in a Client Component within /dashboard, /appointments,
 * /patients, /waitlist, /open-slots, /facturatie, /instellingen, /help.
 *
 * Replaces Vercel's bare "This page couldn't load" 500 screen with a
 * branded fallback that lets the user retry or escape to the dashboard.
 * The full error is logged to the console for operator diagnosis but never
 * shown to the user — only the `digest` (Next's stable error fingerprint)
 * is surfaced for support reference.
 *
 * Must be a client component per Next.js 16 contract: error boundaries run
 * after React commits, so they can't be SSR'd.
 */

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

export default function DashboardSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the real error so operators can find it in Vercel function logs.
    // Includes Next's `digest` so a user-reported "Ref: …" maps back to the
    // exact server-side stack trace.
    console.error("[dashboard.error.tsx] segment error:", error);
  }, [error]);

  return (
    <div
      role="alert"
      className="flex min-h-[60vh] flex-col items-center justify-center gap-5 p-8 text-center"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300">
        <AlertTriangle className="h-7 w-7" aria-hidden="true" />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
          Er ging iets mis bij het laden van deze pagina
        </h2>
        <p className="mt-2 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
          Probeer het opnieuw of ga terug naar het dashboard. Blijft de fout
          terugkomen, neem dan contact op met support.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-xs text-zinc-400 dark:text-zinc-500">
            Ref: {error.digest}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-blue-500/20 transition hover:from-blue-700 hover:to-indigo-700"
        >
          <RotateCcw className="h-4 w-4" />
          Opnieuw proberen
        </button>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        >
          <Home className="h-4 w-4" />
          Naar dashboard
        </Link>
      </div>
    </div>
  );
}
