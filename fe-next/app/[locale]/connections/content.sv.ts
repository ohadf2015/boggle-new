import type { ConnectionsLandingCopy } from './content.types';

/**
 * Swedish landing copy — written natively, not translated. The Swedish pool
 * (118 puzzles) is built on sammansatta ord: fot|boll|plan, so the bridge is a
 * compound *element* rather than a standalone word the way Russian works.
 * Samples are real puzzles from lib/connections/puzzles/generated/sv.generated.ts.
 */
export const SV_COPY: ConnectionsLandingCopy = {
  metaTitle: 'Ordbron — hitta ordet som binder ihop | LexiClash',
  metaDescription:
    'Gratis ordspel online. Två ordhalvor, ett ord emellan: FOT … PLAN → BOLL. Sammansatta ord som pussel. Ingen registrering, ingen nedladdning — spela direkt i webbläsaren.',
  metaKeywords:
    'ordspel online, ordlek, sammansatta ord, ordpussel, gratis ordspel, svenska ordspel, hjärngympa ord, ordspel utan nedladdning',
  ogTitle: 'Ordbron — hitta ordet som binder ihop',
  ogDescription: 'Två ordhalvor, ett ord emellan. Sammansatta ord som pussel, gratis online.',
  twitterTitle: 'Ordbron — gratis ordspel',
  twitterDescription: 'Två ordhalvor, ett ord emellan. Hittar du bron?',
  badge: 'GRATIS • INGEN REGISTRERING',
  h1Pre: 'Två ordhalvor. En bro.',
  h1Highlight: 'Hitta ordet emellan.',
  h1Sub: 'Ordbron — sammansatta ord som pussel',
  introP1:
    'Du får två orddelar, en till vänster och en till höger. Uppgiften är att hitta det enda ord som passar emellan så att båda blir riktiga sammansatta ord. FOT … PLAN? BOLL. SJUK … LÄKARE? HUS. Reglerna tar tio sekunder att lära sig.',
  introP2:
    'Svenskan bygger sammansättningar i ett svep — det är precis den vanan spelet utnyttjar. En omgång tar en halv minut, ingen reklam avbryter mitt i, och inget behöver installeras.',
  ctaPrimary: 'Spela gratis nu',
  ctaSecondary: 'Så funkar det ↓',
  demo: {
    label: 'Testa — tryck på rutan i mitten',
    puzzle: { word1: 'FOT', word2: 'PLAN', bridge: 'BOLL', difficulty: 'easy' },
    reveal: 'Visa bron',
    success: 'Det är en bro!',
  },
  samples: {
    heading: 'Tre att testa',
    sub: 'Tryck på ett kort för att se svaret',
    revealLabel: 'Tryck för att visa',
    difficultyLabels: { easy: 'Lätt', medium: 'Medel', hard: 'Svår' },
    items: [
      { word1: 'SJUK', word2: 'LÄKARE', bridge: 'HUS', difficulty: 'easy' },
      { word1: 'VÄGG', word2: 'RADIO', bridge: 'KLOCKA', difficulty: 'medium' },
      { word1: 'FLOD', word2: 'SKO', bridge: 'HÄST', difficulty: 'hard' },
    ],
  },
  why: {
    heading: 'Varför det är bra hjärngympa',
    cards: [
      {
        title: 'Vässar känslan för sammansättningar',
        body: 'Svenskan sätter ihop ord utan mellanslag. Spelet gör den regeln synlig — och plötsligt hör du fogen i ord du använt i hela ditt liv.',
      },
      {
        title: 'Tränar sidledes tänkande',
        body: 'Den uppenbara vägen brukar vara fel. Hjärnan lär sig snabbt skanna synonymer, fasta uttryck och bildliga betydelser.',
      },
      {
        title: 'Håller ordminnet i trim',
        body: 'Att hitta bron är återkallning och association på samma gång — samma förmåga som räddar dig när ordet ligger på tungan.',
      },
    ],
  },
  heClassic: null,
  compare: {
    heading: 'Hur skiljer det sig?',
    sub: 'Vi byggde Ordbron för att inte vara ännu ett Wordle',
    columns: ['Spel', 'Vad du gör', 'Längd', 'Vad det tränar'],
    rows: [
      {
        name: 'Ordbron (det här spelet)',
        doing: 'Hittar ordet mellan två orddelar',
        length: '30 sek / pussel',
        skill: 'Association + ordförråd',
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
        skill: 'Ordförråd + taktik',
      },
      {
        name: 'Korsord',
        doing: 'Fyller ett rutnät utifrån ledtrådar',
        length: '10–60 min',
        skill: 'Allmänbildning + stavning',
      },
    ],
  },
  faq: {
    heading: 'Vanliga frågor',
    items: [
      {
        q: 'Vad är Ordbron?',
        a: 'Ett ordpussel byggt på sammansatta ord. Du ser två orddelar och ska hitta det ord som passar emellan så att båda sammansättningarna blir riktiga svenska ord. Exempel: SOL … BLAD → ROS (solros, rosblad).',
      },
      {
        q: 'Är det samma sak som NYT Connections?',
        a: 'Nej. Där sorterar du 16 ord i fyra teman. Här får du två orddelar och letar efter det som binder ihop dem. Olika mekanik, samma sorts aha-känsla.',
      },
      {
        q: 'Är det verkligen gratis?',
        a: 'Ja. Ingen registrering, ingen betalvägg, inget att ladda ner. Konto behövs bara om du vill spara framsteg och synas på topplistorna.',
      },
      {
        q: 'Avbryter reklam mitt i omgången?',
        a: 'Nej. Inget poppar upp mitt i ett pussel eller täcker spelplanen. Du kan välja att se en kort film för att få en ledtråd — helt frivilligt.',
      },
      {
        q: 'Är pusslen skrivna på svenska eller översatta?',
        a: 'Skrivna på svenska. Sammansättningar går inte att översätta — flodhäst och hästsko har inga motsvarigheter i engelskan. Varje språk har därför sin egen bank.',
      },
      {
        q: 'Hur fungerar ledtrådarna?',
        a: 'En ledtråd per pussel. Den avslöjar inte svaret utan pekar åt rätt håll — till exempel "Sveriges populäraste sport" för BOLL.',
      },
      {
        q: 'Finns det en daglig utmaning?',
        a: 'Ja. Fem broar per dag, samma för alla spelare, med gemensam topplista. Byts vid midnatt UTC.',
      },
    ],
  },
  footerCta: {
    heading: 'Redo att hitta broar?',
    body: 'Gratis. I webbläsaren. Inget att ladda ner.',
    button: 'Börja spela',
  },
  videoGameName: 'Ordbron',
  videoGameDescription:
    'Gratis svenskt ordpussel online. Två orddelar visas och spelaren ska hitta det ord som passar emellan så att båda blir riktiga sammansatta ord.',
};
