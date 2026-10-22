import Link from "next/link";
import { ArrowRight, ArrowUpRight, CheckCircle2, CalendarClock, ListChecks, Send } from "lucide-react";
import { DemoShell } from "./DemoShell";

const steps = [
  { index: "01", icon: CalendarClock, title: "Er komt een afspraak vrij", text: "De praktijk ziet meteen welke behandeltijd beschikbaar is geworden." },
  { index: "02", icon: ListChecks, title: "De wachtlijst toont passende patiënten", text: "Op basis van voorkeuren en beschikbaarheid kunt u kandidaten bekijken." },
  { index: "03", icon: Send, title: "Een uitnodiging wordt klaargezet", text: "De praktijk houdt controle over wie een aanbod krijgt en wanneer." },
  { index: "04", icon: CheckCircle2, title: "De open plek wordt opnieuw ingevuld", text: "Na acceptatie verschijnt de afspraak als ingevuld in het overzicht." },
];

export default function DemoHomePage() {
  return (
    <DemoShell>
      <main className="ns-demo-home">
        <section className="ns-demo-hero">
          <div className="ns-demo-hero-copy">
            <p className="ns-demo-eyebrow">ZÓ WERKT NOSHOW CONTROL</p>
            <h1>Van lege stoel naar <em>nieuwe afspraak.</em></h1>
            <p>Ontdek in een voorbeeldomgeving hoe een geannuleerde afspraak via de wachtlijst opnieuw kan worden ingevuld — zonder te werken met echte patiëntgegevens.</p>
            <div className="ns-demo-hero-links">
              <Link href="/demo/dashboard" className="ns-demo-primary">Open het demo-dashboard <ArrowRight className="h-4 w-4" /></Link>
              <a href="#demo-stappen" className="ns-demo-secondary">Bekijk het proces <ArrowUpRight className="h-4 w-4" /></a>
            </div>
          </div>
          <div className="ns-demo-flow" aria-label="Vier stappen van annulering tot ingevulde afspraak">
            <span className="ns-demo-flow-label">VOORBEELD VAN DE WORKFLOW</span>
            <div className="ns-demo-flow-row"><span>14:30</span><strong>Afspraak geannuleerd</strong><span className="ns-demo-flow-pill ns-demo-flow-muted">Vrijgekomen</span></div>
            <div className="ns-demo-flow-row"><span>14:31</span><strong>Passende kandidaten gevonden</strong><span className="ns-demo-flow-pill">Wachtlijst</span></div>
            <div className="ns-demo-flow-row"><span>14:38</span><strong>Testaanbod aangemaakt</strong><span className="ns-demo-flow-pill">Testmodus</span></div>
            <div className="ns-demo-flow-row ns-demo-flow-success"><span>14:51</span><strong>Afspraak opnieuw ingevuld</strong><span className="ns-demo-flow-pill">Bevestigd</span></div>
            <p>Fictieve tijden en situaties. In deze demo worden geen berichten verstuurd.</p>
          </div>
        </section>
        <section id="demo-stappen" className="ns-demo-how">
          <div className="ns-demo-section-title"><p className="ns-demo-eyebrow">VAN ANNULERING TOT RESERVERING</p><h2>Vier heldere stappen.<br/><em>Eén overzicht.</em></h2></div>
          <div className="ns-demo-steps">
            {steps.map((step) => (
              <article key={step.index}>
                <div className="ns-demo-step-top"><span>{step.index}</span><step.icon className="h-5 w-5" strokeWidth={1.6}/></div>
                <h3>{step.title}</h3><p>{step.text}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="ns-demo-end"><div><p className="ns-demo-eyebrow">BEKIJK DE SCHERMEN</p><h2>Ontdek de praktijkomgeving.</h2><p>Bekijk hoe het dashboard, de agenda en de wachtlijst samenwerken met fictieve voorbeeldgegevens.</p></div><Link className="ns-demo-primary" href="/demo/dashboard">Naar het dashboard <ArrowRight className="h-4 w-4"/></Link></section>
      </main>
    </DemoShell>
  );
}
