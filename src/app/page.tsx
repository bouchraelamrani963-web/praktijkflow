import Link from "next/link";
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

/**
 * Landing page styled with the dark-purple design system (glassmorphism,
 * Sora display + DM Sans body, purple CTAs). All copy is preserved from
 * the prior light-theme version — only the visual layer changed. The
 * dashboard pages do NOT inherit this theme; the .pf-dark scope class on
 * the wrapper isolates these styles to this page.
 *
 * The legacy <Navbar /> and <Footer /> components are replaced inline with
 * dark-theme equivalents so we don't have to modify shared layout
 * components that the dashboard also uses.
 */

// TODO: replace with the real NoShow Control demo embed (YouTube or Loom).
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
      "Zodra een afspraak wordt geannuleerd, herkent NoShow Control direct de vrijgekomen plek.",
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
      "NoShow Control registreert de open plek automatisch met de juiste tijd, duur en behandelaar.",
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
  },
  {
    icon: Clock3,
    label: "Snelle invultijd",
    value: "Vaak < 5 min",
    description: "tussen vrijgekomen plek en bevestigde claim.",
  },
  {
    icon: TrendingDown,
    label: "Minder no-shows",
    value: "Tot −38%*",
    description: "door automatische herinneringen en bevestigingen.",
  },
  {
    icon: CheckCheck,
    label: "Invulpercentage",
    value: "Tot 72%*",
    description: "van vrijgekomen plekken wordt automatisch opnieuw bezet.",
  },
];

// Word-mark: "NoShow" weight 700 white, "Control" weight 300 dim.
// Space between the two halves is part of the brand spelling ("NoShow Control"),
// not concatenated like the prior "PraktijkFlow" word-mark.
function WordMark() {
  return (
    <span className="select-none text-lg leading-none" style={{ fontFamily: "var(--pf-font-display)" }}>
      <span style={{ fontWeight: 700, color: "var(--pf-fg-1)" }}>NoShow</span>
      <span style={{ fontWeight: 300, color: "var(--pf-fg-3)" }}>{" Control"}</span>
    </span>
  );
}

