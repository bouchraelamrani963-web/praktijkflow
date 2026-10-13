"use client";

import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { DemoShell } from "../DemoShell";
import { demoWaitlistItems } from "../demo-data";

const matchFilters = [
  { value: "all", label: "Alle matches" },
  { value: "good", label: "Goede match" },
  { value: "offered", label: "Aanbod loopt" },
  { value: "none", label: "Geen match" },
] as const;

const statusFilters = [
  { value: "all", label: "Alle statussen" },
  { value: "Wachtend", label: "Wachtend" },
  { value: "Aanbod loopt", label: "Aanbod loopt" },
] as const;

export default function DemoWaitlistPage() {
  const [query, setQuery] = useState("");
  const [match, setMatch] = useState("all");
  const [status, setStatus] = useState("all");
  const [selectedId, setSelectedId] = useState(demoWaitlistItems[0]?.id ?? "");

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return demoWaitlistItems.filter((item) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [item.name, item.preference, item.match, item.practitionerPreference].some((value) =>
          value.toLowerCase().includes(normalizedQuery),
        );
      const matchesMatch = match === "all" || item.matchKey === match;
      const matchesStatus = status === "all" || item.status === status;
      return matchesQuery && matchesMatch && matchesStatus;
    });
  }, [match, query, status]);

  const selectedItem =
    filteredItems.find((item) => item.id === selectedId) ?? filteredItems[0] ?? demoWaitlistItems[0];

  return (
    <DemoShell>
      <main className="mx-auto max-w-6xl space-y-5 px-5 py-7">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-blue-700">Wachtlijst</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-950">Kandidaten voor vrijgekomen plekken</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Zoek en beoordeel fictieve wachtlijstpatiënten zonder handmatige acties of echte berichten.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
            <Users className="h-4 w-4" />
            Fictieve patiënten
          </span>
        </header>

        <section aria-label="Wachtlijst filters" className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1fr_13rem_13rem]">
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Zoeken
              <span className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Naam, voorkeur of behandelaar"
                  className="min-h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </span>
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Match
              <select
                value={match}
                onChange={(event) => setMatch(event.target.value)}
                className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
              >
                {matchFilters.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
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
        </section>

        <div className="grid gap-5 lg:grid-cols-[1fr_21rem]">
          <section aria-labelledby="waitlist-heading" className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 id="waitlist-heading" className="text-base font-semibold text-slate-950">
                Wachtlijstoverzicht
              </h2>
              <p className="mt-1 text-xs text-slate-500">{filteredItems.length} fictieve patiënten zichtbaar</p>
            </div>

            {filteredItems.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={`grid w-full gap-2 px-4 py-3 text-left outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 sm:grid-cols-[1fr_1fr_9rem] sm:items-center ${
                        selectedItem.id === item.id ? "bg-blue-50/60" : ""
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">{item.name}</p>
                        <p className="truncate text-xs text-slate-500">{item.preference}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">{item.match}</p>
                        <p className="truncate text-xs text-slate-500">{item.practitionerPreference}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="w-fit rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                          {item.status}
                        </span>
                        {item.offerMode === "Testmodus" && (
                          <span className="w-fit rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900">
                            Testmodus
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-4 py-8 text-sm text-slate-600">
                Geen fictieve wachtlijstpatiënten gevonden met deze filters.
              </div>
            )}
          </section>

          <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" aria-labelledby="waitlist-detail-heading">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Read-only detail</p>
            <h2 id="waitlist-detail-heading" className="mt-2 text-base font-semibold text-slate-950">
              {selectedItem.name}
            </h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <div>
                <dt className="text-xs font-medium uppercase text-slate-500">Voorkeur</dt>
                <dd className="mt-1 text-slate-800">{selectedItem.preference}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-slate-500">Behandelaar</dt>
                <dd className="mt-1 text-slate-800">{selectedItem.practitionerPreference}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-slate-500">Matchstatus</dt>
                <dd className="mt-1 text-slate-800">{selectedItem.match}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-slate-500">Aanbod</dt>
                <dd className="mt-1">
                  <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                    {selectedItem.offerMode}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-slate-500">Notitie</dt>
                <dd className="mt-1 text-slate-700">{selectedItem.note}</dd>
              </div>
            </dl>
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
              Geen actieknoppen in deze demo. Selecteren en aanbieden gebeurt in de echte flow bewust via de open plek.
            </div>
          </aside>
        </div>
      </main>
    </DemoShell>
  );
}
