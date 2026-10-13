"use client";

import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { plans } from "@/lib/stripe/plans";
import { Check } from "lucide-react";

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
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
              Pakketten voor rustiger agendabeheer
            </h1>
            <p className="mt-4 text-base leading-7 text-zinc-600 dark:text-zinc-400">
              Kies het pakket dat past bij hoe uw praktijk open plekken,
              wachtlijstpatiënten en aanbiedingen wil beheren.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-lg border bg-white p-7 dark:bg-zinc-900 ${
                  plan.highlighted
                    ? "border-blue-300 ring-1 ring-blue-100 dark:border-blue-800 dark:ring-blue-900/40"
                    : "border-zinc-200 dark:border-zinc-700"
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-6 rounded-md border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-300">
                    Veel gebruikt
                  </span>
                )}
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                  {plan.name}
                </p>

                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-semibold text-zinc-900 dark:text-white">
                    &euro;{plan.price}
                  </span>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    / {plan.interval === "month" ? "maand" : "jaar"}
                  </span>
                </div>

                <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
                  {plan.tagline}
                </p>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-3 text-sm text-zinc-700 dark:text-zinc-300"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href={`/register?plan=${encodeURIComponent(plan.id)}`}
                  className={`mt-8 block w-full rounded-lg px-4 py-3 text-center text-sm font-semibold transition-colors ${
                    plan.highlighted
                      ? "bg-blue-700 text-white hover:bg-blue-800"
                      : "border border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                >
                  Aanmelden
                </Link>
              </div>
            ))}
          </div>

          <p className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Maandelijks opzegbaar · BTW exclusief · Directe activatie na betaling
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
