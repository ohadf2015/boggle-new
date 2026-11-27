import type { Metadata } from 'next';
import Link from 'next/link';
import {
  CompareTable,
  CtaBand,
  FaqList,
  LandingButton,
  LandingHero,
  LandingPage,
  LinkPills,
  Mark,
  Section,
  Steps,
  TileGrid,
} from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';
import { MULTIPLAYER_FAQ, MULTIPLAYER_HEADING, MULTIPLAYER_INTRO, MULTIPLAYER_STEPS } from './multiplayer';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_URL = `${BASE_URL}/en/scrabble-alternative-online`;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isTargetLocale = locale === 'en';

  return {
    title: 'Scrabble Alternative Online — Free Multiplayer | LexiClash',
    description: 'Free Scrabble-alternative online — real-time multiplayer, 2–20 players. No app, no signup. Compare LexiClash vs Scrabble GO →',
    keywords: 'scrabble alternative online, scrabble online free, scrabble alternative free, online scrabble alternative no download, scrabble online multiplayer free, scrabble like word game online, word game like scrabble online, online word battle scrabble alternative, scrabble browser game free',
    openGraph: {
      title: 'Scrabble Alternative Online — Free, Real-Time, 2-20 Players | LexiClash',
      description: 'A real-time Scrabble alternative: same word-grid strategy, no turn-waiting. 2-20+ players in one browser room. No download.',
      url: PAGE_URL,
      type: 'website',
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'LexiClash — Scrabble Alternative Online' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Scrabble Alternative Online — Free & Real-Time | LexiClash',
      description: 'Free Scrabble-alternative word game online. Browser-based, 2-20 players, no download.',
      images: [`${BASE_URL}/og-image-en.webp`],
    },
    alternates: {
      canonical: PAGE_URL,
      languages: {
        'x-default': PAGE_URL,
        en: PAGE_URL,
      },
    },
    robots: isTargetLocale
      ? { index: true, follow: true }
      : { index: false, follow: true },
  };
}

/** Growth Radar rec 5893 — H2 + FAQPage Question must match this query verbatim. */
const SCRABLE_ON_LINE_QUESTION = 'scrable on line';
const SCRABLE_ON_LINE_ANSWER =
  'Looking for scrable on line? That query is a common misspelling of Scrabble online. LexiClash is a free browser word game: same letter-grid strategy, played live instead of in turns. Two to twenty players share one board for two to three minutes, and nothing installs. Open a room, send the link, play on any phone or laptop.';

/** Growth Radar rec 11099 — Bing grounds this query but cited other domains. Answer must quote standalone. */
const NOT_ON_POGO_QUESTION = 'Where can I play Scrabble online, not on Pogo?';
const NOT_ON_POGO_ANSWER =
  'LexiClash is a free Scrabble-style word game that runs in any browser, with no Pogo account, no Club Pogo subscription and nothing to download. Two to twenty players share one grid, and a round takes about three minutes. For official Scrabble rules, use the Scrabble GO app; Woogles.io hosts the classic crossword board game in a browser.';

const faqs = [
  {
    q: NOT_ON_POGO_QUESTION,
    a: NOT_ON_POGO_ANSWER,
  },
  {
    q: SCRABLE_ON_LINE_QUESTION,
    a: SCRABLE_ON_LINE_ANSWER,
  },
  {
    q: 'What is the best free Scrabble alternative online?',
    a: "LexiClash is the best free Scrabble alternative online if you want real-time multiplayer instead of turn-based: 2-20+ players share one letter grid simultaneously, the match wraps in 2-3 minutes, and there's no app install or signup. Scrabble GO still owns official rules and the brand; LexiClash trades that for speed, group size, and zero ads mid-match.",
  },
  {
    q: 'How is LexiClash different from official Scrabble?',
    a: 'Official Scrabble (and Scrabble GO) is turn-based on a 15×15 board where players place tiles for letter-multiplier scores. LexiClash uses a smaller letter grid where every player searches for valid words at the same time, scored by length and uniqueness. Both are word-strategy games — LexiClash is built for real-time group play, Scrabble for one-on-one tile placement.',
  },
  {
    q: 'Is there a free online Scrabble alternative with no download?',
    a: 'Yes. LexiClash runs entirely in any modern browser — desktop, phone, or tablet. No app store install, no account creation, no email required. Open the link, create a room, share the code, play. It also installs as a Progressive Web App if you want a home-screen icon.',
  },
  MULTIPLAYER_FAQ,
  {
    q: 'What languages are supported?',
    a: 'Six full dictionaries: English, Spanish, Swedish, Japanese, Hebrew (with right-to-left support), and Russian. Useful for ESL classrooms, language learners, and mixed-language friend groups who want a Scrabble-style word game in their native language.',
  },
  {
    q: 'Are there ads or pay-to-win mechanics?',
    a: 'A small banner sometimes appears outside of matches; that is it. No interstitial pop-ups mid-game and no paid power-ups that buy wins. Rewarded videos exist for cosmetic currency only, never competitive advantage.',
  },
];

const faqJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
});

const videoGameJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'VideoGame',
  name: 'LexiClash',
  alternateName: ['LexiClash Word Battle', 'LexiClash Scrabble Alternative'],
  url: PAGE_URL,
  description: 'A free real-time multiplayer word game and Scrabble alternative. 2-20+ players share one letter grid simultaneously, search for valid words, scored by length and uniqueness. Browser-based, no download, no signup.',
  image: `${BASE_URL}/og-image-en.webp`,
  genre: ['Word Game', 'Puzzle', 'Multiplayer', 'Strategy', 'Casual'],
  gamePlatform: ['Web Browser', 'iOS', 'Android', 'PWA'],
  playMode: ['MultiPlayer', 'SinglePlayer'],
  numberOfPlayers: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 20 },
  applicationCategory: 'GameApplication',
  operatingSystem: 'Any (Web Browser)',
  inLanguage: ['en', 'he', 'sv', 'ja', 'es', 'ru'],
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock', url: `${BASE_URL}/en/multiplayer` },
  publisher: { '@type': 'Organization', name: 'LexiClash', url: BASE_URL },
});

const howToJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to Play a Free Scrabble Alternative Online',
  description: 'Start a free real-time multiplayer word battle in your browser in 30 seconds — no download, no signup.',
  totalTime: 'PT30S',
  step: [
    { '@type': 'HowToStep', name: 'Open LexiClash multiplayer', text: 'Visit lexiclash.live/en/multiplayer in any browser.', url: `${BASE_URL}/en/multiplayer` },
    { '@type': 'HowToStep', name: 'Create or join a room', text: 'Create a room to get a code, or paste a friend\'s code. Share the link or QR with up to 20 players.' },
    { '@type': 'HowToStep', name: 'Find words simultaneously', text: 'Everyone plays the same letter grid at once. Connect adjacent letters to form valid words.' },
    { '@type': 'HowToStep', name: 'Highest score wins', text: 'After 2-3 minutes, the highest scorer wins. Longer words and unique finds score more points.' },
  ],
});

const breadcrumbJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/en` },
    { '@type': 'ListItem', position: 2, name: 'Compare Word Games', item: `${BASE_URL}/en/best-online-word-games` },
    { '@type': 'ListItem', position: 3, name: 'Scrabble Alternative Online', item: PAGE_URL },
  ],
});

const compareRows: ReadonlyArray<readonly [string, string, string]> = [
  ['Gameplay style', 'Real-time (everyone plays at once)', 'Turn-based tile placement'],
  ['Avg match duration', '2-3 minutes', '15-30 min per game'],
  ['Players per room', '2-20+', '2-4'],
  ['Browser play', 'Yes (no install)', 'No (app required)'],
  ['Mid-game ads', 'None', 'Frequent in Scrabble GO'],
  ['Sign-up required', 'No', 'Yes (Scopely account)'],
  ['Languages', '6 (EN · ES · SV · JA · HE · RU)', '1 (English primary)'],
  ['Daily challenges', 'Yes (Word Wheel + Word Hunt)', 'Limited events'],
  ['Pay-to-win mechanics', 'None', 'Boosts buy advantages'],
];

const ANSWER_CARD = 'flex flex-col items-start gap-4 rounded-neo-lg border-3 border-neo-black bg-neo-cream p-6 text-neo-black shadow-hard-xl sm:p-8';
const ANSWER_H2 = 'font-neo-display text-2xl font-bold leading-tight';

export default async function ScrabbleAlternativeOnlinePage({ params }: PageProps) {
  const { locale } = await params;
  return (
    <LandingPage locale={locale} play={{ href: '/en/multiplayer', label: 'Play free now' }}>
      <script id="ld-faq" type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJsonLd }} />
      <script id="ld-videogame" type="application/ld+json" dangerouslySetInnerHTML={{ __html: videoGameJsonLd }} />
      <script id="ld-howto" type="application/ld+json" dangerouslySetInnerHTML={{ __html: howToJsonLd }} />
      <script id="ld-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }} />

      <LandingHero
        eyebrow="★ Free · Real-Time · 2-20 Players ★"
        title={
          <>
            The free <Mark tone="pink">Scrabble</Mark>
            <br />
            alternative — online &amp; live.
          </>
        }
        lead={
          <>
            LexiClash is a free, browser-based <strong className="font-bold text-neo-white">Scrabble alternative</strong>: same word-strategy depth, none of the turn-waiting. 2-20+ players share one letter grid simultaneously, the match wraps in 2-3 minutes, and nothing ever installs. No signup, no app store, no pay-to-win.
          </>
        }
        actions={
          <>
            <LandingButton href="/en/multiplayer">Play free now →</LandingButton>
            <LandingButton href="/en/best-online-word-games" variant="secondary">
              Compare 9 word games
            </LandingButton>
          </>
        }
        art={LANDING_ART.duel('Two LexiClash mascots facing off over a board of letter tiles')}
        artTone="pink"
      />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section className={ANSWER_CARD}>
          <h2 className={ANSWER_H2}>{NOT_ON_POGO_QUESTION}</h2>
          <p className="leading-relaxed">{NOT_ON_POGO_ANSWER}</p>
          <LandingButton href="/en/multiplayer" variant="dark">Start a free room →</LandingButton>
        </section>
        <section className={ANSWER_CARD}>
          <h2 className={ANSWER_H2}>{SCRABLE_ON_LINE_QUESTION}</h2>
          <p className="leading-relaxed">{SCRABLE_ON_LINE_ANSWER}</p>
          <LandingButton href="/en/multiplayer" variant="dark">Play free now →</LandingButton>
        </section>
      </div>

      <Section id="online-multiplayer" title={MULTIPLAYER_HEADING} intro={MULTIPLAYER_INTRO}>
        <Steps items={MULTIPLAYER_STEPS.map((step) => ({ title: step.title, body: step.body }))} />
      </Section>

      <Section title="LexiClash vs Scrabble GO at a glance">
        <CompareTable
          columns={['Feature', 'LexiClash', 'Scrabble GO']}
          rows={compareRows.map((r) => [...r])}
          caption="Comparison reflects publicly available product details as of 2026. LexiClash is an independent word game; Scrabble® is a trademark of Hasbro / Mattel."
        />
      </Section>

      <Section title="Why play a Scrabble alternative?">
        <TileGrid
          columns={4}
          items={[
            { title: 'No turn waiting', body: 'Async Scrabble is great for one move per day. Real-time is great for game night. Pick the right tool.' },
            { title: 'Group-scale built in', body: 'Scrabble caps at 4 players. LexiClash goes to 20+ in one room — parties, classrooms, family nights.' },
            { title: 'Browser, not app', body: 'Send a URL. Friends join from any device — phone, laptop, tablet. No app store gate, no IT approval at work.' },
            { title: '6 languages with full dictionaries', body: 'English, Spanish, Swedish, Japanese, Hebrew (RTL), Russian. Each with 10,000+ valid words verified against native dictionaries.' },
          ]}
        />
      </Section>

      <Section title="FAQ">
        <FaqList items={faqs} />
      </Section>

      <CtaBand
        tone="lime"
        title="Ready to play a real-time Scrabble alternative?"
        body="One link, 2-20 friends, 2 minutes per match. Always free to play."
        actions={<LandingButton href="/en/multiplayer" variant="dark">Start a free room →</LandingButton>}
        art={LANDING_ART.trophy('')}
      />

      <Section title="More from LexiClash">
        <LinkPills
          items={[
            { href: '/en/free-multiplayer-word-game', label: 'Multiplayer word game online' },
            { href: '/en/words-with-friends-alternative', label: 'Words With Friends alternative' },
            { href: '/en/best-online-word-games', label: '9 best word games (compare)' },
            { href: '/en/blog/boggle-vs-scrabble', label: 'Boggle vs Scrabble' },
            { href: '/en/play-boggle-online-free', label: 'Play Boggle online free' },
          ]}
        />
      </Section>
    </LandingPage>
  );
}
