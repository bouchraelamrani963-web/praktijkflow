import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DemoShell } from "./DemoShell";
import { demoFeatures, demoSummaryCards, demoWorkItems } from "./demo-data";

export default function DemoHomePage() {
  return (
    <DemoShell>
      <main>
        <section className="pf-grad-hero pt-10 pb-10 sm:pt-16 sm:pb-14">
          <div className="mx-auto grid max-w-6xl items-center gap-8 px-5 lg:grid-cols-[1fr_0.95fr]">
            <div>
              <p className="pf-eyebrow">NoShow Control voor zorgpraktijken</p>
              <h1 className="pf-display mt-4 max-w-2xl text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
                Minder lege plekken in uw agenda.
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
                Beheer annuleringen, open plekken en wachtlijstpatiënten overzichtelijk vanuit één rustig dashboard.
              </p>
              <div className="mt-7">
                <Link href="/demo/dashboard" className="pf-btn-primary">
                  Bekijk dashboard demo
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950">Automation First Dashboard</p>
                  <p className="text-xs text-slate-500">Voorbeeldweergave met fictieve situaties</p>
                </div>
                <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">DEMO</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {demoSummaryCards.map((card) => (
                  <div key={card.key} className={`rounded-lg border p-3 ${card.className}`}>
                    <p className="text-xs font-medium text-slate-500">{card.label}</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-950">{card.value}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">{card.description}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                Belangrijkste uitzondering: {demoWorkItems[0].title}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-14 sm:py-16">
          <div className="mx-auto max-w-6xl px-5">
            <div className="max-w-2xl">
              <p className="pf-eyebrow">Voor praktijken met een volle agenda</p>
              <h2 className="pf-display mt-3 text-2xl font-semibold text-slate-950 sm:text-3xl">
                Slim afsprakenbeheer voor zorgpraktijken
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                NoShow Control helpt teams sneller te zien welke plekken vrij zijn, welke patiënten passen en waar actie nodig is.
              </p>
            </div>
            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {demoFeatures.map((feature) => (
                <article key={feature.title} className="pf-card p-5">
                  <div className="pf-icon-tile">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-slate-950">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{feature.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </DemoShell>
  );
}
