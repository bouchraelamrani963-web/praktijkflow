import Link from "next/link";
import { ArrowRight, ChevronDown, Search } from "lucide-react";
import { DemoShell } from "../DemoShell";
import { demoSummaryCards, demoWorkItems } from "../demo-data";

export default function DemoDashboardPage() {
  return (
    <DemoShell>
      <main className="mx-auto max-w-6xl space-y-6 px-5 py-7">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-blue-700">Automation First</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">
              Goedemorgen, Demo praktijk
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Zie direct welke plekken automatisch worden opgevolgd en waar de praktijk moet ingrijpen.
              Dit zijn fictieve gegevens; er wordt niets opgeslagen of verzonden.
            </p>
          </div>
          <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
            DEMO - read-only
          </span>
        </header>

        <section aria-labelledby="demo-summary-heading">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 id="demo-summary-heading" className="text-base font-semibold text-slate-950">
              Overzicht
            </h2>
            <Link href="/demo/open-slots/slot-open-1" className="inline-flex items-center gap-1 text-sm font-medium text-blue-700">
              Voorbeeldplek openen
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {demoSummaryCards.map((card) => (
              <article key={card.key} className={`rounded-lg border p-4 shadow-sm ${card.className}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-950">{card.label}</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-600">{card.description}</p>
                  </div>
                  <span className="rounded-lg bg-slate-100 p-2 text-slate-700">
                    <card.icon className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-3 text-2xl font-semibold tabular-nums text-slate-950">{card.value}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="demo-worklist-heading">
          <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="demo-worklist-heading" className="text-base font-semibold text-slate-950">
                Werklijst
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Uitzonderingen staan bovenaan. Details zijn ingeklapt en bevatten alleen voorbeeldinformatie.
              </p>
            </div>
            <button
              type="button"
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-500"
              aria-disabled="true"
            >
              <Search className="h-4 w-4" />
              Wachtlijst bekijken
            </button>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <ul className="divide-y divide-slate-100">
              {demoWorkItems.map((item) => (
                <li key={item.id} className="group">
                  <div className="relative grid gap-2 p-3 sm:p-4 lg:grid-cols-[1fr_auto] lg:items-center">
                    <Link
                      href={item.href}
                      className="grid min-w-0 gap-2 rounded-md p-1 outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-500 sm:grid-cols-[minmax(10rem,1.1fr)_minmax(12rem,1.6fr)_minmax(9rem,0.8fr)_minmax(9rem,0.8fr)] sm:items-center"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${item.badgeClass}`}>
                          {item.category}
                        </span>
                        <span className="truncate text-xs text-slate-500 sm:hidden">{item.status}</span>
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-slate-950">{item.title}</h3>
                        <p className="truncate text-xs text-slate-500">{item.description}</p>
                      </div>
                      <div className="text-xs text-slate-600">
                        <span className="font-medium text-slate-800">{item.time}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
                        <span className="truncate">{item.practitioner}</span>
                        <ArrowRight className="hidden h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600 sm:block" />
                      </div>
                    </Link>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between lg:flex-col lg:items-end">
                      <Link
                        href={item.href}
                        className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${
                          item.category === "Actie nodig"
                            ? "bg-amber-100 text-amber-900 hover:bg-amber-200"
                            : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {item.action}
                      </Link>
                      <details className="group/details w-full lg:w-auto">
                        <summary className="flex cursor-pointer list-none items-center justify-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50">
                          Details
                          <ChevronDown className="h-3.5 w-3.5 transition group-open/details:rotate-180" />
                        </summary>
                        <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600 lg:w-80">
                          <dl className="grid grid-cols-2 gap-2 border-b border-slate-200 pb-2">
                            <div>
                              <dt className="font-medium text-slate-700">Status</dt>
                              <dd>{item.status}</dd>
                            </div>
                            <div>
                              <dt className="font-medium text-slate-700">Aanbiedingen</dt>
                              <dd>{item.offers}</dd>
                            </div>
                            <div>
                              <dt className="font-medium text-slate-700">Behandeling</dt>
                              <dd>{item.treatment}</dd>
                            </div>
                            <div>
                              <dt className="font-medium text-slate-700">Bron</dt>
                              <dd>Fictieve demo</dd>
                            </div>
                          </dl>
                          <ul className="mt-2 list-disc space-y-1 pl-4">
                            {item.details.map((detail) => (
                              <li key={detail}>{detail}</li>
                            ))}
                          </ul>
                        </div>
                      </details>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
    </DemoShell>
  );
}
