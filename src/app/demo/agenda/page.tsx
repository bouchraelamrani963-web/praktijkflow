"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Clock3, Filter } from "lucide-react";
import { DemoShell } from "../DemoShell";
import { demoAgendaItems } from "../demo-data";

const views = [
  { key: "day", label: "Dag" },
  { key: "week", label: "Week" },
  { key: "list", label: "Lijst" },
] as const;

const statusFilters = [
  { value: "all", label: "Alle statussen" },
  { value: "available", label: "Beschikbaar" },
  { value: "offered", label: "Aangeboden" },
  { value: "claimed", label: "Geclaimd" },
  { value: "confirmed", label: "Bevestigd" },
  { value: "cancelled", label: "Geannuleerd" },
] as const;

type AgendaView = (typeof views)[number]["key"];

export default function DemoAgendaPage() {
  const [view, setView] = useState<AgendaView>("day");
  const [practitioner, setPractitioner] = useState("all");
  const [status, setStatus] = useState("all");
  const [selectedId, setSelectedId] = useState(demoAgendaItems[0]?.id ?? "");

  const practitioners = useMemo(
    () => Array.from(new Set(demoAgendaItems.map((item) => item.practitioner))),
    [],
  );

  const filteredItems = useMemo(() => {
    return demoAgendaItems.filter((item) => {
      const matchesView = view === "list" || item.viewGroup === view;
      const matchesPractitioner = practitioner === "all" || item.practitioner === practitioner;
      const matchesStatus = status === "all" || item.statusKey === status;
      return matchesView && matchesPractitioner && matchesStatus;
    });
  }, [practitioner, status, view]);

  const selectedItem =
    filteredItems.find((item) => item.id === selectedId) ?? filteredItems[0] ?? demoAgendaItems[0];

  return (
    <DemoShell>
      <main className="mx-auto max-w-6xl space-y-5 px-5 py-7">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-blue-700">Agenda</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-950">Beschikbaarheid en vrijgekomen plekken</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Beheer in deze demo alleen wat NoShow Control nodig heeft: tijdsloten, annuleringen en beschikbare plekken.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
            <CalendarDays className="h-4 w-4" />
            Fictieve agenda
          </span>
        </header>

        <section aria-label="Agenda filters" className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="inline-flex w-full rounded-lg border border-slate-200 bg-slate-50 p-1 sm:w-fit" role="tablist" aria-label="Agendaweergave">
              {views.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="tab"
                  aria-selected={view === item.key}
                  onClick={() => setView(item.key)}
                  className={`min-h-10 flex-1 rounded-md px-4 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-blue-500 sm:flex-none ${
                    view === item.key ? "bg-white text-slate-950 shadow-sm" : "text-slate-600 hover:text-slate-950"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Behandelaar
                <select
                  value={practitioner}
                  onChange={(event) => setPractitioner(event.target.value)}
                  className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Alle behandelaren</option>
                  {practitioners.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Status
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {statusFilters.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[1fr_21rem]">
          <section aria-labelledby="agenda-list-heading" className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div>
                <h2 id="agenda-list-heading" className="text-base font-semibold text-slate-950">
                  {view === "day" ? "Dagweergave" : view === "week" ? "Weekweergave" : "Lijstweergave"}
                </h2>
                <p className="mt-1 text-xs text-slate-500">{filteredItems.length} fictieve items zichtbaar</p>
              </div>
              <Filter className="h-4 w-4 text-slate-400" aria-hidden="true" />
            </div>

            {filteredItems.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={`grid w-full gap-2 px-4 py-3 text-left outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 sm:grid-cols-[6rem_1fr_9rem] sm:items-center ${
                        selectedItem.id === item.id ? "bg-blue-50/60" : ""
                      }`}
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{item.start}</p>
                        <p className="text-xs text-slate-500">{item.end}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">{item.title}</p>
                        <p className="truncate text-xs text-slate-500">
                          {item.date} - {item.practitioner} - {item.treatment}
                        </p>
                      </div>
                      <span className={`w-fit rounded-full border px-2 py-1 text-xs font-medium ${item.tone}`}>
                        {item.status}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-4 py-8 text-sm text-slate-600">
                Geen fictieve afspraken gevonden met deze filters.
              </div>
            )}
          </section>

          <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" aria-labelledby="agenda-detail-heading">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Read-only detail</p>
            <h2 id="agenda-detail-heading" className="mt-2 text-base font-semibold text-slate-950">
              {selectedItem.title}
            </h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <div>
                <dt className="text-xs font-medium uppercase text-slate-500">Moment</dt>
                <dd className="mt-1 text-slate-800">
                  {selectedItem.time}, {selectedItem.start}-{selectedItem.end}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-slate-500">Behandelaar</dt>
                <dd className="mt-1 text-slate-800">{selectedItem.practitioner}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-slate-500">Status</dt>
                <dd className={`mt-1 inline-flex rounded-full border px-2 py-1 text-xs font-medium ${selectedItem.tone}`}>
                  {selectedItem.status}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-slate-500">Context</dt>
                <dd className="mt-1 text-slate-700">{selectedItem.detail}</dd>
              </div>
            </dl>
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
              <Clock3 className="mb-2 h-4 w-4 text-slate-400" aria-hidden="true" />
              Dit detailpaneel is alleen visueel. Er wordt niets opgeslagen of verstuurd.
            </div>
          </aside>
        </div>
      </main>
    </DemoShell>
  );
}
