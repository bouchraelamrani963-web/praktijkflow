"use client";

import { Suspense, useState } from "react";
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

/**
 * Register page accepts an optional `?plan=` query param so the pricing
 * page CTAs can carry the chosen plan through registration. The plan is
 * preserved in the post-register redirect URL so a future Stripe checkout
 * step (Phase 3+) can pick it up.
 *
 * REAL registration (vs. demo bypass):
 *   - Requires Firebase env vars (NEXT_PUBLIC_FIREBASE_* + FIREBASE_*) to
 *     be set on Vercel. Without them, the form renders a clear "demo-modus"
 *     notice and the submit button is disabled, so users don't see the
 *     misleading toast the prior version produced.
 *   - On submit, signUp() creates a Firebase user → /api/auth/register
 *     creates the Prisma User + Practice + OWNER membership in one
 *     transaction → mints session cookie. Multi-tenancy is bootstrapped
 *     here, not lazily.
 */
function RegisterForm() {
  const [name, setName] = useState("");
  const [practiceName, setPracticeName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp, devMode } = useAuth();
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan");

  const planLabel =
    plan === "starter" ? "Starter" :
    plan === "pro"     ? "Pro" :
    plan === "enterprise" || plan === "growth" ? "Growth" :
    null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (devMode) {
      // Should never reach this — submit is disabled — but defend in depth.
      toast.error("Registratie is op deze omgeving niet beschikbaar.");
      return;
    }
    if (password.length < 8) {
      toast.error("Wachtwoord moet minimaal 8 tekens zijn.");
      return;
    }
    if (!practiceName.trim()) {
      toast.error("Vul een praktijknaam in.");
      return;
    }
    setLoading(true);
    try {
      await signUp(email, password, name, practiceName.trim());
      toast.success("Account aangemaakt!");
      const dest = plan
        ? `/dashboard?plan=${encodeURIComponent(plan)}`
        : "/dashboard";
      redirectAfterAuth(dest);
    } catch (err) {
      // Distinguish between common failure modes so the user knows what
      // to do next, rather than the prior misleading "email mogelijk al
      // in gebruik" blanket message.
      const code = (err as { code?: string } | null)?.code ?? "";
      const message = err instanceof Error ? err.message : "";

      if (code === FIREBASE_NOT_CONFIGURED) {
        toast.error("Registratie is op deze omgeving niet beschikbaar (auth nog niet geconfigureerd).");
      } else if (code === "auth/email-already-in-use") {
        toast.error("Dit e-mailadres is al in gebruik. Probeer in te loggen.");
      } else if (code === "auth/invalid-email") {
        toast.error("Ongeldig e-mailadres.");
      } else if (code === "auth/weak-password") {
        toast.error("Wachtwoord is te zwak. Kies een sterker wachtwoord.");
      } else if (message) {
        toast.error(message);
      } else {
        toast.error("Account aanmaken mislukt. Probeer het later opnieuw.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
          Account aanmaken
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          {planLabel
            ? `U heeft het ${planLabel}-plan gekozen. Maak uw account aan om te starten.`
            : "Begin vandaag nog met het beheren van uw praktijk."}
        </p>
      </div>

      {devMode && (
        <div
          role="status"
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200"
        >
          <strong className="font-semibold">Registratie niet beschikbaar.</strong>
          {" "}Op deze omgeving is Firebase-auth nog niet geconfigureerd.
          Ga via &laquo;Inloggen&raquo; door naar het demo-dashboard, of neem
          contact op met de beheerder om auth te activeren.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Volledige naam
          </label>
          <input
            id="name"
            type="text"
            required={!devMode}
            disabled={devMode}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            placeholder="Jan Jansen"
            autoComplete="name"
          />
        </div>

        <div>
          <label htmlFor="practiceName" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Praktijknaam
          </label>
          <input
            id="practiceName"
            type="text"
            required={!devMode}
            disabled={devMode}
            value={practiceName}
            onChange={(e) => setPracticeName(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            placeholder="Tandartspraktijk Centrum"
            autoComplete="organization"
          />
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            U kunt dit later aanpassen onder Instellingen.
          </p>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            required={!devMode}
            disabled={devMode}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            placeholder="you@example.com"
            autoComplete="email"
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
            disabled={devMode}
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            placeholder="••••••••"
            autoComplete="new-password"
          />
        </div>

        <button
          type="submit"
          disabled={loading || devMode}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Account aanmaken..." : "Account aanmaken"}
        </button>
      </form>

      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        Al een account?{" "}
        <Link
          href={plan ? `/login?plan=${encodeURIComponent(plan)}` : "/login"}
          className="font-medium text-blue-600 hover:text-blue-500"
        >
          Inloggen
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <Suspense fallback={null}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
