import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { PublicAccountNav } from "@/components/brand/PublicAccountNav";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  ListChecks,
  Mail,
} from "lucide-react";

const process = [
  {
    number: "01",
    title: "Er komt tijd vrij.",
    description:
      "Een geannuleerde afspraak verschijnt direct als open plek, met de duur, behandelaar en behandeling.",
  },
  {
    number: "02",
    title: "De wachtlijst helpt zoeken.",
    description:
      "Bekijk welke patiënten passen en bepaal zelf aan wie u de beschikbare tijd aanbiedt.",
  },
  {
    number: "03",
    title: "De agenda wordt weer gevuld.",
    description:
      "Een patiënt bevestigt via een persoonlijke link. De plek wordt gereserveerd en dubbele claims worden voorkomen.",
  },
];

const detailRows = [
  { label: "Open plekken", value: "Direct inzicht in vrijgekomen tijd" },
  { label: "Patiëntvoorkeuren", value: "Match op dag, tijd en behandeling" },
  { label: "Uitnodigingen", value: "Persoonlijke aanbiedingslink" },
  { label: "Bevestigingen", value: "Heldere status per afspraak" },
];

function Identity({ footer = false }: { footer?: boolean }) {
  return (
    <Link href="/" className={footer ? "ns-brand ns-brand-footer" : "ns-brand"} aria-label="NoShow Control – startpagina">
      <BrandLogo />
    </Link>
  );
}

