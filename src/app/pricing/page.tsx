import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { plans } from "@/lib/stripe/plans";

const benefitText: Record<string, string[]> = {
  starter: [
    "Open plekken overzichtelijk bijhouden",
    "Wachtlijstpatiënten beheren",
    "Zelf geschikte kandidaten selecteren",
  ],
  pro: [
    "Persoonlijke claim-links voor aanbiedingen",
    "Aanbiedingsstatussen en opvolging",
    "Dashboard met open plekken en uitzonderingen",
    "Automatische herkenning van annuleringen",
  ],
  enterprise: [
    "Overzicht voor meerdere behandelaren",
    "Open plekken en wachtlijst op één plaats",
    "Werkprocessen voor grotere praktijkteams",
    "Verdere teamfuncties in ontwikkeling",
  ],
};

export default function PricingPage() {
  return (
    <div className="ns-landing ns-pricing">
      <header className="ns-header">
        <div className="ns-container ns-header-content">
          <Link href="/" className="ns-brand" aria-label="NoShow Control — naar homepage">
            <BrandLogo />
          </Link>
          <nav className="ns-top-nav" aria-label="Hoofdnavigatie">
            <Link href="/#werkwijze">Werkwijze</Link>
            <Link href="/#mogelijkheden">Mogelijkheden</Link>
            <Link href="/pricing" aria-current="page">Tarieven</Link>
          </nav>
          <div className="ns-nav-actions">
            <Link href="/login" className="ns-link-login">Inloggen</Link>
            <Link href="/demo" className="ns-nav-cta">Bekijk de demo <ArrowUpRight size={15} /></Link>
          </div>
        </div>
      </header>

      <main>
        <section className="ns-pricing-hero">
          <div className="ns-container">
            <p className="ns-eyebrow">OVERZICHTELIJK ABONNEMENT</p>
            <h1>Meer ruimte in de agenda.<br/><em>Een pakket dat past.</em></h1>
            <p className="ns-pricing-lead">
              Iedere praktijk werkt anders. Van een eenvoudige wachtlijst tot het
              zorgvuldig opvolgen van vrijgekomen behandeltijd: ontdek welke
              mogelijkheden bij uw team passen.
            </p>
            <p className="ns-pricing-status">Pakketindeling in voorbereiding · Online betaling nog niet actief</p>
          </div>
        </section>

        <section className="ns-pricing-section" aria-label="Abonnementen vergelijken">
          <div className="ns-container ns-pricing-grid">
            {plans.map((plan, index) => (
              <article
                key={plan.id}
                className={`ns-pricing-plan ${plan.highlighted ? "ns-pricing-plan-featured" : ""}`}
              >
                <div className="ns-pricing-card-top">
                  <span className="ns-pricing-plan-index">0{index + 1} / 03</span>
                  {plan.highlighted && <span className="ns-pricing-plan-label">VOOR DAGELIJKS GEBRUIK</span>}
                </div>
                <h2>{plan.name}</h2>
                <p className="ns-pricing-tagline">{plan.tagline}</p>
                <p className="ns-pricing-price">
                  <strong>€{plan.price}</strong>
                  <span>/ maand</span>
                </p>
                <p className="ns-pricing-tax">Indicatie, exclusief btw</p>
                <div className="ns-pricing-divider" />
                <p className="ns-pricing-includes">BEOGDE MOGELIJKHEDEN</p>
                <ul>
                  {(benefitText[plan.id] ?? plan.features).map((feature) => (
                    <li key={feature}>
                      <Check size={16} aria-hidden="true" strokeWidth={1.8} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link className="ns-pricing-action" href={`/register?plan=${encodeURIComponent(plan.id)}`}>
                  Account aanmaken <ArrowUpRight size={17} aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
          <div className="ns-container">
            <p className="ns-pricing-smallprint">
              Dit is een voorlopige pakketindeling. De definitieve functies per
              abonnement, de betaalafhandeling en commerciële voorwaarden worden
              nog vastgesteld. Een account aanmaken is nog geen betaalde
              abonnementsovereenkomst.
            </p>
          </div>
        </section>

        <section className="ns-pricing-outro">
          <div className="ns-container ns-pricing-outro-inner">
            <div>
              <p className="ns-eyebrow">EERST ZELF ERVAREN</p>
              <h2>Bekijk NoShow Control<br/><em>in de praktijk.</em></h2>
              <p>Ontdek met fictieve gegevens hoe een annulering via de wachtlijst opnieuw kan worden ingevuld.</p>
            </div>
            <Link href="/demo" className="ns-pricing-demo-action">
              Open de interactieve demo <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>
      <footer className="ns-footer">
        <div className="ns-container ns-footer-inner">
          <Link href="/" className="ns-brand ns-brand-footer" aria-label="NoShow Control — naar homepage"><BrandLogo /></Link>
          <span>© {new Date().getFullYear()} NoShow Control</span>
          <nav aria-label="Voettekst">
            <Link href="/">Home</Link>
            <Link href="/demo">Demo</Link>
            <Link href="/login">Inloggen</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
