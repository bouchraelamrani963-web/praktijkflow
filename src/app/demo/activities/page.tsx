"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Activity, Filter } from "lucide-react";
import { DemoShell } from "../DemoShell";
import { demoActivityItems } from "../demo-data";

const activityFilters = [
  { value: "all", label: "Alle activiteiten" },
  { value: "cancellations", label: "Annuleringen" },
  { value: "offers", label: "Aanbiedingen" },
  { value: "confirmations", label: "Bevestigingen" },
  { value: "errors", label: "Fouten" },
] as const;

type ActivityFilter = (typeof activityFilters)[number]["value"];

export default function DemoActivitiesPage() {
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const [selectedId, setSelectedId] = useState(demoActivityItems[0]?.id ?? "");

  const filteredActivities = useMemo(() => {
    const items = filter === "all"
      ? demoActivityItems
      : demoActivityItems.filter((item) => item.category === filter);
    return [...items].sort((a, b) => b.sortOrder - a.sortOrder);
  }, [filter]);

  const selectedActivity =
    filteredActivities.find((item) => item.id === selectedId) ?? filteredActivities[0] ?? null;
  const visibleSelectedId = selectedActivity?.id ?? "";
  const selectedAppointmentDate =
    selectedActivity && "appointmentDate" in selectedActivity ? selectedActivity.appointmentDate : null;
  const selectedAppointmentTime =
    selectedActivity && "appointmentTime" in selectedActivity ? selectedActivity.appointmentTime : null;

  return (
    <DemoShell>
      <main className="mx-auto max-w-6xl space-y-6 px-5 py-7">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-blue-700">Activiteiten</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-950">Wat NoShow Control heeft opgevolgd</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Bekijk fictieve gebeurtenissen rond annuleringen, aanbiedingen, bevestigingen en uitzonderingen.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
            <Activity className="h-4 w-4" />
            Read-only demo
          </span>
        </header>

        <section aria-label="Activiteitenfilters" className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Filter</p>
              <p className="mt-1 text-sm text-slate-600">Nieuwste activiteit staat bovenaan.</p>
            </div>
            <label className="grid gap-1 text-sm font-medium text-slate-700 sm:w-64">
              Activiteitstype
              <select
                value={filter}
                onChange={(event) => {
                  setFilter(event.target.value as ActivityFilter);
                  setSelectedId("");
                }}
                className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
              >
                {activityFilters.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
          <section aria-labelledby="activities-heading" className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div>
                <h2 id="activities-heading" className="text-base font-semibold text-slate-950">
                  Recente activiteiten
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {filteredActivities.length} activiteit{filteredActivities.length === 1 ? "" : "en"} zichtbaar
                </p>
              </div>
              <Filter className="h-4 w-4 text-slate-400" aria-hidden="true" />
            </div>

            {filteredActivities.length > 0 ? (
              <ol className="divide-y divide-slate-100">
                {filteredActivities.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(item.id)}
                        className={`grid w-full gap-3 px-4 py-3 text-left outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 sm:grid-cols-[2.5rem_1fr_8rem] sm:items-center ${
                          visibleSelectedId === item.id ? "bg-blue-50/60" : ""
                        }`}
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-xs font-medium text-slate-500">{item.dateTime}</span>
                          <span className="mt-1 block truncate text-sm font-semibold text-slate-950">{item.title}</span>
                          <span className="mt-1 block truncate text-xs text-slate-500">{item.description}</span>
                        </span>
                        <span className={`w-fit rounded-full border px-2 py-1 text-xs font-medium ${item.statusClass}`}>
                          {item.status}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <div className="px-4 py-8 text-sm text-slate-600">
                Geen fictieve activiteiten gevonden met dit filter.
              </div>
            )}
          </section>

          <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" aria-labelledby="activity-detail-heading">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Read-only detail</p>
            {selectedActivity ? (
              <>
                <h2 id="activity-detail-heading" className="mt-2 text-base font-semibold text-slate-950">
                  {selectedActivity.title}
                </h2>
                <dl className="mt-4 grid gap-3 text-sm">
                  <DetailRow label="Type gebeurtenis" value={selectedActivity.type} />
                  <DetailRow label="Activiteit geregistreerd" value={selectedActivity.dateTime} />
                  <DetailRow label="Betrokken behandelaar" value={selectedActivity.practitioner} />
                  <DetailRow label="Betrokken afspraak" value={selectedActivity.appointment} />
                  {selectedAppointmentDate && (
                    <DetailRow label="Afspraakdatum" value={selectedAppointmentDate} />
                  )}
                  {selectedAppointmentTime && (
                    <DetailRow label="Afspraaktijd" value={selectedAppointmentTime} />
                  )}
                  <DetailRow label="Fictieve patiënt" value={selectedActivity.patient} />
                  <DetailRow label="Uitgevoerde actie" value={selectedActivity.action} />
                  <DetailRow label="Resultaat" value={selectedActivity.result} />
                  <DetailRow label="Foutmelding" value={selectedActivity.error} />
                  <DetailRow label="Vervolgstap" value={selectedActivity.nextStep} />
                </dl>
                <Link
                  href={selectedActivity.linkHref}
                  className="mt-4 inline-flex min-h-10 items-center rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  {selectedActivity.linkLabel}
                </Link>
              </>
            ) : (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                Selecteer een zichtbare activiteit om de details te bekijken.
              </div>
            )}
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
              Deze demo is volledig read-only. Er worden geen berichten verstuurd, betalingen gestart of gegevens opgeslagen.
            </div>
          </aside>
        </div>

        <Link href="/demo/dashboard" className="inline-flex text-sm font-medium text-blue-700 hover:text-blue-800">
          Terug naar dashboard
        </Link>
      </main>
    </DemoShell>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 text-slate-800">{value}</dd>
    </div>
  );
}
