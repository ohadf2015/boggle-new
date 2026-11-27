import type { Metadata } from 'next';
import Link from 'next/link';
import NativePageEnhancements from '@/components/landing/NativePageEnhancements';
import {
  CheckList,
  FaqList,
  LandingButton,
  LandingHero,
  LandingPage,
  Mark,
  Prose,
  Section,
  TileGrid,
} from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';
import { SCRABBLE_SV_ANSWER, SCRABBLE_SV_QUESTION, SV_DICT_FLOOR } from './content';


interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';

/** "Scrabble Svenska" — 1,450 impr/28d at pos 4.4, CTR 1.3% vs 8% expected; "alfapet online" pos 2.9, CTR 2.5% vs 11% expected. Added "Online" after "Gratis" to match "scrabble online svenska" query variant. ≤60 chars. */
const SV_TITLE = 'Spela Scrabble Svenska Gratis Online — Alfapet | LexiClash';
/** Adds Alfapet-alternativ signal for "alfapet online" searches; tightened to 136 chars. */
const SV_DESCRIPTION =
  'Spela scrabble på svenska gratis online — Alfapet-alternativ utan app eller konto. Tävla i realtid med upp till 50 spelare. Starta nu! →';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isTargetLocale = locale === 'sv';
  const pageUrl = `${BASE_URL}/sv/swedish-multiplayer-word-game`;

  return {
    title: SV_TITLE,
    description: SV_DESCRIPTION,
    keywords: 'alfapet spel online, ordspel online, multiplayer ordspel, ordspel svenska, wordfeud alternativ, boggle online svenska, scrabble online gratis, ordspel med vänner, ordspel i realtid, ordhjul, ordhjul online, daglig ordhjul',
    openGraph: {
      title: SV_TITLE,
      description: SV_DESCRIPTION,
      locale: 'sv_SE',
      type: 'website',
      url: pageUrl,
      images: [
        {
          url: `${BASE_URL}/sv/swedish-multiplayer-word-game/opengraph-image?v=2`,
          width: 1200,
          height: 630,
          alt: 'LexiClash - Multiplayer Ordspel på Svenska',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: SV_TITLE,
      description: SV_DESCRIPTION,
      images: [`${BASE_URL}/sv/swedish-multiplayer-word-game/opengraph-image?v=2`],
    },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': `${BASE_URL}/en/free-multiplayer-word-game`,
        en: `${BASE_URL}/en/free-multiplayer-word-game`,
        he: `${BASE_URL}/he/hebrew-multiplayer-word-game`,
        sv: `${BASE_URL}/sv/swedish-multiplayer-word-game`,
        ja: `${BASE_URL}/ja/japanese-word-game`,
        es: `${BASE_URL}/es/juego-de-palabras-multijugador`,
        'en-IL': `${BASE_URL}/en/free-multiplayer-word-game`,
        'he-IL': `${BASE_URL}/he/hebrew-multiplayer-word-game`,
        'en-US': `${BASE_URL}/en/free-multiplayer-word-game`,
        'es-US': `${BASE_URL}/es/juego-de-palabras-multijugador`,
        'en-GB': `${BASE_URL}/en/free-multiplayer-word-game`,
        'en-SE': `${BASE_URL}/en/free-multiplayer-word-game`,
        'sv-SE': `${BASE_URL}/sv/swedish-multiplayer-word-game`,
        'en-JP': `${BASE_URL}/en/free-multiplayer-word-game`,
        'ja-JP': `${BASE_URL}/ja/japanese-word-game`,
        'en-ES': `${BASE_URL}/en/free-multiplayer-word-game`,
        'es-ES': `${BASE_URL}/es/juego-de-palabras-multijugador`,
        'en-MX': `${BASE_URL}/en/free-multiplayer-word-game`,
        'es-MX': `${BASE_URL}/es/juego-de-palabras-multijugador`,
        'en-AU': `${BASE_URL}/en/free-multiplayer-word-game`,
        'es-AR': `${BASE_URL}/es/juego-de-palabras-multijugador`,
        'es-CO': `${BASE_URL}/es/juego-de-palabras-multijugador`,
      },
    },
    robots: { index: isTargetLocale, follow: true },
  };
}

