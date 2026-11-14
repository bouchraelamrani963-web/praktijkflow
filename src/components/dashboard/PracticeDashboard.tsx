import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarDays, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { AMSTERDAM_TIME_ZONE } from "@/lib/dashboard/amsterdam-day";
import { DASHBOARD_PAGE_SIZE, type DashboardData, type DashboardSlot, type DashboardSlotPage } from "@/lib/dashboard/types";

type PageKind = "actions" | "history";

const slotTime = new Intl.DateTimeFormat("nl-NL", {
  timeZone: AMSTERDAM_TIME_ZONE, weekday: "short", day: "numeric", month: "short",
  hour: "2-digit", minute: "2-digit",
});
const fullDate = new Intl.DateTimeFormat("nl-NL", {
  timeZone: AMSTERDAM_TIME_ZONE, dateStyle: "full",
});

const dayCards = [
  { key: "appointments", label: "Afspraken", status: "PLANNED" },
  { key: "noShows", label: "No-shows", status: "NO_SHOW" },
  { key: "cancellations", label: "Annuleringen", status: "CANCELLED" },
] as const;

const slotCards = [
  { key: "released", label: "Vrijgekomen vandaag", hint: "Uit een bestaande afspraak" },
  { key: "available", label: "Nu beschikbaar", hint: "Beschikbare plekken in de toekomst" },
  { key: "filled", label: "Opnieuw ingevuld vandaag", hint: "Plekken die vandaag zijn geclaimd" },
] as const;

const actions = {
  candidates: { title: "Open plek klaar voor opvolging", button: "Bekijk kandidaten" },
  "no-candidates": { title: "Geen passende wachtlijstkandidaten", button: "Bekijk kandidaten" },
  failed: { title: "Verzending mislukt", button: "Controleer verzending" },
  "review-offer": { title: "Geen geldig verzonden aanbod gevonden", button: "Controleer aanbod" },
  waiting: { title: "Wacht op reactie", button: "Bekijk aanbod" },
  history: { title: "Tijdslot verstreken", button: "Bekijk tijdslot" },
};

function Unavailable() {
  return (
    <p role="status" className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <AlertTriangle size={17} aria-hidden="true" />
      Gegevens niet beschikbaar. Probeer te vernieuwen.
    </p>
  );
}

