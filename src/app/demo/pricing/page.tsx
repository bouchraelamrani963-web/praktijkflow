import Link from "next/link";
import { Check } from "lucide-react";
import { DemoShell } from "../DemoShell";
import { demoPlans } from "../demo-data";

export default function DemoPricingPage() {
  return (
    <DemoShell>
      <main className="bg-white">
        <section className="mx-auto max-w-6xl px-5 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="pf-eyebrow">Demo prijspagina</p>
            <h1 className="pf-display mt-3 text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">
              Pakketten voor rustiger agendabeheer
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Deze pagina is volledig visueel. De knoppen starten geen Stripe-checkout en verwerken geen betalingen.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {demoPlans.map((plan) => (
              <article
                key={plan.name}
                className={`relative rounded-lg border bg-white p-7 ${
                  plan.highlighted ? "border-blue-300 ring-1 ring-blue-100" : "border-slate-200"
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-6 rounded-md border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                    Veel gebruikt
                  </span>
                )}
                <h2 className="text-sm font-semibold text-slate-950">{plan.name}</h2>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-semibold text-slate-950">&euro;{plan.price}</span>
                  <span className="text-slate-600">/ maand</span>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-600">{plan.tagline}</p>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-slate-700">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/demo/dashboard"
                  className={`mt-8 block w-full rounded-lg px-4 py-3 text-center text-sm font-semibold transition-colors ${
                    plan.highlighted
                      ? "bg-blue-700 text-white hover:bg-blue-800"
                      : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Bekijk demo
                </Link>
              </article>
            ))}
          </div>
        </section>
      </main>
    </DemoShell>
  );
}