export default function HomePage() {
  return (
    <div className="pf-dark min-h-screen">
      {/* ─── Inline dark navbar ─────────────────────────────────────── */}
      <header className="pf-nav fixed inset-x-0 top-0 z-50">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <WordMark />
          </Link>
          <nav className="hidden items-center gap-8 text-sm md:flex" style={{ color: "var(--pf-fg-2)" }}>
            <a href="#how" className="transition hover:text-white">Hoe het werkt</a>
            <a href="#demo" className="transition hover:text-white">Demo</a>
            <a href="#pricing" className="transition hover:text-white">Prijzen</a>
            <Link href="/login" className="transition hover:text-white">Inloggen</Link>
          </nav>
          <Link href="/pricing" className="pf-btn-primary text-xs" style={{ padding: "10px 20px" }}>
            Start gratis
          </Link>
        </div>
      </header>

      <main>
        {/* ═══ 1. HERO ════════════════════════════════════════════════ */}
        <section className="relative overflow-hidden pf-grad-hero pt-32 pb-20 sm:pt-40">
          {/* Dot-grid texture overlay */}
          <div className="pf-dot-grid pointer-events-none absolute inset-0 opacity-100" aria-hidden="true" />
          {/* Ambient glows — top-left purple, bottom-right teal */}
          <div className="pf-glow-purple absolute -left-32 -top-32 h-[600px] w-[600px]" aria-hidden="true" />
          <div className="pf-glow-teal absolute -right-40 bottom-0 h-[500px] w-[500px]" aria-hidden="true" />

          <div className="relative mx-auto max-w-[1100px] px-6">
            {/* Centered single-column hero — matches the design example.
                The abstract dashboard mockup that previously sat to the right
                has moved into its own "Live preview" section directly below
                the proof strip, so the headline gets the full visual weight. */}
            <div className="mx-auto max-w-3xl text-center">
              {/* Eyebrow badge — narrows audience, sets product category */}
              <div
                className="mb-7 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs"
                style={{
                  background: "var(--pf-purple-dim)",
                  border: "1px solid var(--pf-purple-border)",
                  color: "var(--pf-purple-light)",
                  fontWeight: 500,
                }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                No-show recovery voor tandartspraktijken
              </div>

              {/* Headline — gradient on "€800" keeps the value word dominant
                  without overpowering the rest of the line. */}
              <h1
                className="pf-display"
                style={{
                  fontWeight: 800,
                  fontSize: "clamp(40px, 6.5vw, 72px)",
                  lineHeight: 1.05,
                  letterSpacing: "-0.03em",
                  color: "var(--pf-fg-1)",
                }}
              >
                Van lege stoel naar{" "}
                <span
                  style={{
                    background: "var(--pf-grad-accent)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  €800
                </span>
                {" "}extra omzet per maand
              </h1>

              {/* Subheadline — narrower than headline so the line breaks land
                  naturally and the eye flows back to the CTAs. */}
              <p
                className="mx-auto mt-6 max-w-2xl"
                style={{ fontSize: 18, lineHeight: 1.6, color: "var(--pf-fg-2)" }}
              >
                NoShow Control vult open plekken, activeert je wachtlijst en
                laat direct zien hoeveel omzet je terugwint.
              </p>

              {/* CTA row — always centered, primary triggers the 14-day trial */}
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-3">
                <Link href="/pricing" className="pf-btn-primary">
                  Start 14 dagen gratis
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="#demo" className="pf-btn-secondary">
                  Bekijk demo
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              {/* ROI trust line — single sentence positioning the trial as
                  zero-risk: the math justifies itself with one extra slot. */}
              <p className="mt-6 text-sm" style={{ color: "var(--pf-fg-3)" }}>
                Verdient zichzelf terug met 1 extra gevulde afspraak per maand.
              </p>
            </div>
          </div>

          {/* ─── Proof strip — three big numbers anchoring the hero ─── */}
          <div className="relative mt-20 border-t" style={{ borderColor: "var(--pf-border-subtle)" }}>
            <div className="mx-auto max-w-[1100px] px-6">
              <dl className="flex flex-col items-center justify-center gap-8 py-10 sm:flex-row sm:gap-16">
                {[
                  { value: "€300–€800", label: "per maand teruggewonnen" },
                  { value: "1 dag",      label: "tot u live bent" },
                  { value: "100%",       label: "automatisch, geen handmatig werk" },
                ].map((item) => (
                  <div key={item.label} className="text-center">
                    <dt
                      className="pf-display"
                      style={{
                        fontWeight: 700,
                        fontSize: 32,
                        background: "var(--pf-grad-accent)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                      }}
                    >
                      {item.value}
                    </dt>
                    <dd className="mt-1 text-sm" style={{ color: "var(--pf-fg-2)" }}>
                      {item.label}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* ═══ 1.b LIVE PREVIEW — abstract dashboard mockup ═════════════
            Smaller, centered version of the dashboard mockup that previously
            sat in the hero's right column. Sits below the proof strip as the
            "see what you get" moment for users who scrolled past the fold.
            No patient records / X-ray / full-PMS imagery — narrative stays
            scoped to no-shows + waitlist + open slots + revenue recovery. */}
        <section className="relative pt-12 pb-24 sm:pt-16">
          <div className="relative mx-auto max-w-[760px] px-6">
            <p className="pf-eyebrow mb-4 text-center">Live preview · Dashboard</p>

            <div className="relative">
              {/* Soft halo behind the card — design-system glow tokens */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-6 -z-10"
                style={{
                  background:
                    "radial-gradient(ellipse at 30% 20%, rgba(124,58,237,0.28), transparent 65%), radial-gradient(ellipse at 80% 80%, rgba(0,212,180,0.18), transparent 65%)",
                  filter: "blur(40px)",
                }}
              />

              <div
                className="relative overflow-hidden p-4 sm:p-5"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(124,58,237,0.06) 0%, rgba(255,255,255,0.02) 100%)",
                  border: "1px solid var(--pf-border-dim)",
                  borderRadius: "var(--pf-radius-lg)",
                  boxShadow: "var(--pf-shadow-2)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                }}
              >
                {/* Browser chrome — minimal, decorative */}
                <div className="mb-4 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: "rgba(255,255,255,0.18)" }} />
                  <span className="h-2 w-2 rounded-full" style={{ background: "rgba(255,255,255,0.18)" }} />
                  <span className="h-2 w-2 rounded-full" style={{ background: "rgba(255,255,255,0.18)" }} />
                  <span className="ml-2 truncate text-[10px]" style={{ color: "var(--pf-fg-3)" }}>
                    noshowcontrol.nl/dashboard
                  </span>
                </div>

                {/* KPI strip — three outcome metrics */}
                <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                  {[
                    { value: "€800",  label: "Teruggewonnen omzet", accent: "var(--pf-teal-light)",   iconBg: "rgba(0,212,180,0.15)",    icon: Euro },
                    { value: "4",     label: "Lege plekken gevuld", accent: "var(--pf-purple-light)", iconBg: "rgba(124,58,237,0.18)",   icon: CheckCheck },
                    { value: "−32%",  label: "Minder no-shows",     accent: "#ffffff",                iconBg: "rgba(255,255,255,0.06)",  icon: TrendingDown },
                  ].map((kpi) => (
                    <div
                      key={kpi.label}
                      className="p-3"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "var(--pf-radius-md)",
                      }}
                    >
                      <span
                        className="inline-flex h-6 w-6 items-center justify-center"
                        style={{ background: kpi.iconBg, borderRadius: 6 }}
                      >
                        <kpi.icon className="h-3 w-3" style={{ color: kpi.accent }} strokeWidth={2} />
                      </span>
                      <p
                        className="pf-display mt-2 leading-none"
                        style={{ fontWeight: 700, fontSize: 22, color: kpi.accent }}
                      >
                        {kpi.value}
                      </p>
                      <p className="mt-1 text-[10px] leading-tight" style={{ color: "var(--pf-fg-3)" }}>
                        {kpi.label}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Two side-by-side mini-panels: waitlist + open slots */}
                <div className="mt-2.5 grid grid-cols-2 gap-2 sm:gap-2.5">
                  {/* Wachtlijst panel */}
                  <div
                    className="p-3"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "var(--pf-radius-md)",
                    }}
                  >
                    <p
                      className="mb-2 text-[10px] uppercase tracking-wider"
                      style={{ color: "var(--pf-fg-3)", fontWeight: 600 }}
                    >
                      Wachtlijst
                    </p>
                    {[
                      { name: "Sophie de Vries", status: "Aangeboden", dot: "var(--pf-warning)" },
                      { name: "Jan Bakker",      status: "Wachtend",   dot: "var(--pf-purple-light)" },
                      { name: "+8 anderen",      status: null,         dot: null,                    muted: true },
                    ].map((row) => (
                      <div key={row.name} className="flex items-center justify-between py-1 text-[11px]">
                        <span
                          className="truncate"
                          style={{
                            color: row.muted ? "var(--pf-fg-3)" : "var(--pf-fg-2)",
                            opacity: row.muted ? 0.7 : 1,
                          }}
                        >
                          {row.name}
                        </span>
                        {row.status && (
                          <span className="flex shrink-0 items-center gap-1" style={{ color: "var(--pf-fg-3)", fontSize: 10 }}>
                            <span className="h-1.5 w-1.5 rounded-full" style={{ background: row.dot ?? "var(--pf-fg-3)" }} />
                            {row.status}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Open plekken panel */}
                  <div
                    className="p-3"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "var(--pf-radius-md)",
                    }}
                  >
                    <p
                      className="mb-2 text-[10px] uppercase tracking-wider"
                      style={{ color: "var(--pf-fg-3)", fontWeight: 600 }}
                    >
                      Open plekken
                    </p>
                    {[
                      { time: "Wo 14:30", subtitle: "Maria Jansen", badgeText: "Geclaimd",  badgeBg: "rgba(0,212,180,0.18)",   badgeBorder: "rgba(0,212,180,0.4)",   badgeColor: "var(--pf-teal-light)" },
                      { time: "Vr 10:00", subtitle: "Beschikbaar",  badgeText: "2 matches", badgeBg: "rgba(124,58,237,0.18)",  badgeBorder: "rgba(124,58,237,0.4)",  badgeColor: "var(--pf-purple-light)" },
                    ].map((slot) => (
                      <div key={slot.time} className="flex items-center justify-between py-1.5 text-[11px]">
                        <div className="min-w-0 truncate">
                          <span style={{ color: "var(--pf-fg-2)", fontWeight: 600 }}>{slot.time}</span>
                          <span className="ml-1.5" style={{ color: "var(--pf-fg-3)", fontSize: 10 }}>· {slot.subtitle}</span>
                        </div>
                        <span
                          className="shrink-0 rounded-full px-1.5 py-0.5"
                          style={{
                            background: slot.badgeBg,
                            border: `1px solid ${slot.badgeBorder}`,
                            color: slot.badgeColor,
                            fontSize: 9,
                            fontWeight: 600,
                            lineHeight: 1.3,
                          }}
                        >
                          {slot.badgeText}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Activity ticker — single recent line, gives a "live" feel */}
                <div
                  className="mt-2.5 flex items-center gap-2 px-3 py-2"
                  style={{
                    background: "rgba(0,212,180,0.08)",
                    border: "1px solid rgba(0,212,180,0.22)",
                    borderRadius: "var(--pf-radius-md)",
                  }}
                >
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: "var(--pf-teal)" }} />
                  <span className="text-[11px]" style={{ color: "var(--pf-teal-light)", fontWeight: 500 }}>
                    €95 omzet teruggewonnen — 3 min geleden
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ 2. PROBLEM → SOLUTION ══════════════════════════════════ */}
        <section className="pf-section relative">
          <div className="mx-auto max-w-[1100px] px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="pf-eyebrow">Het probleem</p>
              <h2
                className="pf-display mt-3"
                style={{
                  fontWeight: 700,
                  fontSize: "clamp(32px, 4vw, 52px)",
                  lineHeight: 1.1,
                  color: "var(--pf-fg-1)",
                }}
              >
                Elke lege stoel is verloren omzet
              </h2>
              <p className="mt-5" style={{ fontSize: 18, color: "var(--pf-fg-2)" }}>
                De meeste praktijken verliezen duizenden euro&apos;s per kwartaal aan plekken die niet op tijd opnieuw worden gevuld.
              </p>
            </div>

            <div className="mt-16 grid gap-6 sm:grid-cols-3">
              {painPoints.map((p) => (
                <div key={p.title} className="pf-card p-6">
                  <div
                    className="pf-icon-tile"
                    style={{
                      background: "rgba(239, 68, 68, 0.12)",
                      borderColor: "rgba(239, 68, 68, 0.28)",
                      color: "var(--pf-error)",
                    }}
                  >
                    <p.icon className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <h3 className="pf-display mt-5" style={{ fontWeight: 600, fontSize: 18, color: "var(--pf-fg-1)" }}>
                    {p.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--pf-fg-2)" }}>
                    {p.description}
                  </p>
                </div>
              ))}
            </div>

            {/* Solution sub-section */}
            <div className="mt-24">
              <div className="mx-auto max-w-2xl text-center">
                <p className="pf-eyebrow" style={{ color: "var(--pf-purple-light)" }}>De oplossing</p>
                <h3
                  className="pf-display mt-3"
                  style={{
                    fontWeight: 700,
                    fontSize: "clamp(28px, 3.5vw, 42px)",
                    lineHeight: 1.15,
                    color: "var(--pf-fg-1)",
                  }}
                >
                  NoShow Control lost dit volledig automatisch op
                </h3>
                <p className="mt-4" style={{ color: "var(--pf-fg-2)" }}>
                  Geen telefoonrondes meer. Geen lege stoelen. Geen verloren omzet.
                </p>
              </div>

              <div className="mt-12 grid gap-6 sm:grid-cols-3">
                {solutionPoints.map((s) => (
                  <div key={s.title} className="pf-card pf-card-featured p-6">
                    <div className="pf-icon-tile">
                      <s.icon className="h-5 w-5" strokeWidth={1.5} />
                    </div>
                    <h4 className="pf-display mt-5" style={{ fontWeight: 600, fontSize: 18, color: "var(--pf-fg-1)" }}>
                      {s.title}
                    </h4>
                    <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--pf-fg-2)" }}>
                      {s.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══ 3. HOE HET WERKT ═══════════════════════════════════════ */}
        <section id="how" className="pf-section relative" style={{ background: "var(--pf-bg-deep)" }}>
          <div className="pf-glow-purple absolute right-0 top-0 h-[400px] w-[400px] opacity-60" aria-hidden="true" />
          <div className="relative mx-auto max-w-[1100px] px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="pf-eyebrow">Hoe het werkt</p>
              <h2
                className="pf-display mt-3"
                style={{ fontWeight: 700, fontSize: "clamp(32px, 4vw, 52px)", lineHeight: 1.1, color: "var(--pf-fg-1)" }}
              >
                Vier stappen, volledig geautomatiseerd
              </h2>
              <p className="mt-5" style={{ fontSize: 18, color: "var(--pf-fg-2)" }}>
                Vanaf annulering tot ingevulde plek — zonder dat u of uw assistente iets hoeft te doen.
              </p>
            </div>
            <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {steps.map((step) => (
                <div key={step.number} className="pf-card p-6">
                  <span className="pf-eyebrow" style={{ color: "var(--pf-purple-light)" }}>
                    Stap {step.number}
                  </span>
                  <div className="pf-icon-tile mt-3">
                    <step.icon className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <h3 className="pf-display mt-5" style={{ fontWeight: 600, fontSize: 17, color: "var(--pf-fg-1)" }}>
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--pf-fg-2)" }}>
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ 4. DEMO VIDEO ══════════════════════════════════════════ */}
        <section id="demo" className="pf-section relative">
          <div className="mx-auto max-w-5xl px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="pf-eyebrow">Demo</p>
              <h2
                className="pf-display mt-3"
                style={{ fontWeight: 700, fontSize: "clamp(32px, 4vw, 52px)", lineHeight: 1.1, color: "var(--pf-fg-1)" }}
              >
                Zie het in actie
              </h2>
              <p className="mt-5" style={{ fontSize: 18, color: "var(--pf-fg-2)" }}>
                Een echte annulering. Een echte SMS. Een echte claim — in minder dan een minuut.
              </p>
            </div>

            <div
              className="mt-12 overflow-hidden"
              style={{
                borderRadius: "var(--pf-radius-xl)",
                border: "1px solid var(--pf-border-dim)",
                boxShadow: "var(--pf-shadow-3)",
              }}
            >
              <div className="relative aspect-video w-full" style={{ background: "var(--pf-bg-deep)" }}>
                <iframe
                  src={DEMO_VIDEO_EMBED_URL}
                  title="NoShow Control demo — Binnen 1 minuut opnieuw ingevuld"
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full"
                />
                {DEMO_VIDEO_IS_PLACEHOLDER && (
                  <div
                    className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-wide text-white backdrop-blur"
                    style={{
                      background: "rgba(0,0,0,0.6)",
                      fontWeight: 600,
                      letterSpacing: "0.1em",
                    }}
                  >
                    <PlayCircle className="h-3 w-3" />
                    Voorbeeldvideo
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 text-center">
              <p className="pf-display" style={{ fontWeight: 600, fontSize: 18, color: "var(--pf-fg-1)" }}>
                Binnen 1 minuut opnieuw ingevuld
              </p>
              <p className="mt-1 text-sm" style={{ color: "var(--pf-fg-2)" }}>
                Zie hoe een geannuleerde afspraak automatisch opnieuw wordt ingevuld.
              </p>
            </div>
          </div>
        </section>

        {/* ═══ 5. RESULTATEN / IMPACT ═════════════════════════════════ */}
        <section className="pf-section relative" style={{ background: "var(--pf-bg-deep)" }}>
          <div className="pf-glow-teal absolute -right-32 top-1/2 h-[500px] w-[500px] -translate-y-1/2 opacity-70" aria-hidden="true" />
          <div className="relative mx-auto max-w-[1100px] px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="pf-eyebrow">Resultaten</p>
              <h2
                className="pf-display mt-3"
                style={{ fontWeight: 700, fontSize: "clamp(32px, 4vw, 52px)", lineHeight: 1.1, color: "var(--pf-fg-1)" }}
              >
                Concrete cijfers voor uw praktijk
              </h2>
              <p className="mt-5" style={{ fontSize: 18, color: "var(--pf-fg-2)" }}>
                Gemiddeld behaald door praktijken op NoShow Control in het eerste kwartaal.
              </p>
            </div>
            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {impactCards.map((c) => (
                <div key={c.label} className="pf-card p-6">
                  <div className="pf-icon-tile">
                    <c.icon className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <p
                    className="pf-display mt-5"
                    style={{
                      fontWeight: 700,
                      fontSize: 28,
                      background: "var(--pf-grad-accent)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    {c.value}
                  </p>
                  <p className="pf-display mt-2" style={{ fontWeight: 600, fontSize: 14, color: "var(--pf-fg-1)" }}>
                    {c.label}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--pf-fg-2)" }}>
                    {c.description}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-center text-xs" style={{ color: "var(--pf-fg-3)" }}>
              *Afhankelijk van praktijkgrootte, wachtlijst en tarieven.
            </p>
          </div>
        </section>

        {/* ═══ 6. PRICING ═════════════════════════════════════════════ */}
        <section id="pricing" className="pf-section relative">
          <div className="mx-auto max-w-[1100px] px-6">
            <div className="mx-auto max-w-3xl text-center">
              <p className="pf-eyebrow">Prijzen</p>
              <h2
                className="pf-display mt-3"
                style={{ fontWeight: 700, fontSize: "clamp(32px, 4vw, 52px)", lineHeight: 1.1, color: "var(--pf-fg-1)" }}
              >
                NoShow Control wint verloren omzet uit annuleringen automatisch voor u terug
              </h2>
              <p className="mt-5" style={{ fontSize: 18, color: "var(--pf-fg-2)" }}>
                U betaalt een vaste prijs per maand en houdt het verschil.
              </p>

              <div
                className="mt-6 inline-flex items-center gap-2 px-4 py-2 text-xs"
                style={{
                  background: "var(--pf-purple-dim)",
                  border: "1px solid var(--pf-purple-border)",
                  borderRadius: "var(--pf-radius-full)",
                  color: "var(--pf-purple-light)",
                  fontWeight: 600,
                }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Eerste klanten ontvangen blijvende korting — beperkt aantal praktijken per regio
              </div>
            </div>

            <div className="mt-16 grid gap-6 lg:grid-cols-3">
              {[
                {
                  name: "STARTER",
                  price: "€59",
                  audience: "Voor kleine praktijken",
                  savings: "Gemiddeld €150–€400 per maand teruggewonnen",
                  features: ["Basis wachtlijst", "Automatische invulling", "Beperkt dashboard"],
                  featured: false,
                },
                {
                  name: "PRO",
                  price: "€79",
                  audience: "Voor groeiende praktijken",
                  savings: "Gemiddeld €300–€800 per maand teruggewonnen",
                  features: ["Volledige automatisering", "Dashboard inzichten", "Prioriteit in wachtrij"],
                  featured: true,
                },
                {
                  name: "GROWTH",
                  price: "€119",
                  audience: "Voor meerstoelpraktijken",
                  savings: "Gemiddeld €500–€1.200+ per maand teruggewonnen",
                  features: ["Multi-chair optimalisatie", "Geavanceerde rapportage", "Snellere invulling"],
                  featured: false,
                },
              ].map((plan) => (
                <div
                  key={plan.name}
                  className={`pf-card p-7 ${plan.featured ? "pf-card-featured" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="pf-eyebrow" style={{ color: plan.featured ? "var(--pf-purple-light)" : "var(--pf-fg-3)" }}>
                      {plan.name}
                    </span>
                    {plan.featured && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px]"
                        style={{
                          background: "var(--pf-purple)",
                          color: "white",
                          fontWeight: 600,
                          letterSpacing: "0.05em",
                          textTransform: "uppercase",
                        }}
                      >
                        Meest gekozen
                      </span>
                    )}
                  </div>
                  <p className="pf-display mt-4" style={{ fontWeight: 800, fontSize: 48, color: "var(--pf-fg-1)" }}>
                    {plan.price}
                    <span style={{ fontSize: 16, fontWeight: 400, color: "var(--pf-fg-3)" }}>/maand</span>
                  </p>
                  <p className="mt-1 text-sm" style={{ color: "var(--pf-fg-2)" }}>{plan.audience}</p>
                  <p
                    className="mt-4 rounded-md px-3 py-2 text-xs"
                    style={{
                      background: "var(--pf-teal-dim)",
                      border: "1px solid rgba(0,212,180,0.25)",
                      color: "var(--pf-teal-light)",
                      fontWeight: 500,
                    }}
                  >
                    {plan.savings}
                  </p>
                  <ul className="mt-6 space-y-2.5 text-sm" style={{ color: "var(--pf-fg-2)" }}>
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <CheckCheck className="h-4 w-4" style={{ color: "var(--pf-teal)" }} strokeWidth={2} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="#contact"
                    className={`mt-7 w-full ${plan.featured ? "pf-btn-primary" : "pf-btn-secondary"}`}
                    style={{ display: "flex" }}
                  >
                    Start met terugwinnen
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ 7. FINAL CTA ═══════════════════════════════════════════ */}
        <section
          id="contact"
          className="pf-section relative overflow-hidden"
          style={{ background: "var(--pf-bg-deep)" }}
        >
          <div className="pf-glow-purple absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 opacity-80" aria-hidden="true" />
          <div className="pf-dot-grid pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
          <div className="relative mx-auto max-w-3xl px-6 text-center">
            <h2
              className="pf-display"
              style={{ fontWeight: 700, fontSize: "clamp(32px, 4vw, 52px)", lineHeight: 1.1, color: "var(--pf-fg-1)" }}
            >
              Klaar om geen plek meer leeg te laten?
            </h2>
            <p className="mx-auto mt-5 max-w-xl" style={{ fontSize: 18, color: "var(--pf-fg-2)" }}>
              Probeer NoShow Control 14 dagen gratis. We laten direct zien
              hoeveel omzet uw praktijk maandelijks misloopt — en hoe het
              systeem dat automatisch terugwint.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Link href="/pricing" className="pf-btn-primary">
                Start 14 dagen gratis
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="mailto:contact@noshowcontrol.nl" className="pf-btn-secondary">
                Neem contact op
              </Link>
            </div>
            <p className="mt-6 text-sm" style={{ color: "var(--pf-fg-3)" }}>
              Of bel ons direct:{" "}
              <a href="tel:+31201234567" style={{ color: "var(--pf-purple-light)", fontWeight: 600 }} className="underline-offset-4 hover:underline">
                +31 20 123 4567
              </a>
            </p>
          </div>
        </section>
      </main>

      {/* ─── Inline dark footer ──────────────────────────────────────── */}
      <footer className="border-t" style={{ borderColor: "var(--pf-border-subtle)", background: "var(--pf-bg-base)" }}>
        <div className="mx-auto flex max-w-[1100px] flex-col items-center justify-between gap-4 px-6 py-10 sm:flex-row">
          <div className="flex items-center gap-3">
            <WordMark />
            <span className="text-xs" style={{ color: "var(--pf-fg-3)" }}>
              © {new Date().getFullYear()} NoShow Control
            </span>
          </div>
          <nav className="flex items-center gap-6 text-xs" style={{ color: "var(--pf-fg-3)" }}>
            <a href="#how" className="transition hover:text-white">Hoe het werkt</a>
            <a href="#pricing" className="transition hover:text-white">Prijzen</a>
            <Link href="/login" className="transition hover:text-white">Inloggen</Link>
            <a href="mailto:contact@noshowcontrol.nl" className="transition hover:text-white">Contact</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
