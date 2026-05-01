"use client";

import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { plans } from "@/lib/stripe/plans";
import { Check, Sparkles } from "lucide-react";

/**
 * Pricing page. The Stripe checkout flow + subscription model are out of
 * scope right now (per current sprint scope: no billing). Plan-card CTAs
 * therefore route directly into the app at /dashboard. The Stripe
 * infrastructure (/api/stripe/*, lib/stripe/config) remains in the
 * codebase untouched for when the billing sprint lands.
 */
export default function PricingPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 bg-white dark:bg-zinc-950">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-5xl">
              Verdien uw abonnement terug — elke maand
            </h1>
            <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
              NoShow Control wint verloren omzet uit annuleringen automatisch voor u terug. U betaalt een vaste prijs per maand en houdt het verschil.
            </p>
            {/* Task 5 — urgency micro-line, no popups. Placed directly above the
                pricing grid so every plan card sits under it. */}
            <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-1.5 text-sm font-medium text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
              <Sparkles className="h-4 w-4" />
              Eerste klanten ontvangen blijvende korting — beperkt aantal praktijken per regio
            </p>
          </div>

          <div className="mt-16 grid gap-8 lg:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl border p-8 ${
                  plan.highlighted
                    ? "border-blue-600 shadow-lg shadow-blue-600/10 ring-1 ring-blue-600/20 lg:-translate-y-2"
                    : "border-zinc-200 dark:border-zinc-700"
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-4 py-1 text-xs font-semibold text-white">
                    Meest gekozen
                  </span>
                )}
                {/* Plan eyebrow — small identifier above the price. */}
                <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  {plan.name}
                </p>

                {/* Task 3 — PRICE first. Dominant visual element in the card. */}
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-5xl font-bold text-zinc-900 dark:text-white">
                    &euro;{plan.price}
                  </span>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    / {plan.interval === "month" ? "maand" : "jaar"}
                  </span>
                </div>

                {/* Task 2 — revenue-frame line, required on every plan. */}
                <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
                  {plan.revenueFrame}
                </p>
                {/* Optional payback reinforcement — rendered on the Growth
                    plan only. Subtle, inline, no new layout primitive. */}
                {plan.revenueSubNote && (
                  <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    {plan.revenueSubNote}
                  </p>
                )}
                {/* Defensible-range disclaimer — smaller + muted so it sits
                    visually below the value line without competing with it. */}
                {plan.revenueDisclaimer && (
                  <p className="mt-1 text-[11px] leading-snug text-zinc-500 dark:text-zinc-500">
                    {plan.revenueDisclaimer}
                  </p>
                )}

                {/* Plan qualifier — who it is for, after price and value. */}
                <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
                  {plan.tagline}
                </p>

                {/* Features — last per Task 3. */}
                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-3 text-sm text-zinc-700 dark:text-zinc-300"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/dashboard"
                  className={`mt-8 block w-full rounded-lg px-4 py-3 text-center text-sm font-semibold transition-colors ${
                    plan.highlighted
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "border border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                >
                  Start gratis
                </Link>
              </div>
            ))}
          </div>

          {/* Trust line under the grid — zero friction language, no "probeer". */}
          <p className="mt-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Maandelijks opzegbaar · BTW exclusief · Directe activatie na betaling
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
