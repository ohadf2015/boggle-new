import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckList, CompareTable, CtaBand, FaqList, LandingButton, LandingHero, LandingPage, LinkPills, Section, TileGrid } from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';

export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { locale } = await params;
    const isSwedish = locale === 'sv';
    const pageUrl = `${BASE_URL}/sv/lexiclash-vs-wordfeud`;

    return {
        title: 'LexiClash vs Wordfeud — Vilket Ordspel Är Bäst 2026? | LexiClash',
        description: 'LexiClash vs Wordfeud i jämförelse: realtid kontra turordning, 90 sekunder per match istället för dagar, 2-20 spelare, gratis i webbläsaren utan nedladdning. Hitta det bästa ordspelet för svenska spelare.',
        keywords: 'lexiclash vs wordfeud, wordfeud alternativ, gratis ordspel online, ordspel multiplayer, snabbt ordspel svenska, ordspel utan väntetid, bästa ordspelet 2026, ordspel i webbläsaren, alfapet alternativ',
        openGraph: {
            title: 'LexiClash vs Wordfeud — Realtid eller Turordning?',
            description: 'Wordfeud tar dagar per match. LexiClash kör synkront — 90 sekunder, 2-20 spelare, ingen nedladdning. Full jämförelse för svenska ordspelfans.',
            locale: 'sv_SE',
            type: 'website',
            url: pageUrl,
            images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'LexiClash vs Wordfeud jämförelse' }],
        },
        twitter: {
            card: 'summary_large_image',
            title: 'LexiClash vs Wordfeud — Vilket är bäst?',
            description: 'Realtidssynkat ordspel med 2-20 spelare i webbläsaren. Full jämförelse mot Wordfeud.',
            images: [`${BASE_URL}/og-image-en.webp`],
        },
        alternates: {
            canonical: pageUrl,
            languages: {
                'x-default': pageUrl,
                sv: pageUrl,
                'sv-SE': pageUrl,
            },
        },
        robots: { index: isSwedish, follow: true },
    };
}

const faqs = [
    {
        q: 'Hur skiljer sig LexiClash från Wordfeud?',
        a: 'Wordfeud är turbaserat — du och din motståndare lägger ord i tur och ordning, ofta med dagar mellan dragen. LexiClash är synkront i realtid: alla spelare ser samma bokstavsrutnät samtidigt och letar ord parallellt. En full match tar 90 sekunder istället för dagar. Båda spelen är gratis, men gameplay-rytmen är helt olika.',
    },
    {
        q: 'Hur många kan spela LexiClash samtidigt?',
        a: 'Mellan 2 och 20+ spelare i samma rum. Wordfeud är begränsat till 2 spelare per match. LexiClash är byggt för fester, klassrum, kollegor på distans och familjekvällar — alla på samma rutnät.',
    },
    {
        q: 'Behöver jag ladda ner en app?',
        a: 'Nej — LexiClash körs i webbläsaren. Det fungerar på iPhone, Android, surfplatta och dator utan installation. Du kan installera det som en Progressive Web App om du vill ha det på hemskärmen, men det är frivilligt. Wordfeud kräver appen för full funktionalitet.',
    },
    {
        q: 'Behöver jag ett konto?',
        a: 'Nej, du kan spela direkt som gäst. Inget Google-konto, inget Facebook-konto, ingen e-post krävs. Konto är valfritt och behövs bara om du vill synka framsteg mellan flera enheter. Wordfeud kräver registrering.',
    },
    {
        q: 'Är ordlistan lika omfattande som Wordfeud?',
        a: 'LexiClash använder en SAOL-anpassad svensk ordlista. Du får ett korrekt och meningsfullt spel på svenska. Wordfeud har Sveriges största spelarbas och en välslipad ordlista efter över ett decenniums utveckling — det är fortfarande riktmärket. LexiClash kompletterar med flerspelarformat och flera språk i samma app.',
    },
    {
        q: 'Vad kostar LexiClash?',
        a: 'Gratis. Alla spellägen, dagliga utmaningar och flerspelarrum är öppna utan betalning. Vi visar annonser för att hålla det gratis, men annonser blockerar aldrig själva spelet. Inga pay-to-win-mekaniker — alla powerups tjänas in genom spelande, inte köp.',
    },
    {
        q: 'Kan jag spela mot vänner specifikt, eller bara slumpmässiga motståndare?',
        a: 'Båda. Skapa ett rum och dela kod på sex tecken via SMS, WhatsApp eller QR-kod — dina vänner går med direkt. Du kan också gå med i öppna rum för att möta okända spelare. Wordfeud kräver att du adderar motståndare via användarnamn eller Facebook.',
    },
    {
        q: 'Finns det ett klassrumsläge för lärare?',
        a: 'Ja. LexiClash Education är gratis för lärare, ingen elevregistrering krävs. Bygg egna ordlistor från läroplanen, kör vokabulärduells, följ elevernas framsteg på en lärardashboard. Detta finns inte i Wordfeud. Lämpligt för svensktalande klassrum, ESL/SFI och språkundervisning.',
    },
    {
        q: 'Vad är skillnaden mellan Wordfeud, Alfapet och LexiClash?',
        a: 'Wordfeud och Alfapet bygger på samma idé som Scrabble: du lägger brickor på en spelplan och väntar på motståndarens drag. I LexiClash finns ingen spelplan och ingen tur. Alla letar ord i samma bokstavsrutnät samtidigt, och en runda är över på 90 sekunder.',
    },
];

const faqJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: 'sv-SE',
    url: `${BASE_URL}/sv/lexiclash-vs-wordfeud`,
    mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.q,
        acceptedAnswer: { '@type': 'Answer', text: faq.a },
    })),
});

export default async function LexiClashVsWordfeudPage({ params }: PageProps) {
    const { locale } = await params;

  return (
    <LandingPage locale={locale} play={{ href: `/${locale}/multiplayer`, label: 'Spela LexiClash Gratis' }}>
      <script type="application/ld+json">{faqJsonLd}</script>

      <LandingHero
        eyebrow="LexiClash vs Wordfeud"
        title="LexiClash vs Wordfeud — Vilket Ordspel Vinner?"
        lead="Wordfeud har dominerat svenska ordspel sedan 2010 — turbaserat, asynkront, perfekt för långsamma matcher mellan dragen."
        actions={
          <>
            <LandingButton href={`/${locale}/multiplayer`}>Spela LexiClash Gratis</LandingButton>
            <LandingButton href={`/${locale}/daily`} variant="secondary">Daglig Utmaning</LandingButton>
          </>
        }
        art={LANDING_ART.duel('Två LexiClash-maskotar möts i en ordduell')}
        artTone="cyan"
        more={
          <p>
            LexiClash är något annat: synkront i realtid, 2-20+ spelare på samma rutnät samtidigt, en full match på 90 sekunder. Båda är gratis. Båda är webbläsarvänliga. Men gameplay-känslan är helt olika. Här är den ärliga jämförelsen för svenska ordspelfans.
          </p>
        }
      >
        <LinkPills items={[{ href: `/${locale}/education`, label: 'För Lärare' }]} />
      </LandingHero>

      <Section title="Den Ärliga Jämförelsen">
        <CompareTable
          columns={['Funktion', 'LexiClash', 'Wordfeud']}
          rows={[
            ['Speltakt', 'Realtid (synkront)', 'Turbaserat (dagar)'],
            ['Matchlängd', '~90 sekunder', 'Dagar till veckor'],
            ['Antal spelare per rum', '2 till 20+', '2 (fast)'],
            ['Spelmekanik', 'Hitta ord på delat rutnät', 'Lägg ord på Scrabble-bräda'],
            ['Ordlista', 'SAOL-anpassad', 'SAOL-baserad'],
            ['Konto krävs', 'Nej (valfritt)', 'Ja'],
            ['Plattformar', 'Webb + Android', 'Endast app'],
            ['Webbläsarspel', 'Ja', 'Begränsat'],
            ['Bjud in vänner', 'kod på sex tecken / QR / länk', 'Användarnamn / Facebook'],
            ['Pris', 'Gratis (annonser)', 'Gratis (annonser)'],
            ['Pay-to-win', 'Nej', 'Powerups via köp finns'],
            ['Daglig utmaning', 'Ja (Wordle-stil + Daily Buzz)', 'Inte primärt'],
            ['Klassrumsläge', 'Ja, gratis lärardashboard', 'Nej'],
            ['Antal språk', '5 (EN, HE, SV, JA, ES)', 'Främst nordiska'],
            ['Hebrew RTL-stöd', 'Ja', 'Nej'],
          ]}
        />
      </Section>

      <Section title="Varför Realtid Slår Turordning">
        <TileGrid
          columns={2}
          items={[
            {
              tone: 'cyan',
              title: 'Wordfeud (Asynkron Turordning)',
              body: 'Du gör ditt drag, motståndaren gör sitt — kanske om en timme, kanske om tre dagar. För strategiska spelare är väntetiden faktiskt en del av charmen: du har gott om tid att hitta det perfekta ordet. För andra känns det utdraget. Wordfeud är riktmärket för långsam, eftertänksam ordstrategi.',
            },
            {
              tone: 'pink',
              title: 'LexiClash (Synkron Realtid)',
              body: 'Alla spelare ser samma rutnät av slumpmässiga bokstäver. Klockan tickar. Du letar ord genom att koppla ihop intilliggande bokstäver — diagonalt, vertikalt, horisontellt. Längre ord = mer poäng. Komboer multiplicerar. Efter 90 sekunder är matchen slut. Mer puls, mer pannlobsarbete per minut, mindre väntan. Bra för fester och pauser; sämre för "jag svarar imorgon när jag har tid"-stilen.',
            },
          ]}
        />
      </Section>

      <Section title="Vad LexiClash Erbjuder Som Wordfeud Saknar">
        <TileGrid
          variant="paper"
          items={[
            { title: 'Daglig utmaning i Wordle-stil', body: 'Word Hunt Survival och Daily Buzz — globala dagliga pussel med resultat att dela och streak-uppföljning. Wordfeud har inget motsvarande dagligt format.' },
            { title: 'Multiplayer för 20+ spelare', body: 'Skapa ett rum, dela koden, få in hela klassen eller hela festen samtidigt på samma rutnät. Wordfeud är begränsat till 1 mot 1.' },
            { title: 'Klassrumsläge för lärare', body: 'Egna ordlistor från läroplanen, vokabulärduells, lärardashboard med elevernas framsteg. Helt gratis utan elevregistrering. Saknas i Wordfeud.' },
            { title: 'Hjärnträning: 4 övningar på en minut', body: 'Snabbhet, minne, uppmärksamhet och ovanliga ord, i rundor på 60 sekunder. Något sådant finns inte i Wordfeud.' },
            { title: '6 språk i samma app', body: 'Engelska, hebreiska (RTL), svenska, japanska, spanska, ryska. Användbart för språkstudier eller flerspråkiga vänner. Wordfeud fokuserar på nordiska språk var för sig.' },
            { title: 'Ingen registrering krävs', body: 'Klicka Spela, ange smeknamn, kör. Konto är valfritt — för synk mellan enheter. Wordfeud kräver konto från start.' },
          ]}
        />
      </Section>

      <Section title="När Du Ska Välja Vilket">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <h3 className="font-neo-display text-xl font-bold text-neo-cyan">Välj Wordfeud Om Du Vill:</h3>
            <CheckList
              items={[
                'Spela Scrabble-stil med taktisk planering',
                'Ha matcher som pågår i dagar — inget tidstryck',
                'Möta en specifik motståndare 1 mot 1',
                'Använda en etablerad app med stor svensk spelarbas',
                'Ha en lugnare, eftertänksam ordspelupplevelse',
              ]}
            />
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="font-neo-display text-xl font-bold text-neo-lime">Välj LexiClash Om Du Vill:</h3>
            <CheckList
              items={[
                'Spela en match på 90 sekunder, inte dagar',
                'Få med 5-20 personer på samma fest eller klass',
                'Spela direkt i webbläsaren utan att ladda ner',
                'Ha daglig utmaning med streaks (Wordle-stil)',
                'Använda klassrumsläge i undervisningen',
                'Spela på flera språk i samma app',
              ]}
            />
          </div>
        </div>
      </Section>

      <Section title="Vanliga Frågor">
        <FaqList items={faqs} />
      </Section>

      <Section title="Andra Jämförelser">
        <TileGrid
          variant="paper"
          items={[
            { href: `/${locale}/lexiclash-vs-wordle`, title: 'LexiClash vs Wordle', body: 'Multiplayer vs 1 dagligt pussel' },
            { href: `/${locale}/lexiclash-vs-scrabble`, title: 'LexiClash vs Scrabble GO', body: 'Realtid vs turordning' },
            { href: `/${locale}/lexiclash-vs-cabanagrams`, title: 'LexiClash vs Cabanagrams', body: 'Delat rutnät vs personligt' },
          ]}
        />
      </Section>

      <CtaBand
        tone="pink"
        title="Sammanfattning"
        body={
          <div className="flex flex-col gap-3">
            <p>
              Wordfeud är ett briljant turbaserat ordspel — Sveriges ordspelsklassiker sedan 2010. Om du älskar långsam, taktisk Scrabble-stil mellan en specifik motståndare så finns det inget bättre. Den stora svenska spelarbasen och den välslipade matchningen är reella fördelar.
            </p>
            <p>
              LexiClash är för dig som vill ha samma ordspelsglädje men i ett snabbare format: 90-sekunders synkrona matcher, 2-20+ spelare i samma rum, ingen nedladdning, klassrumsläge, daglig utmaning. Det är inte ett ersättning för Wordfeud — det är ett komplement för andra tillfällen. Wordfeud till morgonkaffet, LexiClash till festen.
            </p>
            <p>Båda är gratis. Båda fungerar i Sverige. Båda har svenska ordlistor. Skillnaden är vilken känsla du är ute efter.</p>
          </div>
        }
        actions={<LandingButton href={`/${locale}/multiplayer`}>Prova LexiClash Nu — Gratis, Ingen Nedladdning</LandingButton>}
        art={LANDING_ART.trophy('')}
      />
    </LandingPage>
  );
}
