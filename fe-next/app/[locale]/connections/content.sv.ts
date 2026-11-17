import type { ConnectionsLandingCopy } from './content.types';

/**
 * Swedish landing copy — written natively, not translated. The Swedish pool is
 * built on sammansatta ord: fot|boll|plan, so the bridge is a compound element
 * rather than a standalone word the way Russian works. Every puzzle shown is a
 * real row of lib/connections/puzzles/generated/sv.generated.ts.
 */
export const SV_COPY: ConnectionsLandingCopy = {
  metaTitle: 'Sammansatta ord spel: gratis ordpussel online | LexiClash',
  metaDescription:
    'Gratis spel med sammansatta ord. Hitta ordet som passar mellan två andra: FOT … PLAN → BOLL (fotboll, bollplan). Dagens utmaning, nivåer, ingen inloggning.',
  metaKeywords:
    'sammansatta ord spel, sammansatta ord, sammansatta ord exempel, ordlek online, ordpussel, hitta ordet spel, gratis ordspel, ordbron',
  ogTitle: 'Sammansatta ord: vilket ord passar i mitten?',
  ogDescription: 'FOT … PLAN. Ett ord ger både fotboll och bollplan. Gratis ordpussel i webbläsaren.',
  twitterTitle: 'Gratis spel med sammansatta ord',
  twitterDescription: 'FOT … PLAN. Vilket ord passar åt båda hållen?',
  badge: 'GRATIS • INGEN INLOGGNING',
  h1Pre: 'Spelet med sammansatta ord',
  h1Highlight: 'Vilket ord passar i mitten?',
  h1Sub: 'Ordbron: ordpussel att spela direkt i webbläsaren',
  introP1:
    'Du ser två ord med en lucka emellan. Fyll luckan med ett ord som bildar ett riktigt sammansatt ord åt båda hållen. FOT … PLAN? BOLL, eftersom både fotboll och bollplan finns. SJUK … LÄKARE? HUS.',
  introP2:
    'Vissa svar ser du direkt, andra får du sitta och stirra på en stund innan det klickar. Varje dag kommer fem nya pussel, det finns en lång rad nivåer som blir svårare efter hand och en ledtråd när du kör fast. Det är gratis och du behöver inget konto.',
  ctaPrimary: 'Spela gratis',
  ctaSecondary: 'Så spelar du ↓',
  demo: {
    label: 'Testa: tryck på rutan i mitten',
    puzzle: { word1: 'FOT', word2: 'PLAN', bridge: 'BOLL', difficulty: 'easy' },
    reveal: 'Visa svaret',
    success: 'Fotboll och bollplan!',
  },
  howTo: {
    heading: 'Så spelar du',
    steps: [
      'Läs de två orden. Svaret hamnar mellan dem, alltså efter det första och före det andra.',
      'Skriv ordet som saknas. Det måste bilda ett riktigt sammansatt ord med båda sidorna, som glass + bil och bil + väg.',
      'Kört fast? Ledtråden ger dig en knuff. I nivåerna kostar varje fel ett liv, och ett löst pussel öppnar nästa.',
    ],
    examplesLabel: 'Tre lösta exempel',
    examples: [
      { word1: 'GLASS', bridge: 'BIL', word2: 'VÄG', left: 'glassbil', right: 'bilväg' },
      { word1: 'SOL', bridge: 'ROS', word2: 'BLAD', left: 'solros', right: 'rosblad' },
      { word1: 'HUS', bridge: 'TAK', word2: 'LAMPA', left: 'hustak', right: 'taklampa' },
    ],
  },
  samples: {
    heading: 'Nu är det din tur',
    sub: 'Tryck på ett kort för att se svaret',
    revealLabel: 'Tryck för att visa',
    difficultyLabels: { easy: 'Lätt', medium: 'Medel', hard: 'Svår' },
    items: [
      { word1: 'SJUK', word2: 'LÄKARE', bridge: 'HUS', difficulty: 'easy' },
      { word1: 'IS', word2: 'STOPP', bridge: 'BERG', difficulty: 'medium' },
      { word1: 'SAND', word2: 'KONTO', bridge: 'BANK', difficulty: 'hard' },
    ],
  },
  modes: {
    heading: 'Fler sätt att spela',
    items: [
      {
        key: 'daily',
        title: 'Dagens utmaning',
        body: 'Fem pussel om dagen, samma för alla, från lätt till svårt. I morgon kommer fem nya.',
      },
      {
        key: 'play',
        title: 'Nivåer',
        body: 'Över hundra pussel i rad. Du har tre liv, och ett förlorat liv kommer tillbaka efter 20 minuter.',
      },
      {
        key: 'community',
        title: 'Spelarnas pussel',
        body: 'Pussel som andra spelare har skrivit. Rösta på de bästa eller skicka in ett eget.',
      },
    ],
  },
  why: {
    heading: 'Därför är det svårt att sluta',
    cards: [
      {
        title: 'Ett pussel tar under en minut',
        body: 'Ett hinner du på fikapausen, och hela dagens utmaning ryms på bussen hem.',
      },
      {
        title: 'Du ser orden på ett nytt sätt',
        body: 'Efter några rundor börjar du lägga märke till sammansatta ord överallt: på skyltar, menyer och i rubriker.',
      },
      {
        title: 'Svaret känns självklart efteråt',
        body: 'De bästa svaren ligger mitt framför ögonen. Att hitta ett efter en stunds funderande är hela poängen.',
      },
    ],
  },
  heClassic: null,
  compare: {
    heading: 'Hur skiljer det sig?',
    sub: 'Ett dagligt ordspel som de du redan känner till, men ett annat sorts pussel',
    columns: ['Spel', 'Vad du gör', 'Tid', 'Vad det kräver'],
    rows: [
      {
        name: 'Ordbron (det här spelet)',
        doing: 'Hittar ordet som binder ihop två andra till sammansatta ord',
        length: 'Under en minut per pussel',
        skill: 'Ordförråd, sammansättningar',
      },
      {
        name: 'Wordle',
        doing: 'Gissar ett fembokstavsord på sex försök',
        length: '3–5 min',
        skill: 'Bokstavslogik',
      },
      {
        name: 'Alfapet',
        doing: 'Lägger ord på en bräda för poäng',
        length: '10–30 min',
        skill: 'Ordförråd, taktik',
      },
      {
        name: 'Korsord',
        doing: 'Fyller ett rutnät utifrån ledtrådar',
        length: '10–60 min',
        skill: 'Allmänbildning, stavning',
      },
    ],
  },
  faq: {
    heading: 'Vanliga frågor',
    items: [
      {
        q: 'Hur fungerar spelet med sammansatta ord?',
        a: 'Du får två ord och letar efter ett tredje som passar emellan. Med det första ska det bli ett riktigt sammansatt ord, och med det andra ett till. STEN … DIOXID blir KOL: stenkol och koldioxid.',
      },
      {
        q: 'Passar det för barn som övar på sammansatta ord?',
        a: 'De första nivåerna fungerar bra för det, med ord som fotboll och sjukhus. Längre fram blir det svårare, så vuxna har också något att bita i.',
      },
      {
        q: 'Är det gratis? Måste jag registrera mig?',
        a: 'Det är gratis, och du kan börja spela direkt utan att registrera dig eller ladda ner något.',
      },
      {
        q: 'Hur fungerar ledtrådarna?',
        a: 'Du får en gratis ledtråd om dagen. Det är en kort beskrivning som pekar mot ordet som saknas, aldrig själva ordet.',
      },
      {
        q: 'Måste jag skriva å, ä och ö?',
        a: 'Nej. Svaret räknas som rätt även om du skriver a i stället för å eller ä, så du förlorar inget försök på det.',
      },
      {
        q: 'Är pusslen skrivna på svenska eller översatta?',
        a: 'Skrivna på svenska. Sammansatta ord går sällan att översätta rakt av, så varje språk har sina egna pussel.',
      },
      {
        q: 'Är det samma sak som NYT Connections?',
        a: 'Nej. I Connections sorterar du 16 ord i fyra grupper. Här får du två ord och letar efter det enda som binder ihop dem.',
      },
    ],
  },
  footerCta: {
    heading: 'Klarar du dagens fem?',
    body: 'Gratis, i webbläsaren, ingen nedladdning.',
    button: 'Börja spela',
  },
  videoGameName: 'Ordbron',
  videoGameDescription:
    'Gratis ordspel med sammansatta ord på svenska. Varje pussel visar två ord, och spelaren letar efter ordet som bildar ett sammansatt ord med båda, som FOT + BOLL + PLAN. Det finns en daglig utmaning, nivåer och pussel från andra spelare.',
};