function AppointmentVisual() {
  return (
    <div className="ns-workspace" aria-label="Voorbeeld van een agenda en de opvolging van een vrijgekomen plek">
      <div className="ns-workspace-header">
        <div>
          <span className="ns-small-label">ZO KAN HET WERKEN</span>
          <h2>Uw agenda, weer in balans.</h2>
        </div>
        <span className="ns-demo-tag">Voorbeeld</span>
      </div>

      <div className="ns-agenda-frame">
        <div className="ns-agenda-heading">
          <span className="ns-agenda-kicker"><CalendarDays size={15} strokeWidth={1.7} /> Dagoverzicht</span>
          <span className="ns-agenda-day">Donderdag · voorbeeldplanning</span>
        </div>
        <div className="ns-agenda-row">
          <span className="ns-agenda-time">14:00</span>
          <div className="ns-agenda-event">
            <span className="ns-event-marker ns-marker-green" />
            <div><strong>Periodieke controle</strong><span>30 minuten · Behandelkamer 1</span></div>
            <span className="ns-event-status">Gepland</span>
          </div>
        </div>
        <div className="ns-agenda-row">
          <span className="ns-agenda-time">14:30</span>
          <div className="ns-agenda-event ns-agenda-recovered">
            <span className="ns-event-marker ns-marker-terracotta" />
            <div><strong>Vrijgekomen afspraak</strong><span>15 minuten · Consult</span></div>
            <span className="ns-event-status ns-status-open">Open plek</span>
          </div>
        </div>
        <div className="ns-agenda-row">
          <span className="ns-agenda-time">14:45</span>
          <div className="ns-agenda-event">
            <span className="ns-event-marker ns-marker-green" />
            <div><strong>Behandeling</strong><span>45 minuten · Behandelkamer 1</span></div>
            <span className="ns-event-status">Gepland</span>
          </div>
        </div>
      </div>

      <div className="ns-activity-line">
        <div className="ns-activity-icon"><Check size={17} strokeWidth={2.1} /></div>
        <div className="ns-activity-copy"><strong>Open plek opnieuw ingevuld</strong><span>Wachtlijst → aanbieding → bevestiging</span></div>
        <ArrowUpRight size={18} strokeWidth={1.8} aria-hidden="true" />
      </div>
      <p className="ns-visual-note">Illustratieve weergave. Geen echte patiënt- of praktijkgegevens.</p>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="ns-landing">
      <header className="ns-header">
        <div className="ns-container ns-header-content">
          <Identity />
          <nav className="ns-top-nav" aria-label="Hoofdnavigatie">
            <a href="#werkwijze">Werkwijze</a>
            <a href="#mogelijkheden">Mogelijkheden</a>
            <Link href="/pricing">Tarieven</Link>
          </nav>
          <div className="ns-nav-actions">
            <PublicAccountNav />
            <Link href="/demo" className="ns-nav-cta">Bekijk de demo <ArrowUpRight size={15} /></Link>
          </div>
        </div>
      </header>

      <main>
        <section className="ns-hero">
          <div className="ns-container ns-hero-grid">
            <div className="ns-hero-copy">
              <div className="ns-overline"><span className="ns-overline-dot" /> AGENDA & WACHTLIJST VOOR DE MONDZORG</div>
              <h1>Een annulering hoeft geen <em>lege stoel</em> te betekenen.</h1>
              <p className="ns-lead">
                Maak van vrijgekomen tijd weer een afspraak. NoShow Control helpt uw praktijk
                om open plekken te herkennen, passende wachtlijstpatiënten te vinden en
                afspraken zorgvuldig opnieuw in te vullen.
              </p>
              <div className="ns-hero-actions">
                <Link href="/demo" className="ns-btn ns-btn-dark">Bekijk hoe het werkt <ArrowRight size={18} /></Link>
                <Link href="/login" className="ns-text-link">Naar uw praktijkomgeving <ArrowUpRight size={17} /></Link>
              </div>
              <div className="ns-hero-facts">
                <span><CheckCircle2 size={16} /> Gericht uitnodigen</span>
                <span><CheckCircle2 size={16} /> Praktijk houdt controle</span>
              </div>
            </div>
            <AppointmentVisual />
          </div>
        </section>

        <div className="ns-strap">
          <div className="ns-container ns-strap-grid">
            <div><span>01</span><strong>Minder zoeken naar passende patiënten</strong></div>
            <div><span>02</span><strong>Duidelijkheid over iedere open plek</strong></div>
            <div><span>03</span><strong>Een rustige workflow voor het team</strong></div>
          </div>
        </div>

        <section id="werkwijze" className="ns-section ns-process-section">
          <div className="ns-container ns-process-grid">
            <div className="ns-section-intro">
              <p className="ns-eyebrow">VAN AFZEGGING TOT NIEUWE AFSPRAAK</p>
              <h2>De dagelijkse praktijk, <em>maar dan eenvoudiger.</em></h2>
              <p>Geen extra systeem waar u op moet letten. Wel één duidelijk overzicht voor de momenten waarop de planning verandert.</p>
              <Link href="/demo" className="ns-inline-action">Bekijk de interactieve demo <ArrowUpRight size={17} /></Link>
            </div>
            <div className="ns-process-list">
              {process.map((item) => (
                <article className="ns-process-item" key={item.number}>
                  <span className="ns-process-number">{item.number}</span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="mogelijkheden" className="ns-section ns-features-section">
          <div className="ns-container ns-feature-grid">
            <div className="ns-feature-surface">
              <div className="ns-feature-top">
                <span className="ns-small-label">PRAKTIJKOVERZICHT</span>
                <span className="ns-feature-indicator"><span /> Wachtlijst actief</span>
              </div>
              <div className="ns-feature-summary">
                <span className="ns-feature-summary-icon"><ListChecks size={24} strokeWidth={1.65}/></span>
                <div>
                  <p>Vrijgekomen tijd</p>
                  <strong>Wie past in deze plek?</strong>
                </div>
              </div>
              <div className="ns-patient-line"><span className="ns-patient-avatar">A</span><span><strong>Patiënt A</strong><small>Flexibel beschikbaar</small></span><span className="ns-match">Passend</span></div>
              <div className="ns-patient-line"><span className="ns-patient-avatar">B</span><span><strong>Patiënt B</strong><small>Voorkeur: middag</small></span><span className="ns-match">Passend</span></div>
              <div className="ns-patient-line"><span className="ns-patient-avatar">C</span><span><strong>Patiënt C</strong><small>Voorkeur: andere dag</small></span><span className="ns-muted-match">Niet passend</span></div>
              <div className="ns-feature-footer"><Mail size={16}/><span>Bepaal zelf wie u een aanbod stuurt.</span></div>
            </div>
            <div className="ns-feature-copy">
              <p className="ns-eyebrow">WAT U ERMEE KUNT</p>
              <h2>Overzicht dat uw team <em>echt helpt.</em></h2>
              <p className="ns-feature-intro">Geen overdaad aan grafieken. Alleen de informatie die belangrijk is voor de volgende stap in de agenda.</p>
              <div className="ns-detail-list">
                {detailRows.map((row) => (
                  <div key={row.label}><strong>{row.label}</strong><span>{row.value}</span><ArrowUpRight size={16} aria-hidden="true"/></div>
                ))}
              </div>
              <p className="ns-feature-disclaimer">Voorbeeldschermen tonen fictieve informatie. Echte uitnodigingen en herinneringen hangen af van de ingestelde verzendfuncties.</p>
            </div>
          </div>
        </section>

        <section className="ns-section ns-perspective">
          <div className="ns-container ns-perspective-inner">
            <span className="ns-quote-symbol" aria-hidden="true">“</span>
            <p>De agenda verandert elke dag. De manier waarop uw praktijk daarop reageert, hoeft niet ingewikkeld te zijn.</p>
            <div className="ns-perspective-end"><span>GEMAAKT VOOR HET RITME VAN EEN TANDARTSPRAKTIJK</span><Clock3 size={22} strokeWidth={1.3}/></div>
          </div>
        </section>

        <section className="ns-bottom-cta">
          <div className="ns-container ns-bottom-grid">
            <div>
              <p className="ns-eyebrow">ONTDEK NOSHOW CONTROL</p>
              <h2>Meer grip op de dag. <em>Meer rust aan de balie.</em></h2>
            </div>
            <div className="ns-bottom-actions">
              <Link href="/demo" className="ns-btn ns-btn-light">Bekijk de demo <ArrowUpRight size={18}/></Link>
              <Link href="/pricing" className="ns-bottom-link">Bekijk de tarieven <ArrowRight size={17}/></Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="ns-footer">
        <div className="ns-container ns-footer-inner">
          <Identity footer />
          <span>© {new Date().getFullYear()} NoShow Control</span>
          <nav aria-label="Voettekst">
            <Link href="/pricing">Tarieven</Link>
            <Link href="/demo">Demo</Link>
            <Link href="/login">Inloggen</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
