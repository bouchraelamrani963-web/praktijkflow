import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  ClipboardList,
  Mail,
  ShieldCheck,
} from "lucide-react";

const steps = [
  {
    title: "Annulering wordt zichtbaar",
    description:
      "Een vrijgekomen afspraak wordt als open plek geregistreerd, inclusief tijd, behandelaar en behandelingstype.",
  },
  {
    title: "Wachtlijst wordt gematcht",
    description:
      "De praktijk ziet passende patiënten op de wachtlijst en kan gericht een aanbod sturen.",
  },
  {
    title: "Patiënt bevestigt online",
    description:
      "De eerste patiënt die de plek accepteert, reserveert de afspraak. Andere links worden netjes geblokkeerd.",
  },
];

const features = [
  {
    icon: CalendarClock,
    title: "Open plekken beheren",
    description:
      "Bekijk vrijgekomen afspraken, status, bron en opvolging op één overzichtelijke plek.",
  },
  {
    icon: ClipboardList,
    title: "Wachtlijst gebruiken",
    description:
      "Leg voorkeuren vast en vind patiënten die passen bij de vrijgekomen tijd en behandeling.",
  },
  {
    icon: Mail,
    title: "Aanbod via e-mail",
    description:
      "Stuur een persoonlijke claim-link vanuit de praktijk. Testmodus maakt controleren eenvoudig.",
  },
  {
    icon: ShieldCheck,
    title: "Veilig claimen",
    description:
      "Elke link is uniek. Wie als eerste bevestigt, krijgt de plek; dubbele claims worden geblokkeerd.",
  },
];

const demoRows = [
  { label: "Open plek", value: "Vandaag 14:30", status: "Beschikbaar" },
  { label: "Wachtlijst", value: "3 passende patiënten", status: "Klaar" },
  { label: "Aanbod", value: "2 claim-links gemaakt", status: "Testmodus" },
  { label: "Bevestiging", value: "Nog geen claim", status: "Wachtend" },
];

const plans = [
  {
    name: "Starter",
    price: "€59",
    description: "Voor praktijken die open plekken en wachtlijst digitaal willen beheren.",
  },
  {
    name: "Pro",
    price: "€79",
    description: "Voor praktijken die aanbiedingen en claim-links structureel willen gebruiken.",
  },
  {
    name: "Growth",
    price: "€119",
    description: "Voor grotere praktijken met meerdere behandelaren en meer agendabeheer.",
  },
];

function WordMark() {
  return (
    <span className="select-none text-lg leading-none" style={{ fontFamily: "var(--pf-font-display)" }}>
      <span style={{ fontWeight: 700, color: "var(--pf-fg-1)" }}>NoShow</span>
      <span style={{ fontWeight: 400, color: "var(--pf-fg-3)" }}>{" Control"}</span>
    </span>
  );
}

