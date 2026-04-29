"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { FIREBASE_NOT_CONFIGURED } from "@/lib/firebase/auth";
import toast from "react-hot-toast";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, devMode } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      // Demo/bypass mode: skip Firebase entirely. The middleware lets the
      // request through and getCurrentUser() returns the seeded dev user.
      if (devMode) {
        toast.success("Demo-modus — u bent ingelogd");
        router.push(redirect);
        return;
      }

      await signIn(email, password);
      toast.success("Welkom terug!");
      router.push(redirect);
    } catch (err) {
      // Distinguish "Firebase missing" from real auth failures so the user
      // sees a helpful message instead of the generic "wrong password" toast.
      const code = (err as { code?: string } | null)?.code;
      if (code === FIREBASE_NOT_CONFIGURED) {
        toast.success("Demo-modus — u bent ingelogd");
        router.push(redirect);
        return;
      }
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : "Ongeldig e-mailadres of wachtwoord",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
          Inloggen bij PraktijkFlow
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Welkom terug! Vul uw gegevens in.
        </p>
      </div>

      {devMode && (
        <div
          role="status"
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200"
        >
          <strong className="font-semibold">Demo-modus actief.</strong> Firebase is niet
          geconfigureerd — klik op &laquo;Inloggen&raquo; om door te gaan naar het demo-dashboard.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            required={!devMode}
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
            required={!devMode}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Inloggen..." : devMode ? "Doorgaan naar demo-dashboard" : "Inloggen"}
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
