import type { Metadata } from 'next';
import Link from 'next/link';
import NativePageEnhancements from "@/components/landing/NativePageEnhancements";
import { TopBackLink } from '@/components/navigation/TopBackLink';


interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isTargetLocale = locale === 'sv';
  const pageUrl = `${BASE_URL}/sv/swedish-multiplayer-word-game`;

  return {
    title: 'Scrabble Online Svenska Gratis — Spela Nu | LexiClash',
    description: 'Scrabble på svenska i realtid — inte tur och ordning. Skapa rum, bjud in med länk, tävla direkt. Gratis, ingen app, ingen registrering.',
    keywords: 'ordspel online, multiplayer ordspel, ordspel svenska, wordfeud alternativ, boggle online svenska, scrabble online gratis, ordspel med vänner, ordspel i realtid, ordhjul, ordhjul online, daglig ordhjul',
    openGraph: {
      title: 'Scrabble Online Svenska Gratis — Spela Multiplayer | LexiClash',
      description: 'Scrabble på svenska i realtid — inte tur och ordning. Skapa rum, bjud in med länk. Gratis, ingen registrering.',
      locale: 'sv_SE',
      type: 'website',
      url: pageUrl,
      images: [
        {
          url: `${BASE_URL}/og-image-sv.webp`,
          width: 1200,
          height: 630,
          alt: 'LexiClash - Multiplayer Ordspel på Svenska',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Scrabble Online Svenska Gratis — Spela Multiplayer | LexiClash',
      description: 'Scrabble på svenska i realtid — inte tur och ordning. Skapa rum, bjud in med länk, tävla direkt. Gratis.',
      images: [`${BASE_URL}/og-image-sv.webp`],
    },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': `${BASE_URL}/en/multiplayer-word-game-online`,
        en: `${BASE_URL}/en/multiplayer-word-game-online`,
        he: `${BASE_URL}/he/hebrew-multiplayer-word-game`,
        sv: `${BASE_URL}/sv/swedish-multiplayer-word-game`,
        ja: `${BASE_URL}/ja/japanese-word-game`,
        es: `${BASE_URL}/es/juego-de-palabras-multijugador`,
        'en-IL': `${BASE_URL}/en/multiplayer-word-game-online`,
        'he-IL': `${BASE_URL}/he/hebrew-multiplayer-word-game`,
        'en-US': `${BASE_URL}/en/multiplayer-word-game-online`,
        'es-US': `${BASE_URL}/es/juego-de-palabras-multijugador`,
        'en-GB': `${BASE_URL}/en/multiplayer-word-game-online`,
        'en-SE': `${BASE_URL}/en/multiplayer-word-game-online`,
        'sv-SE': `${BASE_URL}/sv/swedish-multiplayer-word-game`,
        'en-JP': `${BASE_URL}/en/multiplayer-word-game-online`,
        'ja-JP': `${BASE_URL}/ja/japanese-word-game`,
        'en-ES': `${BASE_URL}/en/multiplayer-word-game-online`,
        'es-ES': `${BASE_URL}/es/juego-de-palabras-multijugador`,
        'en-MX': `${BASE_URL}/en/multiplayer-word-game-online`,
        'es-MX': `${BASE_URL}/es/juego-de-palabras-multijugador`,
        'en-AU': `${BASE_URL}/en/multiplayer-word-game-online`,
        'es-AR': `${BASE_URL}/es/juego-de-palabras-multijugador`,
        'es-CO': `${BASE_URL}/es/juego-de-palabras-multijugador`,
      },
    },
    robots: { index: true, follow: true },
  };
}

