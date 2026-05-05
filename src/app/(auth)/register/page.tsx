"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import toast from "react-hot-toast";

/**
 * Register page accepts an optional `?plan=` query param so the pricing
 * page CTAs can carry the chosen plan through registration. The plan is
 * preserved in the post-register redirect URL so a future Stripe checkout
 * step (Phase 2+) can pick it up. For now there's no checkout step yet:
 * we simply land on /dashboard.
 *
 * Valid plan ids are intentionally NOT validated here — the pricing UI is
 * the source of truth, and an unknown value just rides along as a no-op.
 */
function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan");

  // Pretty-print plan label for the heading subtext only.
  const planLabel =
    plan === "starter" ? "Starter" :
    plan === "pro"     ? "Pro" :
    plan === "enterprise" || plan === "growth" ? "Growth" :
    null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Wachtwoord moet minimaal 8 tekens zijn");
      return;
    }
    setLoading(true);
    try {
      await signUp(email, password, name);
      toast.success("Account aangemaakt!");
      // Phase 1: no Stripe checkout yet — go straight to dashboard.
      // Plan param is preserved on the URL so Phase 2 can pick it up.
      const dest = plan
        ? `/dashboard?plan=${encodeURIComponent(plan)}`
        : "/dashboard";
      router.push(dest);
    } catch {
      toast.error("Kan account niet aanmaken. E-mailadres is mogelijk al in gebruik.");
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Volledige naam
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            placeholder="Jan Jansen"
          />
        </div>

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
            minLength={8}
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
