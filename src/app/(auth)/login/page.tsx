"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { FIREBASE_NOT_CONFIGURED } from "@/lib/firebase/auth";
import toast from "react-hot-toast";

function redirectAfterAuth(target: string) {
  const safeTarget =
    target.startsWith("/") && !target.startsWith("//") ? target : "/dashboard";

  window.location.assign(safeTarget);
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { signIn, profile, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";

  useEffect(() => {
    if (!authLoading && profile) {
      redirectAfterAuth(redirect);
    }
  }, [authLoading, profile, redirect]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signIn(email, password);
      toast.success("Welkom terug!");
      redirectAfterAuth(redirect);
    } catch (err) {
      // Distinguish failure modes so the user sees an actionable message
      // instead of a generic "wrong password" toast.
      const code = (err as { code?: string } | null)?.code ?? "";
      if (code === FIREBASE_NOT_CONFIGURED) {
        toast.error("Inloggen is tijdelijk niet beschikbaar: Firebase is niet geconfigureerd.");
        return;
      }
      if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
        toast.error("Ongeldig e-mailadres of wachtwoord.");
      } else if (code === "auth/invalid-email") {
        toast.error("Ongeldig e-mailadres.");
      } else if (code === "auth/too-many-requests") {
        toast.error("Te veel pogingen. Probeer het later opnieuw.");
      } else if (code === "auth/network-request-failed") {
        toast.error("Geen netwerkverbinding. Probeer het opnieuw.");
      } else {
        toast.error(err instanceof Error && err.message ? err.message : "Inloggen mislukt.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
          Inloggen bij NoShow Control
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Welkom terug! Vul uw gegevens in.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Wachtwoord
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "Inloggen..." : "Inloggen"}
        </button>
      </form>

      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        Nog geen account?{" "}
        <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
          Registreren
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