export default async function SwedishMultiplayerWordGamePage({ params }: PageProps) {
  const { locale } = await params;

  const faqs = [
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
      a: 'LexiClash innehåller över 10 000 svenska ord. Vår ordbok uppdateras kontinuerligt.',
    },
    {
      q: 'Vilka spellägen finns?',
      a: 'Spela multiplayer-rum, dagliga utmaningar (ordhjul och ordjakt), ordletare, blastläge och mer. Varje läge har unika regler och poängberäkning. Ordhjulet är en daglig pussel där alla bokstäver ska inkludera mittenbokstaven.',
    },
    {
      q: 'Var kan man spela Scrabble online på svenska gratis?',
      a: 'LexiClash är det bästa gratis alternativet till Scrabble och Wordfeud på svenska. Spela direkt i webbläsaren — ingen app, ingen registrering. Skapa ett rum, bjud in upp till 20 vänner via länk, och tävla i realtid med över 10 000 svenska ord.',
    },
  ];

  return (
    <main className="min-h-screen bg-neo-navy text-neo-white">
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
                  { '@type': 'HowToStep', name: 'Skapa ett rum', text: 'Välj "Skapa rum" och dela länken via WhatsApp, Discord eller direktmeddelande. Upp till 20 spelare kan ansluta.' },
                  { '@type': 'HowToStep', name: 'Hitta ord i realtid', text: 'Alla spelare ser samma rutnät samtidigt. Klicka eller dra för att skapa ord — längre ord ger fler poäng. Match varar 2-3 minuter.' },
                ],
              },
            ],
          }),
        }}
      />

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <TopBackLink className="mb-4" />
        <h1 className="mb-6 font-neo-display text-4xl font-bold leading-tight sm:text-5xl">
          Multiplayer Ordspel Online - Spela Boggle & Scrabble på Svenska
        </h1>

        <p className="mb-8 text-lg leading-relaxed text-neo-gray-200">
          Välkommen till LexiClash, det ultimata gratis multiplayer ordspelet online på svenska! Om du älskar Boggle,
          Scrabble eller Wordfeud kommer vår realtidsplattform att kombinera det bästa av varje spel. Skapa ett rum,
          skicka en länk till dina vänner och tävla i spännande ordkamper direkt. Med 10 000+ ord i vår svenska ordbok,
          ingen nedladdning krävs och helt gratis tillgång, LexiClash är ditt ultimata ordspel för rolig tävling.
        </p>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">
            Varför spela LexiClash Multiplayer?
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              'Realtids multiplayer-kamper med omedelbar poängåterkoppling',
              'Skapa rum och bjud in vänner via delbar länk',
              '10 000+ svenska ord i ordförrådet',
              'Flera spellägen (Boggle, Ordhjul, Letare, Blast)',
              'Dagliga utmaningar med poängtabeller',
              'Bosskamper med unika vändningar',
              'Helt gratis, ingen nedladdning behövs',
              'Spela på 5 språk (EN, HE, SV, JA, ES)',
            ].map((feature) => (
              <div
                key={feature}
                className="flex gap-3 rounded-neo border-3 border-neo-yellow bg-neo-navy/50 p-4 shadow-hard"
              >
                <span className="text-neo-yellow">✓</span>
                <p className="text-sm sm:text-base">{feature}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Link
            href={`/${locale}/multiplayer`}
            className="rounded-neo border-4 border-neo-yellow bg-neo-yellow px-6 py-3 font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg sm:px-8 sm:py-4"
          >
            Börja Spela Multiplayer
          </Link>
          <Link
            href={`/${locale}/singleplayer`}
            className="rounded-neo border-4 border-neo-cyan bg-transparent px-6 py-3 font-bold text-neo-cyan shadow-hard transition-all hover:bg-neo-cyan/10 sm:px-8 sm:py-4"
          >
            Spela Ensam
          </Link>
          <Link
            href={`/${locale}/daily`}
            className="rounded-neo border-4 border-neo-pink bg-transparent px-6 py-3 font-bold text-neo-pink shadow-hard transition-all hover:bg-neo-pink/10 sm:px-8 sm:py-4"
          >
            Daglig Utmaning
          </Link>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">Vanliga Frågor</h2>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <details
                key={`faq-${idx}-${faq.q}`}
                className="group rounded-neo border-3 border-neo-gray-400 bg-neo-navy/50 shadow-hard"
              >
                <summary className="flex cursor-pointer items-center justify-between px-6 py-4 font-bold">
                  <span>{faq.q}</span>
                  <span className="text-neo-yellow transition-transform group-open:rotate-180">▼</span>
                </summary>
                <div className="border-t border-neo-gray-400 px-6 py-4 text-neo-gray-200">{faq.a}</div>
              </details>
            ))}
          </div>
        </section>

        <section className="mb-12 max-w-none">
          <h2 className="font-neo-display text-2xl font-bold sm:text-3xl">Om LexiClash Multiplayer</h2>
          <p className="mt-4 text-neo-gray-200">
            LexiClash revolutionerar onlinespel med ord genom att kombinera det strategiska djupet av Scrabble,
            realtidshastigheten av Boggle och pussel-nöjet av Wordle. Vår plattform är utformad för ordentusiaster,
            casual gamers och tävlande spelare.
          </p>
          <p className="mt-4 text-neo-gray-200">
            Spela multiplayer ordspel online med vänner, familj eller främlingar världen över. Oavsett om du vill ha en
            snabb 15-minuters match eller en längre tävlingssession, LexiClash passar alla spelstillar. Det intuitiva
            gränssnittet fungerar på både dator och mobil, så att du kan spela ordspel var som helst, när som helst.
          </p>
          <p className="mt-4 text-neo-gray-200">
            Tävla på globala poängtabeller, tjäna prestationer och lås upp specialspellägen. Våra bosskamper lägger till
            en unik PvE-vändning där spelare samarbetar mot AI-motståndare. Dagliga utmaningar erbjuder nya pussel
            varje dag med exklusiva belöningar.
          </p>
          <p className="mt-4 text-neo-gray-200">
            Utöver multiplayer hittar du{' '}
            <Link href={`/${locale}/daily-word-wheel`} className="text-neo-cyan hover:underline">
              dagligt ordhjul
            </Link>
            {' '}— snurra hjulet och hitta alla ord — och{' '}
            <Link href={`/${locale}/daily`} className="text-neo-cyan hover:underline">
              Ordjakt
            </Link>
            {' '}— gissa det dolda ordet på 10 försök. Båda är gratis, nya pussel varje dag.
          </p>
        </section>
        <NativePageEnhancements locale={locale} />
      </div>
    </main>
  );
}