export default function HomePage() {
  return (
    <div className="pf-dark min-h-screen">
      <header className="pf-nav fixed inset-x-0 top-0 z-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/" aria-label="NoShow Control home">
            <WordMark />
          </Link>
          <nav className="hidden items-center gap-7 text-sm md:flex" style={{ color: "var(--pf-fg-2)" }}>
            <a href="#how" className="transition hover:text-blue-700">Hoe het werkt</a>
            <a href="#features" className="transition hover:text-blue-700">Functionaliteiten</a>
            <a href="#pricing" className="transition hover:text-blue-700">Prijzen</a>
            <Link href="/login" className="transition hover:text-blue-700">Inloggen</Link>
          </nav>
          <Link href="/login" className="pf-btn-primary text-sm" style={{ padding: "10px 18px" }}>
            Naar app
          </Link>
        </div>
      </header>

      <main>
        <section className="pf-grad-hero pt-28 pb-16 sm:pt-36 sm:pb-20">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-[1fr_0.9fr]">
            <div>
              <p className="pf-eyebrow">Agenda- en wachtlijstsoftware voor tandartspraktijken</p>
              <h1 className="pf-display mt-4 max-w-2xl text-4xl font-bold leading-tight text-zinc-950 sm:text-5xl">
                Minder lege plekken in uw agenda.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                NoShow Control helpt uw praktijk om annuleringen, open plekken
                en wachtlijstpatiënten overzichtelijk te beheren. Rustig,
                controleerbaar en zonder onnodige handmatige opvolging.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/login" className="pf-btn-primary">
                  Inloggen
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link href="#how" className="pf-btn-secondary">
                  Bekijk hoe het werkt
                </Link>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" aria-label="Demo dashboard voorbeeld">
              <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Dashboard demo</p>
                  <p className="text-xs text-slate-500">Voorbeeldweergave, geen echte praktijkdata</p>
                </div>
                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                  Demo
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {demoRows.map((row) => (
                  <div key={row.label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-medium text-slate-500">{row.label}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">{row.value}</p>
                    <p className="mt-2 text-xs text-slate-600">{row.status}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-950">
                Patiënten ontvangen een duidelijke claim-link. De praktijk houdt
                controle over wat wordt aangeboden.
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="pf-section bg-white">
          <div className="mx-auto max-w-6xl px-5">
            <div className="max-w-2xl">
              <p className="pf-eyebrow">Hoe het werkt</p>
              <h2 className="pf-display mt-3 text-3xl font-semibold text-slate-950 sm:text-4xl">
                Van vrijgekomen afspraak naar bevestigde plek.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                De flow is ontworpen voor de dagelijkse praktijk: snel inzicht,
                begrijpelijke acties en duidelijke statussen.
              </p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {steps.map((step, index) => (
                <article key={step.title} className="pf-card p-5">
                  <span className="text-sm font-semibold text-blue-700">Stap {index + 1}</span>
                  <h3 className="mt-3 text-lg font-semibold text-slate-950">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="pf-section" style={{ background: "var(--pf-bg-deep)" }}>
          <div className="mx-auto max-w-6xl px-5">
            <div className="max-w-2xl">
              <p className="pf-eyebrow">Functionaliteiten</p>
              <h2 className="pf-display mt-3 text-3xl font-semibold text-slate-950 sm:text-4xl">
                Alles rond open plekken op één plek.
              </h2>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <article key={feature.title} className="pf-card p-5">
                  <div className="pf-icon-tile">
                    <feature.icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-slate-950">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{feature.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="pf-section bg-white">
          <div className="mx-auto max-w-6xl px-5">
            <div className="max-w-2xl">
              <p className="pf-eyebrow">Prijzen</p>
              <h2 className="pf-display mt-3 text-3xl font-semibold text-slate-950 sm:text-4xl">
                Eenvoudige pakketten voor praktijksoftware.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                Kies een pakket dat past bij hoe uw praktijk wachtlijst en
                agenda wil beheren.
              </p>
            </div>
            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              {plans.map((plan) => (
                <article key={plan.name} className="pf-card p-6">
                  <h3 className="text-base font-semibold text-slate-950">{plan.name}</h3>
                  <p className="mt-4 text-3xl font-semibold text-slate-950">
                    {plan.price}
                    <span className="text-sm font-normal text-slate-500"> / maand</span>
                  </p>
                  <p className="mt-4 text-sm leading-6 text-slate-600">{plan.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-slate-200 bg-slate-50 py-12">
          <div className="mx-auto flex max-w-6xl flex-col gap-5 px-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">
                Klaar om de workflow rustiger te beheren?
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Log in en bekijk uw dashboard, open plekken en wachtlijst.
              </p>
            </div>
            <Link href="/login" className="pf-btn-primary">
              Inloggen
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <WordMark />
            <span>© {new Date().getFullYear()} NoShow Control</span>
          </div>
          <nav className="flex flex-wrap gap-5">
            <a href="#how" className="hover:text-blue-700">Hoe het werkt</a>
            <a href="#features" className="hover:text-blue-700">Functionaliteiten</a>
            <a href="#pricing" className="hover:text-blue-700">Prijzen</a>
            <Link href="/login" className="hover:text-blue-700">Inloggen</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
