import type { Metadata } from 'next';
import {
  CheckList,
  CtaBand,
  FaqList,
  LandingButton,
  LandingHero,
  LandingPage,
  Mark,
  Section,
  Steps,
  TileGrid,
  type LandingTone,
} from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';

const BASE_URL = 'https://www.lexiclash.live';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === 'en';
  const pageUrl = `${BASE_URL}/${locale}/word-craft-game`;
  return {
    title: 'WordCraft — Free Word Strategy Grid Game Online | LexiClash',
    description:
      'Play WordCraft free online — a word-strategy grid game where you build words, claim territory, and outscore rivals. No download, no signup. Card runs, Gem Hunt, and pass-and-play with friends.',
    keywords:
      'word strategy game, scrabble alternative online, word grid game free, crossword tile game, territory word game, word builder game, free word game no download, word game with friends',
    openGraph: {
      title: 'WordCraft — Build Words, Claim Territory, Win | LexiClash',
      description:
        'A word-strategy grid game with a territory-claiming twist. Free, instant, no download. Card runs, Gem Hunt, and pass-and-play.',
      locale: isEn ? 'en_US' : locale,
      type: 'website',
      url: pageUrl,
      siteName: 'LexiClash',
      images: [
        {
          url: `${BASE_URL}/og-wordcraft.webp`,
          width: 1200,
          height: 630,
          alt: 'WordCraft — Free Word Strategy Grid Game',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'WordCraft — Free Word Strategy Grid Game | LexiClash',
      description: 'Build words, claim territory, outscore rivals. Free online, no download.',
      images: [`${BASE_URL}/og-wordcraft.webp`],
    },
    alternates: {
      // Non-EN variants serve English copy → consolidate ranking signal onto the
      // EN canonical (hreflang below still advertises the locale URLs).
      canonical: isEn ? pageUrl : `${BASE_URL}/en/word-craft-game`,
      languages: {
        'x-default': `${BASE_URL}/en/word-craft-game`,
        en: `${BASE_URL}/en/word-craft-game`,
        he: `${BASE_URL}/he/word-craft-game`,
        sv: `${BASE_URL}/sv/word-craft-game`,
        ja: `${BASE_URL}/ja/word-craft-game`,
        es: `${BASE_URL}/es/word-craft-game`,
        ru: `${BASE_URL}/ru/word-craft-game`,
      },
    },
    // English is the indexed canonical; localized variants stay crawlable but
    // point hreflang back so we don't split ranking signal across thin dupes.
    robots: isEn ? { index: true, follow: true } : { index: false, follow: true },
  };
}

const faqs = [
  {
    q: 'What is WordCraft?',
    a: 'WordCraft is a free online word-strategy game. You place letter tiles on a grid to build words — like Scrabble — but with a twist: the tiles you play claim territory, and crossing an opponent’s word captures their cells. Highest score when the bag runs out wins.',
  },
  {
    q: 'Is WordCraft free to play with no download?',
    a: 'Yes. WordCraft runs instantly in your browser — no download, no signup, no app store. Open the page and start placing tiles.',
  },
  {
    q: 'How is WordCraft different from Scrabble?',
    a: 'WordCraft keeps the tile-and-word core but adds a territory layer (claim and capture cells), a heat/overdrive momentum system that rewards streaks, and extra modes: roguelike Card runs with power-ups, a Gem Hunt collection mode, and pass-and-play for two players on one device.',
  },
  {
    q: 'Can I play WordCraft with a friend?',
    a: 'Yes — Pass & Play mode is turn-based on a single device: you each take a turn, a privacy curtain hides your rack during the hand-off, and the higher score wins. Great for phones, tablets, and party/TV screens.',
  },
  {
    q: 'What is Card mode?',
    a: 'Card mode is a roguelike score-attack run: play timed rounds, then pick one power card from three (vowel boosts, multipliers, extra tiles, and more) between rounds. Stack the right cards to chase a high run total.',
  },
  {
    q: 'What languages does WordCraft support?',
    a: 'WordCraft plays in English, Hebrew (right-to-left), Swedish, Japanese, Spanish, and Russian, each with its own tile distribution and dictionary.',
  },
];

const modes = [
  {
    name: 'Territory',
    tag: 'The signature twist',
    desc: 'Build words, claim the cells you play, and capture rivals by crossing their tiles. Ride the heat meter into overdrive.',
    href: 'word-craft',
    tone: 'purple' as LandingTone,
  },
  {
    name: 'Card Run',
    tag: 'Roguelike score-attack',
    desc: 'Timed rounds, then draft a power card between each. Stack vowel boosts, multipliers and extra tiles for a monster run total.',
    href: 'word-craft?mode=cards',
    tone: 'cyan' as LandingTone,
  },
  {
    name: 'Gem Hunt',
    tag: 'Collect & combo',
    desc: 'Words uncover buried gems. Chase rare crowns, fill your inventory, and bank a high collection score.',
    href: 'word-craft?mode=gems',
    tone: 'lime' as LandingTone,
  },
  {
    name: 'Pass & Play',
    tag: 'Turn-based with a friend',
    desc: 'Two players, one device, alternating turns with a privacy curtain on hand-off. Perfect for the couch or a party screen.',
    href: 'word-craft?vs=human',
    tone: 'pink' as LandingTone,
  },
];

const steps = [
  { n: '1', title: 'Open WordCraft', text: 'Tap Play — it loads instantly in your browser. No download, no signup.' },
  { n: '2', title: 'Build a word', text: 'Drag tiles from your rack onto the grid to spell a word. Premium cells and rare letters multiply your score.' },
  { n: '3', title: 'Claim & win', text: 'Your tiles claim territory; crossing a rival captures theirs. Outscore your opponent before the bag empties.' },
];

export default async function WordCraftGameLandingPage({ params }: PageProps) {
  const { locale } = await params;
  const play = (path: string) => `/${locale}/${path}`;

  const faqJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  });

  const howToJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to Play WordCraft',
    description: 'Start playing WordCraft free online in three steps.',
    totalTime: 'PT1M',
    step: steps.map((s) => ({
      '@type': 'HowToStep',
      name: s.title,
      text: s.text,
      url: `${BASE_URL}/${locale}/word-craft`,
    })),
  });

  const gameJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: 'WordCraft',
    url: `${BASE_URL}/${locale}/word-craft-game`,
    description:
      'A free online word-strategy grid game: build words, claim territory, and capture rivals. Includes roguelike Card runs, Gem Hunt, and pass-and-play.',
    genre: ['Word Game', 'Strategy', 'Puzzle'],
    gamePlatform: ['Web Browser', 'Android'],
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any',
    playMode: ['SinglePlayer', 'MultiPlayer'],
    inLanguage: ['en', 'he', 'sv', 'ja', 'es', 'ru'],
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    publisher: { '@type': 'Organization', name: 'LexiClash', url: BASE_URL },
  });

  return (
    <LandingPage locale={locale} play={{ href: play('word-craft'), label: 'Play free' }}>
      <script id="ld-wc-faq" type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJsonLd }} />
      <script id="ld-wc-howto" type="application/ld+json" dangerouslySetInnerHTML={{ __html: howToJsonLd }} />
      <script id="ld-wc-game" type="application/ld+json" dangerouslySetInnerHTML={{ __html: gameJsonLd }} />

      <LandingHero
        title={
          <>
            <Mark tone="purple">WordCraft</Mark> — build words, claim territory, win
          </>
        }
        lead="A free word-strategy grid game with a twist: every tile you play claims ground, and crossing a rival captures theirs. Play instantly — no download, no signup."
        actions={
          <>
            <LandingButton href={play('word-craft')}>Play free</LandingButton>
            <LandingButton href={play('word-craft?vs=human')} variant="secondary">
              Pass &amp; Play with a friend
            </LandingButton>
          </>
        }
        art={{
          src: '/word-craft/landing-hero.webp',
          alt: 'WordCraft: cream letter tiles spelling WORDCRAFT glowing in lime, cyan and pink on a dark navy board, with a drawstring sack spilling more tiles',
          width: 1280,
          height: 714,
        }}
        artTone="purple"
      >
        <p className="text-xs font-bold uppercase tracking-wide text-neo-white/70">★ No download · Play in 5s · Free to play · Claim territory · 6 languages · Word strategy</p>
      </LandingHero>

      <Section title="Four ways to play">
        <TileGrid
          columns={4}
          items={modes.map((m) => ({
            href: play(m.href),
            tone: m.tone,
            icon: <span className="text-xs font-bold uppercase tracking-wide">{m.tag}</span>,
            title: m.name,
            body: m.desc,
          }))}
        />
      </Section>

      <Section title="How to play">
        <Steps items={steps.map((s) => ({ title: s.title, body: s.text }))} />
      </Section>

      <Section title="Why players love it">
        <CheckList
          items={[
            'Scrabble-deep word play with a fresh territory twist',
            'Heat & overdrive momentum that rewards streaks',
            'Roguelike Card runs — draft power-ups between rounds',
            'Gem Hunt collection mode for combo hunters',
            'Pass-and-play turn-based on one device',
            'Plays in 6 languages, including Hebrew (RTL)',
          ]}
        />
      </Section>

      <Section title="FAQ">
        <FaqList items={faqs} />
      </Section>

      <CtaBand
        tone="lime"
        title="Ready to craft some words?"
        body="Free, instant, no download. Jump into a grid and start claiming territory."
        actions={
          <LandingButton href={play('word-craft')} variant="dark">
            Play WordCraft free
          </LandingButton>
        }
        art={LANDING_ART.trophy('')}
      />
    </LandingPage>
  );
}
