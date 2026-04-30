import { Calendar, Shield, Clock, Users, LayoutDashboard, HelpCircle, Zap } from "lucide-react";

const sections = [
  {
    icon: HelpCircle,
    title: "Hoe werkt NoShow Control?",
    content: `NoShow Control helpt uw praktijk om verloren omzet door annuleringen en no-shows automatisch terug te winnen.

Wanneer een afspraak uitvalt:

1. komt de plek direct vrij
2. ontvangen wachtende patiënten automatisch een aanbod
3. wordt de plek opnieuw ingevuld
4. en blijft de omzet behouden`,
  },
  {
    icon: Calendar,
    title: "Afspraken beheren",
    content: `Ga naar "Afspraken" in het menu om al uw afspraken te bekijken, aan te maken of te bewerken.

• Nieuwe afspraak: klik op "Nieuwe afspraak" rechtsboven
• Status wijzigen: gebruik het statusmenu op de detailpagina (Gepland → Bevestigd → Afgerond)
• Filteren: gebruik de filters bovenaan om te zoeken op datum, status, risico of behandelaar
• CSV-import: importeer afspraken vanuit een extern systeem via de importknop`,
  },
  {
    icon: Shield,
    title: "No-shows voorkomen",
    content: `NoShow Control helpt u no-shows te verminderen met automatische herinneringen.

• 48-uurs herinnering: patiënt ontvangt een SMS twee dagen voor de afspraak
• 24-uurs herinnering: patiënt ontvangt een SMS één dag voor de afspraak
• Bevestigingslink: patiënt kan de afspraak bevestigen via een link in de SMS
• Annuleringslink: patiënt kan annuleren, waardoor de plek automatisch beschikbaar komt
• Risicoscore: elke afspraak krijgt een risicoscore op basis van patiëntgeschiedenis

Configureer herinneringen via Instellingen → No-show herinneringen.`,
  },
  {
    icon: Clock,
    title: "Open plekken vullen",
    content: `Wanneer een patiënt annuleert, wordt automatisch een open plek aangemaakt.

• Bekijk open plekken via "Open plekken" in het menu
• Patiënten op de wachtlijst worden automatisch gematcht
• Via "Matches bekijken" ziet u welke wachtlijstpatiënten in aanmerking komen
• U kunt handmatig een aanbod doen, waarna de patiënt een invullink ontvangt
• Zodra iemand de plek invult, wordt deze als "Opnieuw ingevuld" gemarkeerd — de omzet is teruggewonnen`,
  },
  {
    icon: Zap,
    title: "Hoe werkt automatisch opvullen?",
    content: `NoShow Control vult geannuleerde plekken automatisch op zonder uw tussenkomst. De patiënt kiest zelf — niets wordt zonder bevestiging ingepland.

Stap voor stap:

1. Annulering → Zodra een afspraak wordt geannuleerd, komt er automatisch een open plek vrij.

2. Matching → Het systeem zoekt in de wachtlijst naar geschikte patiënten op basis van:
   • Behandeltype (indien opgegeven)
   • Voorkeursdag en -tijd
   • Of de patiënt "flexibel" is (accepteert elke plek)
   • Hoe lang iemand al op de wachtlijst staat

3. Aanbod → De top 1 tot 3 kandidaten krijgen tegelijkertijd een SMS met een unieke invullink. Let op: wie het eerst klikt, krijgt de plek.

4. Invullen → Zodra één patiënt op de link klikt en bevestigt, wordt de plek direct voor hem of haar gereserveerd — omzet teruggewonnen. De andere aanbiedingen vervallen automatisch.

5. Fallback → Als niemand binnen 2 uur reageert, blijft de plek open en kunt u handmatig iemand uitnodigen via "Open plekken".

Veiligheidsmaatregelen:
• Geen enkele plek wordt ingepland zonder klik van de patiënt
• Één patiënt krijgt maximaal één aanbod per 2 uur (geen spam)
• Race condition beveiligd: bij gelijktijdige klikken krijgt slechts één persoon de plek
• Alle activiteit wordt gelogd (zichtbaar op het dashboard)

Demo testen? Klik op de knop "Demo scenario" op het dashboard (alleen beheerders).`,
  },
  {
    icon: Users,
    title: "Patiënten beheren",
    content: `Onder "Patiënten" vindt u al uw patiëntgegevens.

• Zoek op naam, e-mail of telefoonnummer
• Filter op risiconiveau (Laag, Gemiddeld, Hoog, Kritiek)
• Filter op actieve/inactieve patiënten of wachtlijststatus
• Klik op een patiënt voor het volledige profiel met contactgegevens en afspraakgeschiedenis
• Voeg nieuwe patiënten toe via "Nieuwe patiënt"`,
  },
  {
    icon: LayoutDashboard,
    title: "Dashboard uitleg",
    content: `Het dashboard geeft u een overzicht van de belangrijkste cijfers.

• Afspraken vandaag: hoeveel afspraken er vandaag gepland staan
• Totaal patiënten: het aantal actieve patiënten in uw praktijk
• Omzet (maand): de geschatte omzet van de huidige maand
• Gemiste omzet: omzet verloren door no-shows en annuleringen deze maand
• Teruggewonnen omzet: omzet die anders verloren was gegaan — automatisch hersteld via de wachtlijst
• Netto resultaat: wat u daadwerkelijk verliest na herstel via de wachtlijst
• Invulpercentage: hoeveel vrijgekomen plekken opnieuw zijn ingevuld
• Afspraken met hoog risico: afspraken met een hoog no-show risico (voorkom verlies vóórdat het gebeurt)`,
  },
];

export default function HelpPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Hulp & uitleg</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Leer hoe u met NoShow Control maximaal omzet terugwint uit annuleringen en no-shows.
        </p>
      </div>

      <div className="space-y-6">
        {sections.map((section) => (
          <div
            key={section.title}
            className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-white">
              <section.icon className="h-5 w-5 text-blue-600" />
              {section.title}
            </h2>
            <div className="mt-3 whitespace-pre-line text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {section.content}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
