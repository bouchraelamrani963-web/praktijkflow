import Link from "next/link";
import Image from "next/image";
import {
  AlertTriangle,
  ArrowRight,
  CalendarX,
  CheckCheck,
  Clock3,
  Euro,
  PlayCircle,
  Send,
  Sparkles,
  TrendingDown,
  Users,
  Zap,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

// TODO: replace with the real PraktijkFlow demo embed (YouTube or Loom).
// YouTube format:  https://www.youtube.com/embed/<VIDEO_ID>?rel=0&modestbranding=1
// Loom format:     https://www.loom.com/embed/<VIDEO_ID>
const DEMO_VIDEO_EMBED_URL =
  "https://www.youtube.com/embed/aqz-KE-bpKQ?rel=0&modestbranding=1";
const DEMO_VIDEO_IS_PLACEHOLDER = true;

const painPoints = [
  {
    icon: CalendarX,
    title: "Lege stoel = direct verlies",
    description:
      "Een onverwacht gat van 30 of 60 minuten kost u zo €80 tot €200 aan misgelopen omzet — meerdere keren per week.",
  },
  {
    icon: AlertTriangle,
    title: "Last-minute afzeggingen",
    description:
      "Patiënten zeggen vaak pas een paar uur van tevoren af. Te kort om de plek nog handmatig opnieuw te vullen.",
  },
  {
    icon: Users,
    title: "Handmatig bellen kost tijd",
    description:
      "Uw assistente belt rond, laat voicemails achter en wacht op antwoorden. Tijd die niet aan de patiënt besteed wordt.",
  },
];

const solutionPoints = [
  {
    icon: Zap,
    title: "Automatische detectie",
    description:
      "Zodra een afspraak wordt geannuleerd, herkent PraktijkFlow direct de vrijgekomen plek.",
  },
  {
    icon: Sparkles,
    title: "Slimme matching",
    description:
      "Het systeem selecteert geschikte patiënten van de wachtlijst — op behandelaar, type en beschikbaarheid.",
  },
  {
    icon: CheckCheck,
    title: "Direct claimen",
    description:
      "De patiënt claimt de plek met één klik via SMS of e-mail. Wie het eerst reageert, krijgt de afspraak.",
  },
];

const steps = [
  {
    number: "01",
    icon: CalendarX,
    title: "Afspraak geannuleerd",
    description:
      "Een patiënt zegt zijn afspraak af — via de praktijk, telefonisch of via een herinneringslink.",
  },
  {
    number: "02",
    icon: Clock3,
    title: "Plek komt vrij",
    description:
      "PraktijkFlow registreert de open plek automatisch met de juiste tijd, duur en behandelaar.",
  },
  {
    number: "03",
    icon: Send,
    title: "Patiënten krijgen een aanbod",
    description:
      "Geschikte patiënten van de wachtlijst ontvangen direct een SMS met een persoonlijke claimlink.",
  },
  {
    number: "04",
    icon: CheckCheck,
    title: "Eerste claimt → plek gevuld",
    description:
      "De snelste reactie wint. De afspraak wordt automatisch ingepland en de andere aanbiedingen verlopen.",
  },
];

const impactCards = [
  {
    icon: Euro,
    label: "Teruggewonnen omzet",
    value: "Tot €8.400 p/m*",
    description: "uit plekken die anders leeg zouden blijven.",
    color: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
  },
  {
    icon: Clock3,
    label: "Snelle invultijd",
    value: "Vaak < 5 min",
    description: "tussen vrijgekomen plek en bevestigde claim.",
    color: "text-purple-500",
    bg: "bg-purple-50 dark:bg-purple-900/20",
  },
  {
    icon: TrendingDown,
    label: "Minder no-shows",
    value: "Tot −38%*",
    description: "door automatische herinneringen en bevestigingen.",
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-900/20",
  },
  {
    icon: CheckCheck,
    label: "Invulpercentage",
    value: "Tot 72%*",
    description: "van vrijgekomen plekken wordt automatisch opnieuw bezet.",
    color: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-900/20",
  },
];

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        {/* ─── 1. Hero ───────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-gradient-to-b from-white to-zinc-50 dark:from-zinc-950 dark:to-zinc-900">
          <div
            className="absolute inset-x-0 top-0 -z-10 h-[600px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/50 via-transparent to-transparent dark:from-blue-900/20"
            aria-hidden="true"
          />
          <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
            {/* Two-column hero row — text left, clinic visual right on lg+.
                On smaller screens the image stacks below the text. Layout
                primitive itself is unchanged; only the inner row is split. */}
            <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] lg:gap-16">
              <div className="mx-auto max-w-2xl text-center lg:mx-0 lg:text-left">
                <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  Slim wachtlijstbeheer voor tandartspraktijken
                </div>
                {/* T1: value-first headline — concrete range upfront, mechanism second */}
                <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white sm:text-4xl sm:leading-[1.15]">
                  €95–€800 omzet per maand teruggewonnen — automatisch ingevuld binnen minuten
                </h1>
                {/* Real-proof line — specific, recent, low-key so it reads as a
                    fact rather than a marketing claim. */}
                <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                  Bij een praktijk zoals deze werd gisteren €95 teruggewonnen na een annulering.
                </p>
                {/* T2: tighter, direct subtext — no "elke gemiste" vagueness */}
                <p className="mt-7 text-lg leading-7 text-zinc-600 dark:text-zinc-300">
                  Geannuleerde afspraken worden direct aangeboden aan uw wachtlijst — zonder bellen of handmatig plannen.
                </p>
                {/* T5 + T6: CTA row with updated secondary label + trust anchor */}
                <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4 lg:justify-start">
                  <Link
                    href="/dashboard"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 sm:w-auto"
                  >
                    <PlayCircle className="h-4 w-4" />
                    Bekijk direct hoe een afspraak wordt ingevuld
                  </Link>
                  <Link
                    href="#contact"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-6 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700 sm:w-auto"
                  >
                    Plan korte demo (we reageren binnen 1 uur)
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
                {/* Mini-flow — three compact steps showing how a cancellation
                    turns into a filled slot. Inline row, not a new section. */}
                <ol className="mt-5 flex flex-col items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-2 sm:gap-y-1 lg:justify-start">
                  <li>Annulering</li>
                  <li aria-hidden="true" className="hidden sm:inline text-zinc-300 dark:text-zinc-600">→</li>
                  <li>Automatisch aangeboden aan wachtlijst</li>
                  <li aria-hidden="true" className="hidden sm:inline text-zinc-300 dark:text-zinc-600">→</li>
                  <li>Binnen minuten ingevuld</li>
                </ol>
                {/* Speed trust — concrete onboarding promise, own line so it
                    reads as a commitment rather than a buried disclaimer. */}
                <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                  Binnen 1 dag live in uw praktijk
                </p>
                {/* T6: friction-free trust anchor — replaces vague "gebruikt door" */}
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  Geen contract — maandelijks opzegbaar
                </p>
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
                  Geen creditcard nodig · AVG-conform
                </p>
              </div>

              {/* Hero visual — professional dental clinic interior. Bounded
                  width so it never overpowers the headline column, lazy-
                  loaded via Next/Image with explicit sizes for correct
                  responsive asset selection. */}
              <div className="relative mx-auto w-full max-w-[480px] lg:mx-0">
                {/* Context label — tells the viewer the visual is a
                    real-practice illustration, not stock marketing. */}
                <p className="mb-2 text-center text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400 lg:text-left">
                  Live voorbeeld uit een praktijk
                </p>
                <div className="relative aspect-[16/9] overflow-hidden rounded-xl shadow-md shadow-zinc-900/10 ring-1 ring-zinc-900/5 dark:shadow-black/30 dark:ring-white/10">
                  <Image
                    src="https://images.unsplash.com/photo-1629909615184-74f495363b67?auto=format&fit=crop&w=1400&q=85"
                    alt="Rustige, moderne tandartsbehandelkamer met lege behandelstoel en natuurlijk licht"
                    fill
                    sizes="(min-width: 1024px) 480px, (min-width: 640px) 80vw, 100vw"
                    priority
                    className="object-cover object-center opacity-90"
                  />
                  {/* Overlay success pill — raised slightly from the corner
                      so it rests on a quieter area of the minimal frame. */}
                  <div className="absolute bottom-6 left-6 inline-flex items-center gap-1.5 rounded-full bg-emerald-50/95 px-3 py-1 text-xs font-medium text-emerald-800 shadow-sm ring-1 ring-emerald-200/80 backdrop-blur-sm dark:bg-emerald-900/80 dark:text-emerald-200 dark:ring-emerald-800/60">
                    <CheckCheck className="h-3.5 w-3.5" />
                    €95 omzet teruggewonnen in 3 minuten
                  </div>
                </div>
              </div>
            </div>

            {/* Dashboard preview */}
            <div className="mx-auto mt-16 max-w-4xl">
              <div className="relative rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl shadow-blue-500/5 ring-1 ring-zinc-900/5 dark:border-zinc-700 dark:bg-zinc-900">
                <div className="mb-3 flex items-center gap-2 px-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  <span className="ml-2 text-xs text-zinc-500">
                    praktijkflow.nl/dashboard
                  </span>
                </div>
                <div className="grid gap-3 rounded-xl bg-zinc-50 p-4 sm:grid-cols-2 lg:grid-cols-4 dark:bg-zinc-800/50">
                  {[
                    { icon: CalendarX, label: "Vrijgekomen plekken", value: "12", color: "text-red-500" },
                    { icon: Send, label: "Verstuurde aanbiedingen", value: "47", color: "text-blue-500" },
                    { icon: CheckCheck, label: "Ingevulde plekken", value: "9", color: "text-emerald-500" },
                    { icon: Clock3, label: "Gem. invultijd", value: "4 min", color: "text-purple-500" },
                  ].map((m) => (
                    <div
                      key={m.label}
                      className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-600 dark:text-zinc-400">
                          {m.label}
                        </span>
                        <m.icon className={`h-4 w-4 ${m.color}`} />
                      </div>
                      <p className="mt-1.5 text-xl font-bold text-zinc-900 dark:text-white">
                        {m.value}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-600 dark:text-zinc-400">
                      Invulpercentage
                    </span>
                    <span className="font-semibold text-zinc-900 dark:text-white">
                      75%
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                    <div className="h-full w-3/4 rounded-full bg-emerald-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* T7: proof strip — three scannable facts anchored at the bottom
              of the hero. Inline row, no new section, no new layout zone. */}
          <div className="border-t border-zinc-200 dark:border-zinc-800">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <dl className="flex flex-col items-center justify-center gap-6 py-8 sm:flex-row sm:gap-12">
                {[
                  { value: "€300–€800", label: "per maand teruggewonnen" },
                  { value: "1 dag",      label: "tot u live bent" },
                  { value: "100%",       label: "automatisch, geen handmatig werk" },
                ].map((item) => (
                  <div key={item.label} className="text-center">
                    <dt className="text-xl font-semibold text-zinc-900 dark:text-white">
                      {item.value}
                    </dt>
                    <dd className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                      {item.label}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* ─── 2. Probleem → Oplossing ───────────────────────────── */}
        <section className="bg-white py-24 dark:bg-zinc-950">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
                Elke lege stoel is verloren omzet
              </h2>
              <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
                De meeste praktijken verliezen duizenden euro&apos;s per kwartaal
                aan plekken die niet op tijd opnieuw worden gevuld.
              </p>
            </div>

            {/* Pijnpunten */}
            <div className="mt-16 grid gap-6 sm:grid-cols-3">
              {painPoints.map((p) => (
                <div
                  key={p.title}
                  className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300">
                    <p.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-white">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {p.description}
                  </p>
                </div>
              ))}
            </div>

            {/* Oplossing */}
            <div className="mt-20">
              <div className="mx-auto max-w-2xl text-center">
                <h3 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                  PraktijkFlow lost dit volledig automatisch op
                </h3>
                <p className="mt-4 text-base text-zinc-600 dark:text-zinc-400">
                  Geen telefoonrondes meer. Geen lege stoelen. Geen verloren
                  omzet.
                </p>
              </div>
              <div className="mt-12 grid gap-6 sm:grid-cols-3">
                {solutionPoints.map((s) => (
                  <div
                    key={s.title}
                    className="rounded-xl border border-blue-100 bg-blue-50/50 p-6 dark:border-blue-900/40 dark:bg-blue-900/10"
                  >
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
                      <s.icon className="h-5 w-5" />
                    </div>
                    <h4 className="mt-4 text-base font-semibold text-zinc-900 dark:text-white">
                      {s.title}
                    </h4>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                      {s.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ─── 3. Hoe het werkt ─────────────────────────────────── */}
        <section id="how" className="bg-zinc-50 py-24 dark:bg-zinc-900">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
                Hoe het werkt
              </h2>
              <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
                Vier stappen — volledig geautomatiseerd, vanaf annulering tot
                ingevulde plek.
              </p>
            </div>
            <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {steps.map((step) => (
                <div
                  key={step.number}
                  className="relative rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-800"
                >
                  <span className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                    Stap {step.number}
                  </span>
                  <div className="mt-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-white">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── 4. Demo ──────────────────────────────────────────── */}
        <section id="demo" className="bg-white py-24 dark:bg-zinc-950">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
                Zie het in actie
              </h2>
              <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
                Een echte annulering. Een echte SMS. Een echte claim — in
                minder dan een minuut.
              </p>
            </div>

            <div className="mt-12 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 shadow-sm dark:border-zinc-800 dark:bg-zinc-800">
              <div className="relative aspect-video w-full bg-zinc-900">
                <iframe
                  src={DEMO_VIDEO_EMBED_URL}
                  title="PraktijkFlow demo — Binnen 1 minuut opnieuw ingevuld"
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full"
                />
                {DEMO_VIDEO_IS_PLACEHOLDER && (
                  <div className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-white backdrop-blur">
                    <PlayCircle className="h-3 w-3" />
                    Voorbeeldvideo
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 text-center">
              <p className="text-base font-semibold text-zinc-900 dark:text-white">
                Binnen 1 minuut opnieuw ingevuld
              </p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Zie hoe een geannuleerde afspraak automatisch opnieuw wordt
                ingevuld.
              </p>
            </div>
          </div>
        </section>

        {/* ─── 5. Resultaten / Impact ──────────────────────────── */}
        <section className="bg-zinc-50 py-24 dark:bg-zinc-900">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
                Concrete resultaten voor uw praktijk
              </h2>
              <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
                Cijfers die gemiddeld door praktijken op PraktijkFlow worden
                gehaald in het eerste kwartaal.
              </p>
            </div>
            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {impactCards.map((c) => (
                <div
                  key={c.label}
                  className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800"
                >
                  <div
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${c.bg}`}
                  >
                    <c.icon className={`h-6 w-6 ${c.color}`} />
                  </div>
                  <p className="mt-4 text-3xl font-bold text-zinc-900 dark:text-white">
                    {c.value}
                  </p>
                  <p className="mt-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {c.label}
                  </p>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {c.description}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
              *Afhankelijk van praktijkgrootte, wachtlijst en tarieven.
            </p>
          </div>
        </section>

        {/* ─── 6. Final CTA ─────────────────────────────────────── */}
        <section
          id="contact"
          className="relative overflow-hidden bg-blue-600 py-20"
        >
          <div
            className="absolute inset-0 -z-10 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, white 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
            aria-hidden="true"
          />
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Klaar om geen plek meer leeg te laten?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-blue-100">
              Plan een vrijblijvende demo van 15 minuten. We laten zien hoeveel
              omzet uw praktijk maandelijks misloopt — en hoe PraktijkFlow dat
              direct oplost.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Link
                href="mailto:demo@praktijkflow.nl?subject=Demo%20aanvraag"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-8 py-4 text-base font-bold text-blue-700 shadow-lg ring-1 ring-white/60 transition hover:-translate-y-0.5 hover:bg-blue-50 hover:shadow-xl sm:w-auto"
              >
                Plan een demo
                <ArrowRight className="h-5 w-5 transition group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="mailto:contact@praktijkflow.nl"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/40 bg-transparent px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 sm:w-auto"
              >
                Neem contact op
              </Link>
            </div>
            <p className="mt-6 text-sm text-blue-100">
              Of bel ons direct:{" "}
              <a
                href="tel:+31201234567"
                className="font-semibold text-white underline-offset-4 hover:underline"
              >
                +31 20 123 4567
              </a>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
