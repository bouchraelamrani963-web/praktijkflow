/**
 * NZa tandheelkundige zorg 2026 (TB/REG-26616-01).
 * Verwerkt uit door praktijkhouder aangeleverde officiële prestatielijst.
 * 322 vaste maximumtarieven in eurocenten; vier codes zonder vast
 * maximumtarief zijn bewust niet opgenomen.
 * Orthodontie/F-prestaties horen bij een afzonderlijke beschikking.
 * Niet met terugwerkende kracht toe te passen op afspraak-snapshots.
 * SHA-256 van gevalideerde code|tarief|omschrijving:
 * 2974a027b6f61dedce88789f72aa5a6a0595742008aef575997f77ee1c19be07
 */
export interface Nza2026Tariff {
  code: string; description: string; priceCents: number; category: string;
}
export const NZA_2026: readonly Nza2026Tariff[] = [
  {
    "code": "A10",
    "description": "Geleidings-, infiltratie- en/of intraligamentaire verdoving",
    "priceCents": 1875,
    "category": "A"
  },
  {
    "code": "A15",
    "description": "Oppervlakte verdoving",
    "priceCents": 975,
    "category": "A"
  },
  {
    "code": "A30",
    "description": "Voorbereiding behandeling onder algehele anesthesie",
    "priceCents": 6001,
    "category": "A"
  },
  {
    "code": "B10",
    "description": "Introductie roesje (lachgassedatie)",
    "priceCents": 3751,
    "category": "B"
  },
  {
    "code": "B11",
    "description": "Toediening roesje (lachgassedatie)",
    "priceCents": 3751,
    "category": "B"
  },
  {
    "code": "B12",
    "description": "Overheadkosten roesje (lachgassedatie)",
    "priceCents": 4534,
    "category": "B"
  },
  {
    "code": "C001",
    "description": "Consult ten behoeve van een intake, inclusief bepalen en bespreken zorgdoel",
    "priceCents": 5701,
    "category": "C"
  },
  {
    "code": "C002",
    "description": "Consult voor een periodieke controle",
    "priceCents": 2851,
    "category": "C"
  },
  {
    "code": "C003",
    "description": "Consult, niet zijnde periodieke controle",
    "priceCents": 2851,
    "category": "C"
  },
  {
    "code": "C010",
    "description": "Aanvullende medische anamnese na (schriftelijke) routinevragen",
    "priceCents": 2851,
    "category": "C"
  },
  {
    "code": "C011",
    "description": "Uitgebreid onderzoek ten behoeve van een second opinion",
    "priceCents": 13503,
    "category": "C"
  },
  {
    "code": "C012",
    "description": "Uitgebreid onderzoek ten behoeve van het integrale behandelplan",
    "priceCents": 13503,
    "category": "C"
  },
  {
    "code": "C013",
    "description": "Studiemodellen",
    "priceCents": 3751,
    "category": "C"
  },
  {
    "code": "C014",
    "description": "Pocketregistratie",
    "priceCents": 4501,
    "category": "C"
  },
  {
    "code": "C015",
    "description": "Parodontiumregistratie",
    "priceCents": 9002,
    "category": "C"
  },
  {
    "code": "C016",
    "description": "Maken en bespreken van een restauratieve proefopstelling",
    "priceCents": 22505,
    "category": "C"
  },
  {
    "code": "C020",
    "description": "Toeslag mondzorg aan huis",
    "priceCents": 2251,
    "category": "C"
  },
  {
    "code": "C021",
    "description": "Toeslag avond, nacht en weekend uren (anw-uren)",
    "priceCents": 3151,
    "category": "C"
  },
  {
    "code": "C022",
    "description": "Droogleggen van elementen door middel van een rubberen lapje",
    "priceCents": 1500,
    "category": "C"
  },
  {
    "code": "C023",
    "description": "Toeslag specifieke mondzorg aan huis",
    "priceCents": 9752,
    "category": "C"
  },
  {
    "code": "E02",
    "description": "Uitgebreid wortelkanaalbehandeling consult bij CEB II of III",
    "priceCents": 5251,
    "category": "E"
  },
  {
    "code": "E03",
    "description": "Beoordelen trauma na tandheelkundig ongeval",
    "priceCents": 4126,
    "category": "E"
  },
  {
    "code": "E04",
    "description": "Toeslag voor kosten bij gebruik van roterende nikkel-titanium instrumenten",
    "priceCents": 5925,
    "category": "E"
  },
  {
    "code": "E05",
    "description": "Onderzoek ten behoeve van de uitvoering van een complexe endodontische behandeling van een verwezen patiënt",
    "priceCents": 10052,
    "category": "E"
  },
  {
    "code": "E13",
    "description": "Wortelkanaalbehandeling per element met 1 kanaal",
    "priceCents": 13503,
    "category": "E"
  },
  {
    "code": "E14",
    "description": "Wortelkanaalbehandeling per element met 2 kanalen",
    "priceCents": 19504,
    "category": "E"
  },
  {
    "code": "E16",
    "description": "Wortelkanaalbehandeling per element met 3 kanalen",
    "priceCents": 25506,
    "category": "E"
  },
  {
    "code": "E17",
    "description": "Wortelkanaalbehandeling per element met 4 of meer kanalen",
    "priceCents": 31507,
    "category": "E"
  },
  {
    "code": "E19",
    "description": "Tijdelijk afsluiten van een element na start wortelkanaalbehandeling",
    "priceCents": 2251,
    "category": "E"
  },
  {
    "code": "E31",
    "description": "Microchirurgische wortelkanaalbehandeling snij-/ hoektand",
    "priceCents": 15003,
    "category": "E"
  },
  {
    "code": "E32",
    "description": "Microchirurgische wortelkanaalbehandeling premolaar",
    "priceCents": 21005,
    "category": "E"
  },
  {
    "code": "E33",
    "description": "Microchirurgische wortelkanaalbehandeling molaar",
    "priceCents": 27006,
    "category": "E"
  },
  {
    "code": "E34",
    "description": "Aanbrengen retrograde vulling",
    "priceCents": 3001,
    "category": "E"
  },
  {
    "code": "E36",
    "description": "Het trekken en terugplaatsen van een element",
    "priceCents": 10502,
    "category": "E"
  },
  {
    "code": "E37",
    "description": "Kijkoperatie",
    "priceCents": 9002,
    "category": "E"
  },
  {
    "code": "E40",
    "description": "Directe pulpa-overkapping",
    "priceCents": 3751,
    "category": "E"
  },
  {
    "code": "E42",
    "description": "Terugzetten van een verplaatst element na tandheelkundig ongeval",
    "priceCents": 1500,
    "category": "E"
  },
  {
    "code": "E43",
    "description": "Vastzetten element d.m.v. een spalk na tandheelkundig ongeval",
    "priceCents": 3001,
    "category": "E"
  },
  {
    "code": "E44",
    "description": "Verwijderen spalk ten behoeve van de behandeling van een trauma-element",
    "priceCents": 750,
    "category": "E"
  },
  {
    "code": "E52",
    "description": "Toeslag in geval van een moeilijke wortelkanaalopening",
    "priceCents": 3751,
    "category": "E"
  },
  {
    "code": "E53",
    "description": "Toeslag verwijderen van wortelstift",
    "priceCents": 5251,
    "category": "E"
  },
  {
    "code": "E54",
    "description": "Toeslag verwijderen van wortelkanaalvulmateriaal",
    "priceCents": 3751,
    "category": "E"
  },
  {
    "code": "E55",
    "description": "Toeslag behandeling dichtgeslibd of verkalkt wortelkanaal",
    "priceCents": 3751,
    "category": "E"
  },
  {
    "code": "E56",
    "description": "Toeslag voortgezette behandeling bij weefselschade van de tandwortel",
    "priceCents": 5251,
    "category": "E"
  },
  {
    "code": "E57",
    "description": "Toeslag behandeling van element met uitzonderlijke anatomie",
    "priceCents": 3751,
    "category": "E"
  },
  {
    "code": "E60",
    "description": "Geheel of gedeeltelijk weghalen van pulpaweefsel",
    "priceCents": 6001,
    "category": "E"
  },
  {
    "code": "E61",
    "description": "Behandelen van open wortelpunt met een desinfectiemiddel, eerste zitting",
    "priceCents": 10502,
    "category": "E"
  },
  {
    "code": "E62",
    "description": "Behandelen van open wortelpunt met een desinfectiemiddel, elke volgende zitting",
    "priceCents": 6752,
    "category": "E"
  },
  {
    "code": "E63",
    "description": "Toeslag voor afsluiting met calciumsilicaatcement of een vergelijkbaar biokeramisch materiaal",
    "priceCents": 5626,
    "category": "E"
  },
  {
    "code": "E66",
    "description": "Wortelkanaalbehandeling van melkelement",
    "priceCents": 6001,
    "category": "E"
  },
  {
    "code": "E77",
    "description": "Initiële wortelkanaalbehandeling, eerste kanaal",
    "priceCents": 7502,
    "category": "E"
  },
  {
    "code": "E78",
    "description": "Initiële wortelkanaalbehandeling, elk volgend kanaal",
    "priceCents": 3751,
    "category": "E"
  },
  {
    "code": "E85",
    "description": "Elektronische lengtebepaling",
    "priceCents": 1875,
    "category": "E"
  },
  {
    "code": "E86",
    "description": "Met microscopische vergroting inspecteren en beoordelen element ten behoeve van de wortelkanaalbehandeling",
    "priceCents": 10127,
    "category": "E"
  },
  {
    "code": "E87",
    "description": "Gebruiksklaar maken van praktijkruimte voor microchirurgische wortelkanaalbehandeling",
    "priceCents": 7502,
    "category": "E"
  },
  {
    "code": "E88",
    "description": "Opvullen van de pulpakamer en afsluiten van de kanaalingangen",
    "priceCents": 7502,
    "category": "E"
  },
  {
    "code": "E90",
    "description": "Inwendig bleken, eerste zitting",
    "priceCents": 6001,
    "category": "E"
  },
  {
    "code": "E95",
    "description": "Inwendig bleken, elke volgende zitting",
    "priceCents": 2251,
    "category": "E"
  },
  {
    "code": "E97",
    "description": "Uitwendig bleken per kaak",
    "priceCents": 9377,
    "category": "E"
  },
  {
    "code": "G09",
    "description": "Occlusie analyse na meting m.b.v. digitale apparatuur",
    "priceCents": 4051,
    "category": "G"
  },
  {
    "code": "G10",
    "description": "Niet-standaard beetregistratie",
    "priceCents": 11253,
    "category": "G"
  },
  {
    "code": "G11",
    "description": "Scharnierasbepaling",
    "priceCents": 11253,
    "category": "G"
  },
  {
    "code": "G12",
    "description": "Centrale relatiebepaling",
    "priceCents": 10502,
    "category": "G"
  },
  {
    "code": "G13",
    "description": "Protrale/laterale bepalingen",
    "priceCents": 7502,
    "category": "G"
  },
  {
    "code": "G14",
    "description": "Instellen volledig instelbare articulator, pantograaf en registratie",
    "priceCents": 67515,
    "category": "G"
  },
  {
    "code": "G15",
    "description": "Toeslag voor het behouden van beethoogte",
    "priceCents": 3751,
    "category": "G"
  },
  {
    "code": "G16",
    "description": "Therapeutische positiebepaling",
    "priceCents": 3751,
    "category": "G"
  },
  {
    "code": "G20",
    "description": "Beetregistratie intra-oraal",
    "priceCents": 7502,
    "category": "G"
  },
  {
    "code": "G21",
    "description": "Functieonderzoek kauwstelsel",
    "priceCents": 13503,
    "category": "G"
  },
  {
    "code": "G22",
    "description": "Verlengd onderzoek OPD",
    "priceCents": 27006,
    "category": "G"
  },
  {
    "code": "G23",
    "description": "Spieractiviteitsmeting en registratie",
    "priceCents": 12003,
    "category": "G"
  },
  {
    "code": "G33",
    "description": "Aanbrengen front/hoektandgeleiding",
    "priceCents": 7502,
    "category": "G"
  },
  {
    "code": "G41",
    "description": "Consult OPD-therapie A (niet-complex)",
    "priceCents": 7877,
    "category": "G"
  },
  {
    "code": "G43",
    "description": "Consult OPD-therapie B (complex)",
    "priceCents": 15153,
    "category": "G"
  },
  {
    "code": "G44",
    "description": "Therapeutische injectie",
    "priceCents": 8252,
    "category": "G"
  },
  {
    "code": "G46",
    "description": "Consult voor instructie apparatuur (eenmalig)",
    "priceCents": 6001,
    "category": "G"
  },
  {
    "code": "G47",
    "description": "Evaluatie/herbeoordeling na OPD therapie A",
    "priceCents": 9002,
    "category": "G"
  },
  {
    "code": "G48",
    "description": "Evaluatie/herbeoordeling na OPD therapie B",
    "priceCents": 15003,
    "category": "G"
  },
  {
    "code": "G62",
    "description": "Stabilisatieopbeetplaat",
    "priceCents": 20255,
    "category": "G"
  },
  {
    "code": "G65",
    "description": "Indirect planmatig inslijpen",
    "priceCents": 41259,
    "category": "G"
  },
  {
    "code": "G68",
    "description": "Reparatie stabilisatieopbeetplaat of beetbeschermingsplaat",
    "priceCents": 6001,
    "category": "G"
  },
  {
    "code": "G69",
    "description": "Beetbeschermingsplaat",
    "priceCents": 8252,
    "category": "G"
  },
  {
    "code": "G71",
    "description": "Apparaat voor snurk- en slaapstoornissen (MRA)",
    "priceCents": 37509,
    "category": "G"
  },
  {
    "code": "G72",
    "description": "Controlebezoek MRA",
    "priceCents": 3751,
    "category": "G"
  },
  {
    "code": "G73",
    "description": "Reparatie MRA met afdruk",
    "priceCents": 6001,
    "category": "G"
  },
  {
    "code": "G74",
    "description": "Plaatsen van myofunctionele apparatuur",
    "priceCents": 10127,
    "category": "G"
  },
  {
    "code": "G75",
    "description": "Planmatig beslijpen van alle voortanden, per boven- of onderkaak",
    "priceCents": 7502,
    "category": "G"
  },
  {
    "code": "G76",
    "description": "Consult myofunctionele therapie",
    "priceCents": 2851,
    "category": "G"
  },
  {
    "code": "H11",
    "description": "Trekken tand of kies",
    "priceCents": 5626,
    "category": "H"
  },
  {
    "code": "H16",
    "description": "Trekken volgende tand of kies, in dezelfde zitting en hetzelfde kwadrant",
    "priceCents": 4201,
    "category": "H"
  },
  {
    "code": "H21",
    "description": "Kosten hechtmateriaal",
    "priceCents": 750,
    "category": "H"
  },
  {
    "code": "H26",
    "description": "Hechten weke delen",
    "priceCents": 8252,
    "category": "H"
  },
  {
    "code": "H33",
    "description": "Hemisectie van een molaar",
    "priceCents": 9002,
    "category": "H"
  },
  {
    "code": "H34",
    "description": "Vrijleggen ingesloten tand of kies ter bevordering van de doorbraak",
    "priceCents": 9002,
    "category": "H"
  },
  {
    "code": "H35",
    "description": "Moeizaam trekken tand of kies met behulp van chirurgie",
    "priceCents": 9002,
    "category": "H"
  },
  {
    "code": "H36",
    "description": "Onderzoek ten behoeve van de indicatiestelling voor een autotransplantaat behandeling",
    "priceCents": 9752,
    "category": "H"
  },
  {
    "code": "H37",
    "description": "Onderzoek ten behoeve van de uitvoering voor een autotransplantaat behandeling.",
    "priceCents": 15003,
    "category": "H"
  },
  {
    "code": "H38",
    "description": "Uitvoeren eerste autotransplantaat",
    "priceCents": 34358,
    "category": "H"
  },
  {
    "code": "H39",
    "description": "Uitvoeren volgende autotransplantaat, in dezelfde zitting",
    "priceCents": 14178,
    "category": "H"
  },
  {
    "code": "H40",
    "description": "Corrigeren van de vorm van de kaak, per kaak",
    "priceCents": 6752,
    "category": "H"
  },
  {
    "code": "H41",
    "description": "Verwijderen van het lipbandje of tongriempje",
    "priceCents": 4501,
    "category": "H"
  },
  {
    "code": "H42",
    "description": "Wortelpuntoperatie, per tandwortel, zonder afsluiting",
    "priceCents": 9002,
    "category": "H"
  },
  {
    "code": "H43",
    "description": "Wortelpuntoperatie, per tandwortel, met ante of retrogradeafsluiting",
    "priceCents": 12003,
    "category": "H"
  },
  {
    "code": "H44",
    "description": "Primaire antrumsluiting",
    "priceCents": 8252,
    "category": "H"
  },
  {
    "code": "H50",
    "description": "Terugzetten tand of kies, eerste element",
    "priceCents": 7502,
    "category": "H"
  },
  {
    "code": "H55",
    "description": "Terugzetten tand of kies, volgend element in dezelfde zitting",
    "priceCents": 2251,
    "category": "H"
  },
  {
    "code": "H59",
    "description": "Behandeling kaakbreuk, per kaak",
    "priceCents": 10502,
    "category": "H"
  },
  {
    "code": "H60",
    "description": "Marsupialisatie",
    "priceCents": 10502,
    "category": "H"
  },
  {
    "code": "H65",
    "description": "Primaire sluiting",
    "priceCents": 20255,
    "category": "H"
  },
  {
    "code": "H70",
    "description": "Lappige fibromen, Schlotterkamm, tubercorrectie e.d., enkelzijdig per kaak",
    "priceCents": 10502,
    "category": "H"
  },
  {
    "code": "H75",
    "description": "Lappige fibromen, Schlotterkamm, tubercorrectie e.d., dubbelzijdig per kaak",
    "priceCents": 20255,
    "category": "H"
  },
  {
    "code": "H80",
    "description": "Alveolotomie torus, vergelijkbare praeprothetische botcorrecties, enkelzijdig per kaak",
    "priceCents": 14253,
    "category": "H"
  },
  {
    "code": "H85",
    "description": "Alveolotomie torus, vergelijkbare praeprothetische botcorrecties, dubbelzijdig per kaak",
    "priceCents": 24005,
    "category": "H"
  },
  {
    "code": "H90",
    "description": "Voorbereiding praktijkruimte ten behoeve van chirurgische verrichtingen vallend onder onderdeel B",
    "priceCents": 7502,
    "category": "H"
  },
  {
    "code": "J001",
    "description": "Overheadkosten implantaten, autotransplantaten en peri-implantitis chirurgie",
    "priceCents": 21786,
    "category": "J"
  },
  {
    "code": "J002",
    "description": "Overheadkosten pre-implantologische chirurgie",
    "priceCents": 12330,
    "category": "J"
  },
  {
    "code": "J010",
    "description": "Onderzoek ten behoeve van de indicatiestelling voor de implantologische behandeling",
    "priceCents": 9752,
    "category": "J"
  },
  {
    "code": "J011",
    "description": "Onderzoek ten behoeve van de uitvoering van de implantologische behandeling",
    "priceCents": 15003,
    "category": "J"
  },
  {
    "code": "J012",
    "description": "Proefopstelling implantologie, 1-4 elementen",
    "priceCents": 11253,
    "category": "J"
  },
  {
    "code": "J013",
    "description": "Proefopstelling implantologie 5 of meer elementen",
    "priceCents": 22505,
    "category": "J"
  },
  {
    "code": "J014",
    "description": "Implantaatpositionering op grond van CT-scan",
    "priceCents": 6752,
    "category": "J"
  },
  {
    "code": "J020",
    "description": "Ophoging bodem bijholte in een aparte zitting voorafgaand aan het implanteren, eerste kaakhelft,",
    "priceCents": 36008,
    "category": "J"
  },
  {
    "code": "J021",
    "description": "Ophoging bodem bijholte in een aparte zitting voorafgaand aan het implanteren, tweede kaakhelft binnen een termijn van drie maanden",
    "priceCents": 22505,
    "category": "J"
  },
  {
    "code": "J022",
    "description": "Kaakverbreding en/of verhoging in een aparte zitting voorafgaand aan het implanteren, per kaak",
    "priceCents": 21755,
    "category": "J"
  },
  {
    "code": "J030",
    "description": "Kaakverbreding en/of verhoging, per sextant, tijdens het implanteren",
    "priceCents": 12753,
    "category": "J"
  },
  {
    "code": "J031",
    "description": "Ophoging bodem bijholte, tijdens het implanteren",
    "priceCents": 19504,
    "category": "J"
  },
  {
    "code": "J032",
    "description": "Ophoging bodem bijholte orthograad, tijdens het implanteren",
    "priceCents": 9002,
    "category": "J"
  },
  {
    "code": "J040",
    "description": "Plaatsen eerste implantaat, per kaak",
    "priceCents": 34358,
    "category": "J"
  },
  {
    "code": "J041",
    "description": "Plaatsen volgend implantaat in dezelfde kaak",
    "priceCents": 14178,
    "category": "J"
  },
  {
    "code": "J042",
    "description": "Plaatsen eerste tandvleesvormer",
    "priceCents": 11253,
    "category": "J"
  },
  {
    "code": "J043",
    "description": "Plaatsen volgende tandvleesvormer",
    "priceCents": 5326,
    "category": "J"
  },
  {
    "code": "J044",
    "description": "Verwijderen implantaat",
    "priceCents": 4951,
    "category": "J"
  },
  {
    "code": "J045",
    "description": "Moeizaam verwijderen implantaat",
    "priceCents": 24756,
    "category": "J"
  },
  {
    "code": "J046",
    "description": "Vervangen eerste implantaat",
    "priceCents": 34283,
    "category": "J"
  },
  {
    "code": "J047",
    "description": "Vervangen volgend implantaat",
    "priceCents": 14178,
    "category": "J"
  },
  {
    "code": "J048",
    "description": "Chirurgische behandeling peri-implantitis, per sextant",
    "priceCents": 26181,
    "category": "J"
  },
  {
    "code": "J049",
    "description": "Plaatsen van twee implantaten in de tandeloze onderkaak voor een klikgebit",
    "priceCents": 76442,
    "category": "J"
  },
  {
    "code": "J051",
    "description": "Aanbrengen botvervangers in extractie wond",
    "priceCents": 3001,
    "category": "J"
  },
  {
    "code": "J052",
    "description": "Prepareren donorplaats",
    "priceCents": 20255,
    "category": "J"
  },
  {
    "code": "J053",
    "description": "Toeslag esthetische zone, per kaakhelft",
    "priceCents": 10127,
    "category": "J"
  },
  {
    "code": "J054",
    "description": "Bindweefseltransplantaat per donorplaats",
    "priceCents": 15754,
    "category": "J"
  },
  {
    "code": "J055",
    "description": "Verkrijgen en verwerken van bloed tot een regeneratief biomateriaal middels een venapunctie",
    "priceCents": 16879,
    "category": "J"
  },
  {
    "code": "J056",
    "description": "Verwijderen gefractureerd abutment/occlusale schroef",
    "priceCents": 17254,
    "category": "J"
  },
  {
    "code": "J057",
    "description": "Kosten implantaat",
    "priceCents": 42464,
    "category": "J"
  },
  {
    "code": "J058",
    "description": "Bepaling stabiliteit implantaat middels ISQ-meting",
    "priceCents": 1500,
    "category": "J"
  },
  {
    "code": "J059",
    "description": "Grondig submucosaal reinigen implantaat",
    "priceCents": 3526,
    "category": "J"
  },
  {
    "code": "J060",
    "description": "Tijdelijke kroon in dezelfde zitting op immediaat geplaatst implantaat",
    "priceCents": 39009,
    "category": "J"
  },
  {
    "code": "J061",
    "description": "Toeslag zygoma-implantaat t.b.v. planning, proefopstelling en uitvoering",
    "priceCents": 11253,
    "category": "J"
  },
  {
    "code": "J062",
    "description": "Kosten zygoma-implantaat",
    "priceCents": 63781,
    "category": "J"
  },
  {
    "code": "J070",
    "description": "Plaatsen eerste drukknop",
    "priceCents": 18004,
    "category": "J"
  },
  {
    "code": "J071",
    "description": "Plaatsen elke volgende drukknop",
    "priceCents": 5251,
    "category": "J"
  },
  {
    "code": "J072",
    "description": "Staaf tussen twee implantaten in dezelfde kaak",
    "priceCents": 30757,
    "category": "J"
  },
  {
    "code": "J073",
    "description": "Elke volgende staaf tussen implantaten in dezelfde kaak",
    "priceCents": 9752,
    "category": "J"
  },
  {
    "code": "J080",
    "description": "Gelijktijdig plaatsen volledig kunstgebit en klikgebit",
    "priceCents": 77268,
    "category": "J"
  },
  {
    "code": "J081",
    "description": "Klikgebit in de onderkaak",
    "priceCents": 50261,
    "category": "J"
  },
  {
    "code": "J082",
    "description": "Klikgebit in de bovenkaak",
    "priceCents": 50261,
    "category": "J"
  },
  {
    "code": "J083",
    "description": "Omvorming tot klikgebit",
    "priceCents": 15003,
    "category": "J"
  },
  {
    "code": "J084",
    "description": "Omvorming tot klikgebit bij staven tussen twee implantaten",
    "priceCents": 19504,
    "category": "J"
  },
  {
    "code": "J085",
    "description": "Omvorming tot klikgebit bij staven tussen drie of vier implantaten",
    "priceCents": 22505,
    "category": "J"
  },
  {
    "code": "J086",
    "description": "Omvorming tot klikgebit bij staven tussen meer dan vier implantaten",
    "priceCents": 26256,
    "category": "J"
  },
  {
    "code": "J087",
    "description": "Toeslag vervangingsklikgebit op bestaande staven tussen twee implantaten",
    "priceCents": 12753,
    "category": "J"
  },
  {
    "code": "J088",
    "description": "Toeslag vervangingsklikgebit op bestaande staven tussen drie of vier implantaten",
    "priceCents": 16504,
    "category": "J"
  },
  {
    "code": "J089",
    "description": "Toeslag vervangingsklikgebit op bestaande staven tussen meer dan vier implantaten",
    "priceCents": 20255,
    "category": "J"
  },
  {
    "code": "J090",
    "description": "Specifiek consult nazorg implantologie",
    "priceCents": 8252,
    "category": "J"
  },
  {
    "code": "J091",
    "description": "Uitgebreid consult nazorg implantologie",
    "priceCents": 13503,
    "category": "J"
  },
  {
    "code": "J100",
    "description": "Opvullen klikgebit zonder staafdemontage",
    "priceCents": 21005,
    "category": "J"
  },
  {
    "code": "J101",
    "description": "Opvullen klikgebit met staafdemontage op twee implantaten",
    "priceCents": 26256,
    "category": "J"
  },
  {
    "code": "J102",
    "description": "Opvullen klikgebit met staafdemontage op drie of vier implantaten",
    "priceCents": 30007,
    "category": "J"
  },
  {
    "code": "J103",
    "description": "Opvullen klikgebit met staafdemontage op meer dan vier implantaten",
    "priceCents": 33758,
    "category": "J"
  },
  {
    "code": "J104",
    "description": "Eenvoudige reparatie klikgebit zonder staafdemontage en zonder afdruk",
    "priceCents": 2251,
    "category": "J"
  },
  {
    "code": "J105",
    "description": "Reparatie klikgebit zonder staafdemontage",
    "priceCents": 8252,
    "category": "J"
  },
  {
    "code": "J106",
    "description": "Reparatie klikgebit met staafdemontage op twee implantaten",
    "priceCents": 15754,
    "category": "J"
  },
  {
    "code": "J107",
    "description": "Reparatie klikgebit met staafdemontage op drie of vier implantaten",
    "priceCents": 19504,
    "category": "J"
  },
  {
    "code": "J108",
    "description": "Reparatie klikgebit met staafdemontage op meer dan vier implantaten",
    "priceCents": 23255,
    "category": "J"
  },
  {
    "code": "J109",
    "description": "Verwijderen en vervangen drukknop",
    "priceCents": 3751,
    "category": "J"
  },
  {
    "code": "J110",
    "description": "Opvullen gedeeltelijk klikgebit",
    "priceCents": 21005,
    "category": "J"
  },
  {
    "code": "J111",
    "description": "Eenvoudige reparatie gedeeltelijk klikgebit zonder afdruk",
    "priceCents": 2251,
    "category": "J"
  },
  {
    "code": "J112",
    "description": "Reparatie gedeeltelijk klikgebit",
    "priceCents": 8252,
    "category": "J"
  },
  {
    "code": "J113",
    "description": "Aanpassen huidige prothese tot tijdelijke voorziening ter verblokking zygoma-implanta(a)t(en) met tijdelijke abutment of gefreesde steg en opvullen",
    "priceCents": 26256,
    "category": "J"
  },
  {
    "code": "J180",
    "description": "Gedeeltelijk klikgebit van kunststof",
    "priceCents": 22505,
    "category": "J"
  },
  {
    "code": "J181",
    "description": "Gedeeltelijk klikgebit met metalen basis (frame)",
    "priceCents": 42010,
    "category": "J"
  },
  {
    "code": "J183",
    "description": "Omvorming van gedeeltelijk kunstgebit of frame tot gedeeltelijk klikgebit",
    "priceCents": 15003,
    "category": "J"
  },
  {
    "code": "J184",
    "description": "Uitbreiding gedeeltelijk klikgebit tot (volledig) klikgebit, met afdruk, per kaak",
    "priceCents": 6001,
    "category": "J"
  },
  {
    "code": "M01",
    "description": "Preventieve voorlichting en/of instructie, per vijf minuten",
    "priceCents": 1682,
    "category": "M"
  },
  {
    "code": "M02",
    "description": "Consult voor evaluatie van preventie, per vijf minuten",
    "priceCents": 1682,
    "category": "M"
  },
  {
    "code": "M03",
    "description": "Gebitsreiniging, per vijf minuten",
    "priceCents": 1682,
    "category": "M"
  },
  {
    "code": "M05",
    "description": "Niet-restauratieve behandeling van cariës in het melkgebit",
    "priceCents": 3376,
    "category": "M"
  },
  {
    "code": "M30",
    "description": "Behandeling van gevoelige tandhalzen en (preventief) toedienen medicament",
    "priceCents": 750,
    "category": "M"
  },
  {
    "code": "M32",
    "description": "Eenvoudig bacteriologisch- of enzymatisch onderzoek",
    "priceCents": 2251,
    "category": "M"
  },
  {
    "code": "M40",
    "description": "Fluoridebehandeling",
    "priceCents": 1875,
    "category": "M"
  },
  {
    "code": "M61",
    "description": "Mondbeschermer of fluoridekap",
    "priceCents": 3376,
    "category": "M"
  },
  {
    "code": "M80",
    "description": "Behandeling van witte vlekken, eerste element",
    "priceCents": 6526,
    "category": "M"
  },
  {
    "code": "M81",
    "description": "Behandeling van witte vlekken, volgend element",
    "priceCents": 3601,
    "category": "M"
  },
  {
    "code": "P001",
    "description": "Gedeeltelijk kunstgebit van kunsthars, 1-4 elementen, per kaak",
    "priceCents": 11253,
    "category": "P"
  },
  {
    "code": "P002",
    "description": "Gedeeltelijk kunstgebit van kunsthars, 5-13 elementen, per kaak",
    "priceCents": 22505,
    "category": "P"
  },
  {
    "code": "P003",
    "description": "Frame kunstgebit, 1-4 elementen, per kaak",
    "priceCents": 30757,
    "category": "P"
  },
  {
    "code": "P004",
    "description": "Frame kunstgebit, 5-13 elementen, per kaak",
    "priceCents": 42010,
    "category": "P"
  },
  {
    "code": "P020",
    "description": "Volledig kunstgebit bovenkaak",
    "priceCents": 22505,
    "category": "P"
  },
  {
    "code": "P021",
    "description": "Volledig kunstgebit onderkaak",
    "priceCents": 30007,
    "category": "P"
  },
  {
    "code": "P022",
    "description": "Volledig kunstgebit boven- en onderkaak",
    "priceCents": 48761,
    "category": "P"
  },
  {
    "code": "P023",
    "description": "Tijdelijk volledig kunstgebit, per kaak",
    "priceCents": 15003,
    "category": "P"
  },
  {
    "code": "P040",
    "description": "Toeslag voor individuele afdruk bij volledig kunstgebit",
    "priceCents": 8102,
    "category": "P"
  },
  {
    "code": "P041",
    "description": "Toeslag voor individuele afdruk bij gedeeltelijk kunstgebit van kunsthars",
    "priceCents": 3751,
    "category": "P"
  },
  {
    "code": "P042",
    "description": "Toeslag voor beetregistratie met specifieke apparatuur",
    "priceCents": 7502,
    "category": "P"
  },
  {
    "code": "P043",
    "description": "Toeslag voor frontopstelling en/of beetbepaling in aparte zitting",
    "priceCents": 4501,
    "category": "P"
  },
  {
    "code": "P044",
    "description": "Toeslag zeer ernstig geslonken kaak, per kaak",
    "priceCents": 10127,
    "category": "P"
  },
  {
    "code": "P045",
    "description": "Toeslag immediaat kunstgebit",
    "priceCents": 1875,
    "category": "P"
  },
  {
    "code": "P046",
    "description": "Toeslag voor elk element bij een overkappingskunstgebit",
    "priceCents": 6001,
    "category": "P"
  },
  {
    "code": "P047",
    "description": "Toeslag voor gegoten anker bij gedeeltelijk kunstgebit van kunsthars",
    "priceCents": 2251,
    "category": "P"
  },
  {
    "code": "P048",
    "description": "Toeslag voor maken precisiekoppeling, per koppeling of staafhuls",
    "priceCents": 11253,
    "category": "P"
  },
  {
    "code": "P049",
    "description": "Toeslag voor aanbrengen telescoopkroon met precisiekoppeling",
    "priceCents": 7502,
    "category": "P"
  },
  {
    "code": "P060",
    "description": "Tissue conditioning volledig kunstgebit, per kaak",
    "priceCents": 5251,
    "category": "P"
  },
  {
    "code": "P061",
    "description": "Tissue conditioning gedeeltelijk kunstgebit van kunsthars of framekunstgebit, per kaak",
    "priceCents": 5251,
    "category": "P"
  },
  {
    "code": "P062",
    "description": "Opvullen volledig kunstgebit, indirect, per kaak",
    "priceCents": 10577,
    "category": "P"
  },
  {
    "code": "P063",
    "description": "Opvullen volledig kunstgebit, direct, per kaak",
    "priceCents": 10652,
    "category": "P"
  },
  {
    "code": "P064",
    "description": "Opvullen gedeeltelijk kunstgebit van kunsthars of framekunstgebit, indirect, per kaak",
    "priceCents": 9227,
    "category": "P"
  },
  {
    "code": "P065",
    "description": "Opvullen gedeeltelijk kunstgebit van kunsthars of framekunstgebit, direct, per kaak",
    "priceCents": 9602,
    "category": "P"
  },
  {
    "code": "P066",
    "description": "Opvullen overkappingskunstgebit op natuurlijke pijlers zonder staafdemontage, per kaak",
    "priceCents": 21005,
    "category": "P"
  },
  {
    "code": "P067",
    "description": "Planmatig inslijpen bestaand kunstgebit",
    "priceCents": 3751,
    "category": "P"
  },
  {
    "code": "P068",
    "description": "Reparatie volledig kunstgebit, zonder afdruk, per kaak",
    "priceCents": 2251,
    "category": "P"
  },
  {
    "code": "P069",
    "description": "Reparatie volledig kunstgebit, met afdruk, per kaak",
    "priceCents": 6001,
    "category": "P"
  },
  {
    "code": "P070",
    "description": "Reparatie gedeeltelijk kunstgebit van kunsthars of framekunstgebit, zonder afdruk, per kaak",
    "priceCents": 2251,
    "category": "P"
  },
  {
    "code": "P071",
    "description": "Reparatie en/of uitbreiding gedeeltelijk kunstgebit van kunsthars of framekunstgebit, met afdruk, per kaak",
    "priceCents": 6001,
    "category": "P"
  },
  {
    "code": "P072",
    "description": "Uitbreiding gedeeltelijk kunstgebit van kunsthars of frame kunstgebit met element(en) tot volledig kunstgebit, met afdruk, per kaak",
    "priceCents": 6001,
    "category": "P"
  },
  {
    "code": "R08",
    "description": "Eénvlaks composiet inlay",
    "priceCents": 9002,
    "category": "R"
  },
  {
    "code": "R09",
    "description": "Tweevlaks composiet inlay",
    "priceCents": 17254,
    "category": "R"
  },
  {
    "code": "R10",
    "description": "Drievlaks composiet inlay",
    "priceCents": 22505,
    "category": "R"
  },
  {
    "code": "R11",
    "description": "Eénvlaksinlay",
    "priceCents": 13503,
    "category": "R"
  },
  {
    "code": "R12",
    "description": "Tweevlaksinlay",
    "priceCents": 21005,
    "category": "R"
  },
  {
    "code": "R13",
    "description": "Drievlaksinlay",
    "priceCents": 30007,
    "category": "R"
  },
  {
    "code": "R14",
    "description": "Toeslag voor extra retentie bij het plaatsen van indirecte restauraties",
    "priceCents": 3751,
    "category": "R"
  },
  {
    "code": "R24",
    "description": "Kroon op natuurlijk element",
    "priceCents": 33007,
    "category": "R"
  },
  {
    "code": "R29",
    "description": "Confectiekroon",
    "priceCents": 6752,
    "category": "R"
  },
  {
    "code": "R31",
    "description": "Opbouw plastisch materiaal",
    "priceCents": 7502,
    "category": "R"
  },
  {
    "code": "R32",
    "description": "Gegoten opbouw, indirecte methode",
    "priceCents": 7502,
    "category": "R"
  },
  {
    "code": "R33",
    "description": "Gegoten opbouw, directe methode",
    "priceCents": 15003,
    "category": "R"
  },
  {
    "code": "R34",
    "description": "Kroon op implantaat",
    "priceCents": 30007,
    "category": "R"
  },
  {
    "code": "R40",
    "description": "Eerste brugtussendeel",
    "priceCents": 22505,
    "category": "R"
  },
  {
    "code": "R45",
    "description": "Toeslag bij een conventionele brug voor elk volgende brugtussendeel in hetzelfde tussendeel",
    "priceCents": 11253,
    "category": "R"
  },
  {
    "code": "R49",
    "description": "Toeslag voor brug op vijf- of meer pijlerelementen",
    "priceCents": 18754,
    "category": "R"
  },
  {
    "code": "R50",
    "description": "Metalen fixatiekap met afdruk",
    "priceCents": 3751,
    "category": "R"
  },
  {
    "code": "R55",
    "description": "Gipsslot met extra afdruk",
    "priceCents": 3751,
    "category": "R"
  },
  {
    "code": "R60",
    "description": "Plakbrug zonder preparatie",
    "priceCents": 15003,
    "category": "R"
  },
  {
    "code": "R61",
    "description": "Plakbrug met preparatie",
    "priceCents": 22505,
    "category": "R"
  },
  {
    "code": "R65",
    "description": "Toeslag bij een plakbrug voor elk volgende brugtussendeel in hetzelfde tussendeel",
    "priceCents": 5251,
    "category": "R"
  },
  {
    "code": "R66",
    "description": "Toeslag bij een plakbrug voor elke volgende bevestiging boven het aantal van twee",
    "priceCents": 3001,
    "category": "R"
  },
  {
    "code": "R67",
    "description": "Plaatsen opbouw ten behoeve van implantaatkroon",
    "priceCents": 3226,
    "category": "R"
  },
  {
    "code": "R70",
    "description": "Toeslag voor kroon onder bestaand frame-anker",
    "priceCents": 8252,
    "category": "R"
  },
  {
    "code": "R71",
    "description": "Vernieuwen porseleinen schildje, reparatie metalen/porseleinen kroon in de mond",
    "priceCents": 8252,
    "category": "R"
  },
  {
    "code": "R74",
    "description": "Opnieuw vastzetten niet plastische restauraties",
    "priceCents": 3001,
    "category": "R"
  },
  {
    "code": "R75",
    "description": "Opnieuw vastzetten plakbrug",
    "priceCents": 7502,
    "category": "R"
  },
  {
    "code": "R76",
    "description": "Toeslag voor gegoten opbouw onder bestaande kroon",
    "priceCents": 3751,
    "category": "R"
  },
  {
    "code": "R77",
    "description": "Moeizaam verwijderen van oud kroon- en brugwerk per (pijler)element",
    "priceCents": 3751,
    "category": "R"
  },
  {
    "code": "R79",
    "description": "Indirecte facing",
    "priceCents": 33007,
    "category": "R"
  },
  {
    "code": "R80",
    "description": "Tijdelijk kroon- en brugwerk, eerste tand of kies",
    "priceCents": 3751,
    "category": "R"
  },
  {
    "code": "R85",
    "description": "Tijdelijk kroon- en brugwerk, volgende tand of kies",
    "priceCents": 1500,
    "category": "R"
  },
  {
    "code": "R91",
    "description": "Wortelkap met stift",
    "priceCents": 18754,
    "category": "R"
  },
  {
    "code": "R92",
    "description": "Passen restauratieve proefopstelling in de mond",
    "priceCents": 10127,
    "category": "R"
  },
  {
    "code": "T012",
    "description": "Onderzoek van het tandvlees met parodontiumstatus",
    "priceCents": 21755,
    "category": "T"
  },
  {
    "code": "T021",
    "description": "Grondig reinigen wortel, complex",
    "priceCents": 4051,
    "category": "T"
  },
  {
    "code": "T022",
    "description": "Grondig reinigen wortel, standaard",
    "priceCents": 3001,
    "category": "T"
  },
  {
    "code": "T032",
    "description": "Evaluatie initiële behandeling/chirurgie of herbeoordeling met parodontiumstatus",
    "priceCents": 13503,
    "category": "T"
  },
  {
    "code": "T033",
    "description": "Bespreken vervolgtraject na evaluatie of herbeoordeling",
    "priceCents": 8252,
    "category": "T"
  },
  {
    "code": "T042",
    "description": "Consult parodontale nazorg",
    "priceCents": 11403,
    "category": "T"
  },
  {
    "code": "T043",
    "description": "Uitgebreid consult parodontale nazorg",
    "priceCents": 15153,
    "category": "T"
  },
  {
    "code": "T044",
    "description": "Complex consult parodontale nazorg",
    "priceCents": 20180,
    "category": "T"
  },
  {
    "code": "T070",
    "description": "Flapoperatie tussen twee elementen",
    "priceCents": 24381,
    "category": "T"
  },
  {
    "code": "T071",
    "description": "Flapoperatie per sextant (één zesde deel)",
    "priceCents": 37509,
    "category": "T"
  },
  {
    "code": "T072",
    "description": "Flapoperatie uitgebreid per sextant ( één zesde deel)",
    "priceCents": 45010,
    "category": "T"
  },
  {
    "code": "T073",
    "description": "Directe postoperatieve zorg, eerste zitting",
    "priceCents": 7502,
    "category": "T"
  },
  {
    "code": "T074",
    "description": "Directe postoperatieve zorg, volgende zitting",
    "priceCents": 20180,
    "category": "T"
  },
  {
    "code": "T076",
    "description": "Tuber- of retromolaarplastiek",
    "priceCents": 9377,
    "category": "T"
  },
  {
    "code": "T101",
    "description": "Tuber- of retromolaarplastiek",
    "priceCents": 13128,
    "category": "T"
  },
  {
    "code": "T102",
    "description": "Tandvleescorrectie, één element",
    "priceCents": 7127,
    "category": "T"
  },
  {
    "code": "T103",
    "description": "Tandvleescorrectie, bij twee t/m zes elementen",
    "priceCents": 18754,
    "category": "T"
  },
  {
    "code": "T111",
    "description": "Aanbrengen parodontaal regeneratiemateriaal voor botherstel als zelfstandige verrichting, per sextant (één zesde deel)",
    "priceCents": 45010,
    "category": "T"
  },
  {
    "code": "T112",
    "description": "Aanbrengen parodontaal regeneratiemateriaal voor botherstel als niet-zelfstandige verrichting, gelijktijdig met flapoperatie in hetzelfde sextant (één zesde deel), per element",
    "priceCents": 15003,
    "category": "T"
  },
  {
    "code": "T113",
    "description": "Operatieve verwijdering van regeneratiemateriaal",
    "priceCents": 24381,
    "category": "T"
  },
  {
    "code": "T121",
    "description": "Kroonverlenging, één element",
    "priceCents": 24381,
    "category": "T"
  },
  {
    "code": "T122",
    "description": "Kroonverlenging, bij twee t/m zes elementen",
    "priceCents": 45010,
    "category": "T"
  },
  {
    "code": "T141",
    "description": "Tandvleestransplantaat",
    "priceCents": 14253,
    "category": "T"
  },
  {
    "code": "T142",
    "description": "Recessie bedekking met verplaatste lap",
    "priceCents": 45010,
    "category": "T"
  },
  {
    "code": "T151",
    "description": "Directe postoperatieve zorg, eerste zitting",
    "priceCents": 7502,
    "category": "T"
  },
  {
    "code": "T152",
    "description": "Directe postoperatieve zorg, volgende zitting",
    "priceCents": 20180,
    "category": "T"
  },
  {
    "code": "T161",
    "description": "Bacteriologisch onderzoek ten behoeve van tandvleesbehandeling",
    "priceCents": 5251,
    "category": "T"
  },
  {
    "code": "T162",
    "description": "Behandeling tandvleesabces",
    "priceCents": 10127,
    "category": "T"
  },
  {
    "code": "T163",
    "description": "Toepassing lokaal medicament",
    "priceCents": 8102,
    "category": "T"
  },
  {
    "code": "T164",
    "description": "(Draad)Spalk",
    "priceCents": 3001,
    "category": "T"
  },
  {
    "code": "T165",
    "description": "Uitgebreide voedingsanalyse",
    "priceCents": 7502,
    "category": "T"
  },
  {
    "code": "U05",
    "description": "Tijdtarief begeleiding en behandeling moeilijk behandelbare patiënten in eenheden van vijf minuten",
    "priceCents": 2094,
    "category": "U"
  },
  {
    "code": "U06",
    "description": "Extra tijd begeleiding moeilijk behandelbare patiënten in eenheden van vijf minuten",
    "priceCents": 2094,
    "category": "U"
  },
  {
    "code": "U25",
    "description": "Tijdtarief tandheelkundige hulp aan patiënten die behandeld worden in Wlz-instelling in eenheden van vijf minuten",
    "priceCents": 1815,
    "category": "U"
  },
  {
    "code": "U35",
    "description": "Tijdtarief tandheelkundige hulp aan patiënten die verblijven in de Wlz-instelling en behandeld worden in de eigen praktijk van de zorgaanbieder in eenheden van vijf minuten",
    "priceCents": 2094,
    "category": "U"
  },
  {
    "code": "V15",
    "description": "Aanbrengen schildje van tandkleurig plastisch materiaal (facing)",
    "priceCents": 9002,
    "category": "V"
  },
  {
    "code": "V30",
    "description": "Aanbrengen van fissuurlak eerste element (sealen)",
    "priceCents": 3376,
    "category": "V"
  },
  {
    "code": "V35",
    "description": "Aanbrengen van fissuurlak (sealen) ieder volgend element in dezelfde zitting",
    "priceCents": 1875,
    "category": "V"
  },
  {
    "code": "V40",
    "description": "Het polijsten, beslijpen en bijwerken van oude vullingen",
    "priceCents": 750,
    "category": "V"
  },
  {
    "code": "V71",
    "description": "Eénvlaksvulling amalgaam",
    "priceCents": 3151,
    "category": "V"
  },
  {
    "code": "V72",
    "description": "Tweevlaksvulling amalgaam",
    "priceCents": 5026,
    "category": "V"
  },
  {
    "code": "V73",
    "description": "Drievlaksvulling amalgaam",
    "priceCents": 6526,
    "category": "V"
  },
  {
    "code": "V74",
    "description": "Meervlaksvulling amalgaam",
    "priceCents": 9527,
    "category": "V"
  },
  {
    "code": "V80",
    "description": "Aanbrengen eerste wortelkanaalstift",
    "priceCents": 4351,
    "category": "V"
  },
  {
    "code": "V81",
    "description": "Eénvlaksvulling glasionomeer/glascarbomeer/compomeer",
    "priceCents": 4651,
    "category": "V"
  },
  {
    "code": "V82",
    "description": "Tweevlaksvulling glasionomeer/glascarbomeer/compomeer",
    "priceCents": 6526,
    "category": "V"
  },
  {
    "code": "V83",
    "description": "Drievlaksvulling glasionomeer/glascarbomeer/compomeer",
    "priceCents": 8027,
    "category": "V"
  },
  {
    "code": "V84",
    "description": "Meervlaksvulling glasionomeer/glascarbomeer/compomeer",
    "priceCents": 10652,
    "category": "V"
  },
  {
    "code": "V85",
    "description": "Aanbrengen van elke volgende wortelkanaalstift in hetzelfde element",
    "priceCents": 2851,
    "category": "V"
  },
  {
    "code": "V91",
    "description": "Eénvlaksvulling composiet",
    "priceCents": 6001,
    "category": "V"
  },
  {
    "code": "V92",
    "description": "Tweevlaksvulling composiet",
    "priceCents": 7877,
    "category": "V"
  },
  {
    "code": "V93",
    "description": "Drievlaksvulling composiet",
    "priceCents": 9377,
    "category": "V"
  },
  {
    "code": "V94",
    "description": "Meervlaksvulling composiet",
    "priceCents": 12003,
    "category": "V"
  },
  {
    "code": "V95",
    "description": "Volledig vormherstel tand of kies met composiet (herstel anatomische kroon)",
    "priceCents": 18754,
    "category": "V"
  },
  {
    "code": "X10",
    "description": "Maken en beoordelen kleine röntgenfoto",
    "priceCents": 2100,
    "category": "X"
  },
  {
    "code": "X11",
    "description": "Beoordelen kleine röntgenfoto",
    "priceCents": 1575,
    "category": "X"
  },
  {
    "code": "X21",
    "description": "Maken en beoordelen kaakoverzichtsfoto",
    "priceCents": 9002,
    "category": "X"
  },
  {
    "code": "X22",
    "description": "Maken en beoordelen kaakoverzichtsfoto t.b.v. implantologie in de tandeloze kaak",
    "priceCents": 9002,
    "category": "X"
  },
  {
    "code": "X23",
    "description": "Beoordelen kaakoverzichtsfoto",
    "priceCents": 3301,
    "category": "X"
  },
  {
    "code": "X24",
    "description": "Maken en beoordelen schedelfoto",
    "priceCents": 4051,
    "category": "X"
  },
  {
    "code": "X25",
    "description": "Maken en beoordelen meerdimensionale kaakfoto",
    "priceCents": 25506,
    "category": "X"
  },
  {
    "code": "X26",
    "description": "Beoordelen meerdimensionale kaakfoto",
    "priceCents": 7502,
    "category": "X"
  },
  {
    "code": "X34",
    "description": "Beoordelen schedelfoto",
    "priceCents": 3001,
    "category": "X"
  },
  {
    "code": "Y01",
    "description": "Informatieverstrekking aan derden, per vijf minuten",
    "priceCents": 1709,
    "category": "Y"
  }
];
export const NZA_2026_NO_FIXED_PRICE = [
  {
    "code": "A20",
    "description": "Behandeling onder algehele anesthesie of sedatie",
    "reason": "kostprijs"
  },
  {
    "code": "R90",
    "description": "Gedeeltelijk voltooid werk",
    "reason": "Naar gelang het stadium waarin de tandheel-kundige werkzaamheden verkeren"
  },
  {
    "code": "J050",
    "description": "Toeslag voor de kosten van boren voor eenmalig gebruik en/of inzetstukken van een Implant Removal Set voor eenmalig gebruik",
    "reason": "kostprijs"
  },
  {
    "code": "Y02",
    "description": "Onderlinge dienstverlening",
    "reason": "Maximum"
  }
] as const;
