import type { Metadata } from 'next';
import { ComparisonLanding } from '@/components/landing/comparison/ComparisonLanding';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';
  // Body is English-only. Canonical always points to /en/ to avoid cross-locale duplicate-content flags.
  const pageUrl = `${BASE_URL}/en/lexiclash-vs-puzzly-words`;

  return {
    title: 'LexiClash vs Puzzly Words — Which Real-Time Word Game Wins? | LexiClash',
    description: 'LexiClash vs Puzzly Words compared: simultaneous multiplayer, 30+ game modes, 6 languages vs Scrabble-style rack gameplay. Free comparison for serious word game players.',
    keywords: 'lexiclash vs puzzly words, puzzly words alternative, real-time multiplayer word game, word games like puzzly, simultaneous word game, free multiplayer word game, best word game 2026, puzzly words vs lexiclash',
    openGraph: {
      title: 'LexiClash vs Puzzly Words — Which Word Game Wins in 2026?',
      description: 'Rack-building meets simultaneous racing. Compare features, gameplay, and why serious word gamers choose LexiClash.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'LexiClash vs Puzzly Words Comparison' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LexiClash vs Puzzly Words — Which Is Better?',
      description: 'Real-time multiplayer, 30+ modes, 6 languages. Full comparison inside.',
      images: [`${BASE_URL}/og-image-en.webp`],
    },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': `${BASE_URL}/en/lexiclash-vs-puzzly-words`,
        en: `${BASE_URL}/en/lexiclash-vs-puzzly-words`,
      },
    },
    robots: { index: isEnglish, follow: true },
  };
}

// Static FAQ data — all values are hardcoded string literals, safe for JSON-LD serialization
const faqs = [
  {
    q: 'How is LexiClash different from Puzzly Words?',
    a: 'Puzzly Words is a real-time, simultaneous multiplayer game where players build 1-3 words per round from a 16-letter rack — think fast-paced Scrabble with a 60-second clock. LexiClash is grid-based letter finding: you race to connect adjacent letters on a shared board, unlimited words per round. Same energy (real-time, competitive, tense), completely different mechanics. Both are addictive; they just scratch different itches.',
  },
  {
    q: 'Can you play LexiClash solo?',
    a: 'Yes, extensively. Multiplayer is huge, but LexiClash also has a full adventure mode with 100+ levels and boss fights, five dedicated brain-training drill modes, daily challenges with a global leaderboard, and solo classic games. Puzzly Words is multiplayer-first — solo play exists but isn\'t the focus.',
  },
  {
    q: 'Does LexiClash work on mobile?',
    a: 'Yep, web + Android. Puzzly Words is iOS + Android + web. Both work on phones, tablets, and desktop. LexiClash runs in your browser; Puzzly Words has native apps. No download needed for LexiClash.',
  },
  {
    q: 'Which game is faster?',
    a: 'Puzzly Words: 60 seconds per round. LexiClash: 60-180 seconds depending on the mode. Both are quick and intense. LexiClash gives you a few more seconds to hunt if you want, but the vibe is the same — real-time racing.',
  },
  {
    q: 'Is there a single-player experience?',
    a: 'Puzzly Words leans hard into multiplayer. Solo is possible but minimal. LexiClash splits its identity: multiplayer, adventure campaigns, brain training, and daily challenges all get serious love. If you want a game that\'s great solo AND with friends, LexiClash wins. If you just want multiplayer thrills, Puzzly Words is laser-focused.',
  },
  {
    q: 'What about languages and accessibility?',
    a: 'LexiClash: 6 languages (English, Hebrew with RTL support, Swedish, Japanese, Spanish), WCAG 2.1 AA accessibility standards. Puzzly Words is English-only as far as we know. If you play in Hebrew or other languages, LexiClash is the only choice.',
  },
];

// Static JSON-LD for FAQ rich results — hardcoded content only, no user input
const faqJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.q,
    acceptedAnswer: { '@type': 'Answer', text: faq.a },
  })),
});

