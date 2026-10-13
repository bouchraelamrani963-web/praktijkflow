"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Filter } from "lucide-react";
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

const TIME_ZONE = "Europe/Amsterdam";

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return startOfLocalDay(next);
}

function startOfWeek(date: Date): Date {
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return addDays(date, mondayOffset);
}

function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TIME_ZONE,
  }).format(date);
}

function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: TIME_ZONE,
  }).format(date);
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateInputValue(value: string): Date | null {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function sameDay(a: Date, b: Date): boolean {
  return startOfLocalDay(a).getTime() === startOfLocalDay(b).getTime();
}

function itemDate(item: (typeof demoAgendaItems)[number], today: Date): Date {
  if (item.date === "Morgen") return addDays(today, 1);
  if (item.date === "Donderdag") return addDays(startOfWeek(today), 3);
  if (item.date === "Vrijdag") return addDays(startOfWeek(today), 4);
  return today;
}

function sortByDateAndTime<T extends { dateObject: Date; start: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const dateDiff = a.dateObject.getTime() - b.dateObject.getTime();
    if (dateDiff !== 0) return dateDiff;
    return a.start.localeCompare(b.start);
  });
}

export default function DemoAgendaPage() {
  const [view, setView] = useState<AgendaView>("day");
  const [practitioner, setPractitioner] = useState("all");
  const [status, setStatus] = useState("all");
  const [selectedId, setSelectedId] = useState(demoAgendaItems[0]?.id ?? "");
  const today = useMemo(() => startOfLocalDay(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedWeekDay, setSelectedWeekDay] = useState<Date | null>(null);

  const practitioners = useMemo(
    () => Array.from(new Set(demoAgendaItems.map((item) => item.practitioner))),
    [],
  );

  const datedItems = useMemo(
    () =>
      demoAgendaItems.map((item) => {
        const dateObject = itemDate(item, today);
        return {
          ...item,
          dateObject,
          dateLabel: formatShortDate(dateObject),
          fullDateLabel: formatLongDate(dateObject),
        };
      }),
    [today],
  );

  const selectedWeekStart = useMemo(() => startOfWeek(selectedDate), [selectedDate]);
  const selectedWeekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(selectedWeekStart, index)),
    [selectedWeekStart],
  );
  const selectedWeekEnd = selectedWeekDays[6];
  const activeWeekDay = view === "week" ? selectedWeekDay : null;

  const filteredItems = useMemo(() => {
    const weekEndExclusive = addDays(selectedWeekStart, 7);
    const scopedItems = datedItems.filter((item) => {
      if (view === "day") return sameDay(item.dateObject, selectedDate);
      if (view === "week") {
        if (activeWeekDay) return sameDay(item.dateObject, activeWeekDay);
        return item.dateObject >= selectedWeekStart && item.dateObject < weekEndExclusive;
      }
      return true;
    });

    return sortByDateAndTime(scopedItems.filter((item) => {
      const matchesPractitioner = practitioner === "all" || item.practitioner === practitioner;
      const matchesStatus = status === "all" || item.statusKey === status;
      return matchesPractitioner && matchesStatus;
    }));
  }, [activeWeekDay, datedItems, practitioner, selectedDate, selectedWeekStart, status, view]);

  const groupedItems = useMemo(() => {
    const groups = new Map<string, typeof filteredItems>();
    for (const item of filteredItems) {
      const key = toDateInputValue(item.dateObject);
      groups.set(key, [...(groups.get(key) ?? []), item]);
    }
    return Array.from(groups.entries()).map(([key, items]) => ({
      key,
      label: items[0]?.fullDateLabel ?? key,
      items,
    }));
  }, [filteredItems]);

  const selectedItem = filteredItems.find((item) => item.id === selectedId) ?? filteredItems[0] ?? null;
  const visibleSelectedId = selectedItem?.id ?? "";

  const periodLabel = view === "week"
    ? activeWeekDay
      ? `${formatLongDate(activeWeekDay)} binnen week ${formatShortDate(selectedWeekStart)} t/m ${formatShortDate(selectedWeekEnd)}`
      : `Week van ${formatShortDate(selectedWeekStart)} t/m ${formatShortDate(selectedWeekEnd)}`
    : view === "day"
      ? formatLongDate(selectedDate)
      : "Alle fictieve agenda-items";

  function movePeriod(direction: -1 | 1) {
    setSelectedDate((current) => addDays(current, direction * (view === "week" ? 7 : 1)));
    setSelectedWeekDay((current) => current ? addDays(current, direction * 7) : null);
  }

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
          <div className="mb-3 flex flex-col gap-3 border-b border-slate-100 pb-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Geselecteerde periode</p>
              <p className="mt-1 text-lg font-semibold text-slate-950">{periodLabel}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => movePeriod(-1)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-label={view === "week" ? "Vorige week" : "Vorige dag"}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedDate(today);
                  setSelectedWeekDay(view === "week" && activeWeekDay ? today : null);
                }}
                className="inline-flex min-h-10 items-center rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Vandaag
              </button>
              <label className="relative inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-within:ring-2 focus-within:ring-blue-500">
                <CalendarDays className="h-4 w-4" />
                Kies datum
                <input
                  type="date"
                  value={toDateInputValue(selectedDate)}
                  onChange={(event) => {
                    const nextDate = fromDateInputValue(event.target.value);
                    if (nextDate) {
                      setSelectedDate(nextDate);
                      setSelectedWeekDay(view === "week" && activeWeekDay ? nextDate : null);
                    }
                  }}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  aria-label="Kies een datum"
                />
              </label>
              <button
                type="button"
                onClick={() => movePeriod(1)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-label={view === "week" ? "Volgende week" : "Volgende dag"}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="inline-flex w-full rounded-lg border border-slate-200 bg-slate-50 p-1 sm:w-fit" role="tablist" aria-label="Agendaweergave">
              {views.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="tab"
                  aria-selected={view === item.key}
                  onClick={() => {
                    setView(item.key);
                    setSelectedWeekDay(null);
                  }}
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
                <p className="mt-1 text-xs text-slate-500">
                  {filteredItems.length} fictieve item{filteredItems.length === 1 ? "" : "s"} zichtbaar
                </p>
              </div>
              <Filter className="h-4 w-4 text-slate-400" aria-hidden="true" />
            </div>

            {view === "week" && (
              <div className="border-b border-slate-100 p-3">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {activeWeekDay ? `Gefilterd op ${formatLongDate(activeWeekDay)}` : "Hele week zichtbaar"}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedWeekDay(null)}
                    className={`inline-flex min-h-9 items-center rounded-lg border px-3 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      activeWeekDay
                        ? "border-slate-300 text-slate-700 hover:bg-slate-50"
                        : "border-blue-200 bg-blue-50 text-blue-800"
                    }`}
                    aria-pressed={!activeWeekDay}
                  >
                    Hele week
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                  {selectedWeekDays.map((day) => {
                    const count = datedItems.filter((item) => {
                      const matchesDay = sameDay(item.dateObject, day);
                      const matchesPractitioner = practitioner === "all" || item.practitioner === practitioner;
                      const matchesStatus = status === "all" || item.statusKey === status;
                      return matchesDay && matchesPractitioner && matchesStatus;
                    }).length;
                    const isToday = sameDay(day, today);
                    const isSelected = activeWeekDay ? sameDay(day, activeWeekDay) : false;
                    return (
                      <button
                        key={toDateInputValue(day)}
                        type="button"
                        onClick={() => setSelectedWeekDay(day)}
                        className={`rounded-lg border p-2 text-left text-sm outline-none transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-500 ${
                          isSelected
                            ? "border-blue-300 bg-blue-100 text-blue-950 shadow-sm"
                            : isToday
                              ? "border-blue-200 bg-blue-50 text-blue-900"
                              : "border-slate-200 bg-slate-50 text-slate-700"
                        }`}
                        aria-pressed={isSelected}
                      >
                        <p className="font-semibold">{formatShortDate(day)}</p>
                        <p className="mt-1 text-xs">{count} item{count === 1 ? "" : "s"}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {filteredItems.length > 0 ? (
              <div>
                {view === "list" ? (
                  <div className="divide-y divide-slate-100">
                    {groupedItems.map((group) => (
                      <div key={group.key}>
                        <h3 className="bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {group.label}
                        </h3>
                        <AgendaItemList
                          items={group.items}
                          selectedId={visibleSelectedId}
                          onSelect={setSelectedId}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <AgendaItemList
                    items={filteredItems}
                    selectedId={visibleSelectedId}
                    onSelect={setSelectedId}
                  />
                )}
              </div>
            ) : (
              <div className="px-4 py-8 text-sm text-slate-600">
                {view === "week" && activeWeekDay
                  ? "Geen afspraken op deze dag"
                  : "Geen fictieve afspraken gevonden met deze filters."}
              </div>
            )}
          </section>

          <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" aria-labelledby="agenda-detail-heading">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Read-only detail</p>
            {selectedItem ? (
              <>
                <h2 id="agenda-detail-heading" className="mt-2 text-base font-semibold text-slate-950">
                  {selectedItem.title}
                </h2>
                <dl className="mt-4 grid gap-3 text-sm">
                  <div>
                    <dt className="text-xs font-medium uppercase text-slate-500">Moment</dt>
                    <dd className="mt-1 text-slate-800">
                      {selectedItem.fullDateLabel}, {selectedItem.start}-{selectedItem.end}
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
              </>
            ) : (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                Selecteer een zichtbare afspraak om de details te bekijken.
              </div>
            )}
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

function AgendaItemList({
  items,
  selectedId,
  onSelect,
}: {
  items: ((typeof demoAgendaItems)[number] & { dateLabel: string })[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            onClick={() => onSelect(item.id)}
            className={`grid w-full gap-2 px-4 py-3 text-left outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 sm:grid-cols-[6rem_1fr_9rem] sm:items-center ${
              selectedId === item.id ? "bg-blue-50/60" : ""
            }`}
          >
            <div>
              <p className="text-sm font-semibold text-slate-950">{item.start}</p>
              <p className="text-xs text-slate-500">{item.end}</p>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">{item.title}</p>
              <p className="truncate text-xs text-slate-500">
                {item.dateLabel} - {item.practitioner} - {item.treatment}
              </p>
            </div>
            <span className={`w-fit rounded-full border px-2 py-1 text-xs font-medium ${item.tone}`}>
              {item.status}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
