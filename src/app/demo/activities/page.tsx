import Link from "next/link";
import { Activity } from "lucide-react";
import { DemoShell } from "../DemoShell";
import { demoActivityItems } from "../demo-data";

export default function DemoActivitiesPage() {
  return (
    <DemoShell>
      <main className="mx-auto max-w-6xl space-y-6 px-5 py-7">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-blue-700">Activiteiten</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-950">Wat NoShow Control heeft opgevolgd</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Een rustige log met voorbeeldgebeurtenissen. Technische details blijven buiten beeld totdat ze nodig zijn.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
            <Activity className="h-4 w-4" />
            Read-only demo
          </span>
        </header>

        <section aria-labelledby="activities-heading" className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 id="activities-heading" className="text-base font-semibold text-slate-950">
              Recente activiteiten
            </h2>
          </div>
          <ol className="divide-y divide-slate-100">
            {demoActivityItems.map((activity, index) => (
              <li key={activity} className="flex gap-3 px-4 py-3">
                <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">
                  {index + 1}
                </span>
                <p className="text-sm leading-6 text-slate-700">{activity}</p>
              </li>
            ))}
          </ol>
        </section>

        <Link href="/demo/dashboard" className="inline-flex text-sm font-medium text-blue-700 hover:text-blue-800">
          Terug naar dashboard
        </Link>
      </main>
    </DemoShell>
  );
}