export default async function LexiClashVsPuzzlyWordsPage({ params }: PageProps) {
  const { locale } = await params;

  const h1 = 'LexiClash vs Puzzly Words — Racing for Words';
  const intro = [
    'Both are real-time multiplayer word games. Both are intense, competitive, and weirdly addictive. But they play very differently. Puzzly Words puts a 16-letter rack in your hands and asks you to build words fast — it\'s Scrabble at 60 mph. LexiClash drops you on a grid and says find words by connecting adjacent letters, race everyone else simultaneously. Same vibe, different beast. Here\'s the full breakdown so you can pick your poison.',
  ];

  const quickCtas = [
    { href: `/${locale}/multiplayer`, label: 'Try LexiClash Free', variant: 'lime' as const },
    { href: `/${locale}/adventure`, label: 'Adventure Mode', variant: 'cyan' as const },
    { href: `/${locale}/brain`, label: 'Brain Drills', variant: 'purple' as const },
  ];

  const competitorName = 'Puzzly Words';

  const comparisonRows: [string, string, string][] = [
    ['Game type', 'Grid word-finding, simultaneous', 'Rack word-building, simultaneous'],
    ['Round length', '60-180 sec (varies by mode)', '60 sec'],
    ['Game modes', '30+', '1 main mode'],
    ['Multiplayer', 'Real-time, 2-20+ players', 'Real-time, 2-4 players'],
    ['Solo gameplay', 'Extensive (adventure, drills, daily)', 'Minimal'],
    ['Languages', '5 (EN, HE, SV, JA, ES)', '1 (English)'],
    ['RTL support', 'Yes (Hebrew)', 'No'],
    ['Platforms', 'Web + Android', 'iOS + Android + Web'],
    ['No download needed', 'Yes (browser only)', 'Yes + app available'],
    ['Free to play', 'Completely', 'Free with cosmetic purchases'],
    ['Accessibility (WCAG)', 'AA standard', 'Standard'],
    ['Daily challenges', 'Yes + leaderboard', 'Word of the day (varies)'],
    ['Account required', 'No', 'No'],
  ];

  const featuresTitle = 'What LexiClash Does That Puzzly Words Doesn\'t';
  const features = [
    { title: 'Adventure Campaign', desc: '100+ levels across 10 worlds with boss battles, upgrades, and loot. A full story mode that turns word hunting into a journey.' },
    { title: 'Brain Training Drills', desc: '5 dedicated modes (Memory Hunt, Combo Master, etc.) that sharpen specific cognitive skills. Gameplay designed around learning, not just winning.' },
    { title: 'Multilingual & RTL', desc: 'English, Hebrew (full RTL), Swedish, Japanese, Spanish. Play word games in your language. Hebrew speakers especially — this is the only option.' },
    { title: 'Unlimited Game Modes', desc: '30+ modes including Connections, Wordle-style daily, Blast (action), Party games, and more. Same core skill set, wildly different experiences.' },
    { title: 'Global Leaderboards', desc: 'Daily challenges with worldwide rankings. Same idea as Puzzly, but integrated into adventure progression and multiple game types.' },
    { title: 'No App Required', desc: 'Runs in your browser. Open a link, play immediately. Puzzly has apps, which is nice, but a web game is always faster to jump into.' },
  ];

  const gameplaySection = {
    title: 'The Gameplay Difference: Grid vs Rack',
    subsections: [
      {
        game: 'Puzzly Words (Rack Model)',
        description: 'You get a 16-letter rack. Your job: build 1, 2, or 3 words from those letters in 60 seconds. Overlapping counts (building off other words). Think Scrabble but with a timer screaming at you. It\'s tense and clever — you actually have to think about which words to build to set yourself up for the next turn.',
        accent: 'cyan' as const,
      },
      {
        game: 'LexiClash (Grid Model)',
        description: 'You get a grid of random letters (like Boggle). Your job: find as many words as possible by connecting adjacent letters. No limit on how many you can make. It\'s scanning + pattern recognition + speed. Less chess-like than Puzzly, more arcade-like. Anyone can find something, but finding everything takes practice.',
        accent: 'pink' as const,
      },
    ],
  };

  const moreComparisons = [
    { href: `/${locale}/lexiclash-vs-wordle`, title: 'LexiClash vs Wordle', subtitle: 'Unlimited vs 1 puzzle/day' },
    { href: `/${locale}/lexiclash-vs-scrabble`, title: 'LexiClash vs Scrabble GO', subtitle: 'No interruptions, no bots' },
    { href: `/${locale}/best-online-word-games`, title: 'Best Word Games 2026', subtitle: 'Complete comparison guide' },
  ];

  const finalCta = {
    title: 'So Which One?',
    body: [
      'Puzzly Words is a fantastic game. If you love the rack-building, word-placement puzzle of Scrabble and want it live with real players and a 60-second fuse, that\'s exactly what you get. Period.',
      'LexiClash is for people who want more variety: the same multiplayer rush, but also story campaigns, brain training, daily challenges, six languages, and the freedom to play as much as they want. It\'s bigger, deeper, and weird in the best way.',
      'Both are free. Both are real multiplayer. You honestly can\'t go wrong. But if you\'re scrolling this page, you probably want to see what LexiClash is about. Here\'s your shot.',
    ],
    href: `/${locale}/multiplayer`,
    label: 'Play LexiClash Now — Free, No Download',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: faqJsonLd }}
      />
      <ComparisonLanding
        locale={locale}
        showBackLink={true}
        h1={h1}
        intro={intro}
        quickCtas={quickCtas}
        competitorName={competitorName}
        comparisonRows={comparisonRows}
        featuresTitle={featuresTitle}
        features={features}
        featuresStyle="positive"
        gameplaySection={gameplaySection}
        faqs={faqs}
        moreComparisons={moreComparisons}
        finalCta={finalCta}
      />
    </>
  );
}