function SlotRow({ item }: { item: DashboardSlot }) {
  const copy = item.action === "history" && item.status === "CLAIMED"
    ? { title: "Opnieuw ingevuld", button: "Bekijk tijdslot" }
    : actions[item.action];
  return (
    <li className="grid min-w-0 gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="break-words text-sm font-semibold text-[#21483c]">{copy.title}</h3>
          {item.urgent && <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-950">Vandaag opvolgen</span>}
        </div>
        <p className="mt-1 break-words text-sm text-zinc-700">
          <time dateTime={item.startTime}>{slotTime.format(new Date(item.startTime))}</time>
          { ` · ${item.durationMinutes} min${item.appointmentType ? ` · ${item.appointmentType}` : ""} · ${item.practitioner}` }
        </p>
        {(item.sent > 0 || item.simulated > 0) && (
          <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-zinc-600">
            {item.sent > 0 && <span>{item.sent} verzonden · wacht op reactie</span>}
            {item.simulated > 0 && <span>{item.simulated} testaanbod · gesimuleerd</span>}
          </p>
        )}
      </div>
      <Link className="inline-flex min-h-10 w-fit items-center gap-2 rounded border border-[#c4d7cc] px-3 text-sm font-semibold text-[#285e49] hover:bg-[#edf3ee]" href={item.href}>
        {copy.button} <ArrowRight size={15} aria-hidden="true" />
      </Link>
    </li>
  );
}

function SlotList({
  label, data, page, empty, onPage,
}: {
  label: string;
  data: DashboardSlotPage | null;
  page: number;
  empty: string;
  onPage: (page: number) => void;
}) {
  if (!data) return <Unavailable />;
  if (data.total === 0) {
    return <p className="rounded-md border border-[#dce4da] bg-white p-4 text-sm text-zinc-700">{empty}</p>;
  }
  const lastPage = Math.max(1, Math.ceil(data.total / DASHBOARD_PAGE_SIZE));
  return (
    <div className="overflow-hidden rounded-md border border-[#dce4da] bg-white">
      <ul aria-label={label} className="divide-y divide-[#e4e9e2]">
        {data.items.map((item) => <SlotRow key={item.id} item={item} />)}
      </ul>
      {!data.items.length && <p className="px-4 py-3 text-sm">Op deze pagina staan geen tijdsloten meer.</p>}
      {(lastPage > 1 || page > 1) && (
        <nav aria-label={`${label} · pagina's`} className="flex flex-wrap items-center justify-between gap-2 border-t border-[#dce4da] px-3 py-2 text-sm text-zinc-700">
          <button type="button" onClick={() => onPage(Math.min(page - 1, lastPage))} disabled={page <= 1} className="flex min-h-10 items-center gap-1 rounded px-2 disabled:opacity-50">
            <ChevronLeft size={16} aria-hidden="true" /> Vorige
          </button>
          <span>Pagina {page} van {lastPage} · {data.total} tijdsloten</span>
          <button type="button" onClick={() => onPage(page + 1)} disabled={page >= lastPage} className="flex min-h-10 items-center gap-1 rounded px-2 disabled:opacity-50">
            Volgende <ChevronRight size={16} aria-hidden="true" />
          </button>
        </nav>
      )}
    </div>
  );
}

export function PracticeDashboard({
  data, loading, pages, onPage, onRefresh, preview = false,
}: {
  data: DashboardData | null;
  loading: boolean;
  pages: Record<PageKind, number>;
  onPage: (kind: PageKind, page: number) => void;
  onRefresh: () => void;
  preview?: boolean;
}) {
  const counts = data?.counts;
  return (
    <div className="ns-app-dashboard mx-auto max-w-6xl space-y-6 text-zinc-950" aria-busy={loading}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dce4da] pb-4">
        <div>
          {preview && <p className="mb-1 text-xs font-semibold text-amber-900">Preview met fictieve gegevens</p>}
          <h1 className="text-3xl font-bold text-[#21483c]">Planningsoverzicht</h1>
          {data && <p className="mt-1 text-sm text-zinc-700"><time dateTime={data.day}>{fullDate.format(new Date(`${data.day}T12:00:00Z`))}</time></p>}
        </div>
        <button type="button" onClick={onRefresh} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded border border-[#c4d7cc] bg-white px-3 text-sm font-semibold text-[#285e49] disabled:opacity-60">
          <RefreshCw size={16} aria-hidden="true" /> Vernieuwen
        </button>
      </header>

      {loading && !data && <p role="status" className="p-3 text-sm">Dashboard laden…</p>}
      {!loading && !data && <Unavailable />}
      {data && (
        <>
          <section aria-labelledby="day-heading">
            <h2 id="day-heading" className="mb-2 text-lg font-semibold text-[#21483c]">Vandaag</h2>
            {counts ? (
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {dayCards.map(({ key, label, status }) => (
                  <Link key={key} href={`/appointments?dateFrom=${data.day}&dateTo=${data.day}&status=${status}`} className="min-w-0 rounded-md border border-[#dce4da] bg-white p-2.5 hover:border-[#457b63] sm:p-4">
                    <div className="flex items-start justify-between gap-1">
                      <span className="break-words text-sm font-semibold text-[#21483c]">{label}</span>
                      <CalendarDays size={17} aria-hidden="true" className="hidden shrink-0 text-[#507864] sm:block" />
                    </div>
                    <p className="mt-2 text-2xl font-bold tabular-nums text-[#21483c]">{counts[key]}</p>
                  </Link>
                ))}
              </div>
            ) : <Unavailable />}
          </section>

          <section aria-labelledby="actions-heading">
            <h2 id="actions-heading" className="mb-2 text-lg font-semibold text-[#21483c]">Actie nodig</h2>
            <SlotList label="Actie nodig" data={data.actions} page={pages.actions}
              empty="Geen toekomstige tijdsloten om op te volgen." onPage={(page) => onPage("actions", page)} />
          </section>

          <section aria-labelledby="slots-heading">
            <h2 id="slots-heading" className="mb-2 text-lg font-semibold text-[#21483c]">Vrijgekomen tijdsloten</h2>
            {counts ? (
              <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
                {slotCards.map(({ key, label, hint }) => (
                  <article key={key} className="rounded-md border border-[#dce4da] bg-white p-3 sm:p-4">
                    <h3 className="text-sm font-semibold text-[#21483c]">{label}</h3>
                    <p className="mt-2 text-2xl font-bold tabular-nums text-[#21483c]">{counts[key]}</p>
                    <p className="mt-1 text-xs text-zinc-600">{hint}</p>
                  </article>
                ))}
              </div>
            ) : <Unavailable />}
          </section>

          <section aria-labelledby="history-heading">
            <h2 id="history-heading" className="mb-2 text-lg font-semibold text-[#21483c]">Terugkijken</h2>
            <SlotList label="Terugkijken" data={data.history} page={pages.history}
              empty="Geen verstreken of afgehandelde tijdsloten." onPage={(page) => onPage("history", page)} />
          </section>
        </>
      )}
    </div>
  );
}