export default async function SwedishMultiplayerWordGamePage({ params }: PageProps) {
  const { locale } = await params;

  const faqs = [
    {
      q: SCRABBLE_SV_QUESTION,
      a: SCRABBLE_SV_ANSWER,
    },
    {
      q: 'Hur börjar jag spela multiplayer ordspel?',
      a: 'Klicka helt enkelt på "Skapa rum" eller "Gå med i rum" på multiplayer-sidan. Dela rumslänken med vänner, så kan ni börja tävla i realtid!',
    },
    {
      q: 'Vad gör LexiClash olika från andra ordspel?',
      a: 'LexiClash kombinerar det bästa från Boggle, Scrabble och Wordle. Tävla i realtid med omedelbar poängåterkoppling, flera spellägen, bosskamper och dagliga utmaningar.',
    },
    {
      q: 'Kan jag spela med vänner online gratis?',
      a: 'Ja! LexiClash är helt gratis. Skapa rum, bjud in vänner via länk, och tävla utan nedladdning eller registrering.',
    },
    {
      q: 'Hur många svenska ord innehåller LexiClash?',
      a: `LexiClash innehåller över ${SV_DICT_FLOOR} svenska ord. Vår ordbok uppdateras kontinuerligt.`,
    },
    {
      q: 'Vilka spellägen finns?',
      a: 'Spela multiplayer-rum, dagliga utmaningar (ordhjul och ordjakt), ordletare, blastläge och mer. Varje läge har unika regler och poängberäkning. Ordhjulet är en daglig pussel där alla bokstäver ska inkludera mittenbokstaven.',
    },
    {
      q: 'Hur bildar man ord av bokstäver i LexiClash?',
      a: `I LexiClash ser alla spelare samma rutnät av bokstäver. Klicka eller dra för att bilda ord — ju längre ord, desto fler poäng. Spelet stödjer över ${SV_DICT_FLOOR} svenska ord inklusive flerordsformer och dialektord.`,
    },
  ];

  return (
    <LandingPage locale={locale} play={{ href: `/${locale}/multiplayer`, label: 'Spela gratis nu' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'FAQPage',
                mainEntity: faqs.map((faq) => ({
                  '@type': 'Question',
                  name: faq.q,
                  acceptedAnswer: { '@type': 'Answer', text: faq.a },
                })),
              },
              {
                '@type': 'HowTo',
                name: 'Hur man spelar Scrabble online på svenska gratis',
                description: 'Spela Scrabble online på svenska gratis med vänner i realtid i 3 enkla steg — ingen nedladdning, ingen registrering.',
                totalTime: 'PT1M',
                step: [
                  { '@type': 'HowToStep', name: 'Öppna LexiClash', text: 'Gå till lexiclash.live i valfri webbläsare på telefon, surfplatta eller dator. Ingen nedladdning krävs.' },
                  { '@type': 'HowToStep', name: 'Skapa ett rum', text: 'Välj "Skapa rum" och dela länken via WhatsApp, Discord eller direktmeddelande. Upp till 50 spelare kan ansluta.' },
                  { '@type': 'HowToStep', name: 'Hitta ord i realtid', text: 'Alla spelare ser samma rutnät samtidigt. Klicka eller dra för att skapa ord — längre ord ger fler poäng. Match varar 2-3 minuter.' },
                ],
              },
            ],
          }),
        }}
      />

      <LandingHero
        title={
          <>
            Multiplayer Ordspel Online - Spela Boggle & Scrabble på <Mark>Svenska</Mark>
          </>
        }
        lead={
          <span data-speakable="true">
            Spela Alfapet på svenska gratis i webbläsaren — inget konto, ingen app. LexiClash är ett
            realtids-alternativ till Wordfeud: skapa ett rum, skicka länken, och upp till 50 spelare tävlar
            på samma bokstavsrutnät. Över {SV_DICT_FLOOR} svenska ord, matcher på 2–3 minuter. Starta direkt.
          </span>
        }
        actions={
          <>
            <LandingButton href={`/${locale}/multiplayer`}>▶ Spela gratis nu</LandingButton>
            <LandingButton href={`/${locale}/daily/word-wheel`} variant="secondary">
              ★ Dagens ordhjul
            </LandingButton>
          </>
        }
        art={LANDING_ART.languages('LexiClash-maskotar med bokstavsbrickor på olika språk')}
        artTone="cyan"
      />

      <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-12">
        <section className="flex flex-col gap-4 rounded-neo-lg border-3 border-neo-black bg-neo-cream p-6 text-neo-black shadow-hard-xl sm:p-8">
          <h2 className="font-neo-display text-2xl font-bold leading-tight">{SCRABBLE_SV_QUESTION}</h2>
          <p className="leading-relaxed" data-speakable="true">{SCRABBLE_SV_ANSWER}</p>
          <Link href={`/${locale}/multiplayer`} className="font-bold underline decoration-neo-pink decoration-2 underline-offset-2">
            Skapa ett rum och spela nu →
          </Link>
        </section>
        <Section title="Bilda ord av bokstäver — så funkar det">
          <Prose>
            <p>
              På ytan är det enkelt: du får ett rutnät med slumpade bokstäver och ska bilda ord av
              bokstäverna genom att koppla ihop intilliggande rutor. Men det är tempot som gör det
              beroendeframkallande — alla letar på samma rutnät samtidigt, så ordet du tvekar på kan
              din kompis haffa först.
            </p>
            <p>
              Längre ord ger fler poäng, och sällsynta ord är guld värda. Efter varje runda visas hela
              listan med ord som gömde sig i rutnätet — ett förvånansvärt roligt sätt att bygga ut sitt
              svenska ordförråd mellan matcherna.
            </p>
          </Prose>
        </Section>
      </div>

      <Section title="Varför spela LexiClash Multiplayer?">
        <CheckList
          items={[
            'Realtids multiplayer-kamper med omedelbar poängåterkoppling',
            'Skapa rum och bjud in vänner via delbar länk',
            `Över ${SV_DICT_FLOOR} svenska ord i ordförrådet`,
            'Flera spellägen (Boggle, Ordhjul, Letare, Blast)',
            'Dagliga utmaningar med poängtabeller',
            'Bosskamper med unika vändningar',
            'Helt gratis, ingen nedladdning behövs',
            'Spela på 6 språk (EN, HE, SV, JA, ES, RU)',
          ]}
        />
      </Section>

      <TileGrid
        items={[
          { href: `/${locale}/multiplayer`, title: 'Börja Spela Multiplayer →', tone: 'yellow' },
          { href: `/${locale}/quick-play`, title: 'Spela Ensam →', tone: 'cyan' },
          { href: `/${locale}/daily`, title: 'Daglig Utmaning →', tone: 'pink' },
        ]}
      />

      <Section title="Vanliga Frågor">
        <FaqList items={faqs} />
      </Section>

      <Section title="Om LexiClash Multiplayer">
        <Prose>
          <p>
            LexiClash tar det strategiska djupet från Scrabble, tempot från Boggle och pusselglädjen från
            Wordle — och blandar allt i en enda realtidsduell. Det är byggt för alla som någonsin bråkat
            om ett ord faktiskt finns: ordnördar, söndagsspelare och renodlade tävlingsmänniskor.
          </p>
          <p>
            Spela multiplayer ordspel online med vänner, familj eller främlingar världen över. Oavsett om du vill ha en
            snabb 15-minuters match eller en längre tävlingssession, LexiClash passar alla spelstilar. Det intuitiva
            gränssnittet fungerar på både dator och mobil, så att du kan spela ordspel var som helst, när som helst.
          </p>
          <p>
            Tävla på globala poängtabeller, tjäna prestationer och lås upp specialspellägen. Våra bosskamper lägger till
            en unik PvE-vändning där spelare samarbetar mot AI-motståndare. Dagliga utmaningar erbjuder nya pussel
            varje dag med exklusiva belöningar.
          </p>
          <p>
            Utöver multiplayer hittar du <Link href={`/${locale}/daily-word-wheel`}>dagligt ordhjul</Link> — snurra
            hjulet och hitta alla ord — och <Link href={`/${locale}/daily`}>Ordjakt</Link> — gissa det dolda ordet på
            10 försök. Båda är gratis, nya pussel varje dag.
          </p>
          <p>
            Kör du fast på dina brickor kan du{' '}
            <Link href={`/${locale}/tools/word-solver`}>bilda ord av bokstäver</Link> med vår ordlösare: skriv in
            bokstäverna och se alla ord de räcker till.
          </p>
        </Prose>
      </Section>

      <NativePageEnhancements locale={locale} />
    </LandingPage>
  );
}
