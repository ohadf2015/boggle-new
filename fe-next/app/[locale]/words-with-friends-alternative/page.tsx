import type { Metadata } from 'next';
import Image from 'next/image';
import {
  CompareTable,
  CtaBand,
  FaqList,
  LandingButton,
  LandingHero,
  LandingPage,
  Mark,
  Section,
  StatStrip,
  Steps,
  TileGrid,
} from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isTargetLocale = locale === 'en';
  const pageUrl = `${BASE_URL}/en/words-with-friends-alternative`;

  return {
    title: 'Words With Friends Alternative — Free Online | LexiClash',
    description: 'Free Words With Friends alternative: everyone plays the same board at once, no waiting days for a move. 2-20+ players, no download, no signup.',
    keywords: 'words with friends multiplayer free online, words with friends alternative, free word game with friends online, online multiplayer word games like words with friends, word games multiplayer free, word battle online free, word game like words with friends, online word games with friends free, web word games with friends, spell game with friends online, free multiplayer word games',
    openGraph: {
      title: 'Words With Friends Alternative — Real-Time Multiplayer | LexiClash',
      description: 'Free multiplayer word game — 2-20 players play simultaneously, not turn-based. 8 game modes, no download.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'LexiClash - Words With Friends Alternative' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Words With Friends Alternative — Free Online | LexiClash',
      description: 'Real-time multiplayer word battles — not turn-based. 8 modes, free, no download!',
      images: [`${BASE_URL}/og-image-en.webp`],
    },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': pageUrl,
        en: pageUrl,
      },
    },
    robots: isTargetLocale ? { index: true, follow: true } : { index: false, follow: true },
  };
}

const faqs = [
  {
    q: 'Is LexiClash like Words With Friends?',
    a: "LexiClash is a free multiplayer word game like Words With Friends, with one big difference: every player searches the same letter grid simultaneously, in real-time, instead of taking turns. A full match takes 2-3 minutes instead of waiting days for your friend's next move. It's the same social-word-game itch, scratched faster.",
  },
  {
    q: 'Is there a real-time alternative to Words With Friends that works without an app?',
    a: "Yes, LexiClash. It runs in the browser on your phone or computer, so there is nothing to install. Instead of taking turns over days, everyone plays the same letter grid at the same time and a round is over in about three minutes. Open a room, send your friends the link, and you can be playing in under a minute.",
  },
  {
    q: 'Can I play word games with friends free online?',
    a: 'Yes. LexiClash is 100% free to play online with friends — no download, no signup, no pay-to-win. Create a room, share the 6-character code or QR, and your friends are in the game in seconds. Works in any modern browser on phone, tablet, or laptop.',
  },
  {
    q: "What's the best free Words With Friends multiplayer alternative?",
    a: 'LexiClash is the best free alternative if you want real-time gameplay (no turn waiting), more than 2 players (we support 2-20+ in one room), no app download, daily challenges, adventure mode, and 5 language support. Words With Friends is great if you specifically want async turn-based; LexiClash is built for everything else.',
  },
  {
    q: 'How many players can I play with at once?',
    a: 'Up to 20+ players can join a single LexiClash room. That makes it the only free word game built for parties, family game nights, classrooms, and team building — Words With Friends maxes out at 2 players per match.',
  },
  {
    q: 'Do I need to download an app?',
    a: 'No. LexiClash runs entirely in your browser. Works on iPhone, Android, tablet, laptop, and desktop. You can install it as a Progressive Web App (PWA) for an app-like experience, but it is never required.',
  },
  {
    q: 'Are there online multiplayer word games like Hanging With Friends?',
    a: 'LexiClash captures the competitive spirit of Hanging With Friends with richer gameplay. Instead of guessing letters, you find words on a grid in real-time against friends. Plus daily challenges, adventure mode with boss battles, and brain training drills — all multiplayer-ready, all free.',
  },
  {
    q: 'Is LexiClash free or pay-to-win?',
    a: 'Completely free, zero pay-to-win. There are no paid boosts that buy wins. Skill decides the leaderboard. Optional rewarded videos let you earn in-game currency for cosmetics, never competitive advantage.',
  },
  {
    q: 'What languages are supported?',
    a: 'LexiClash supports 6 full dictionaries: English, Hebrew (with full RTL), Swedish, Japanese, Spanish, and Russian. Multilingual rooms work — useful for ESL classrooms, language learners, and mixed-language friend groups.',
  },
];

const faqJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.q,
    acceptedAnswer: { '@type': 'Answer', text: faq.a },
  })),
});

const videoGameJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'VideoGame',
  name: 'LexiClash',
  alternateName: ['LexiClash Word Battle', 'LexiClash Multiplayer Word Game'],
  url: 'https://www.lexiclash.live/en/words-with-friends-alternative',
  description: 'Free real-time multiplayer word game. A browser-based alternative to Words With Friends — 2 to 20+ players play the same letter grid simultaneously. 8 game modes including real-time grid battles, Wordle-style daily survival, word wheel, adventure mode with boss battles, blast cascading, brain drills, vocabulary duels, and party games. No download, no signup, no pay-to-win.',
  image: 'https://www.lexiclash.live/og-image-en.webp',
  genre: ['Word Game', 'Puzzle', 'Multiplayer', 'Casual', 'Educational'],
  gamePlatform: ['Web Browser', 'iOS', 'Android', 'PWA'],
  playMode: ['MultiPlayer', 'SinglePlayer', 'CoOp'],
  numberOfPlayers: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 20 },
  applicationCategory: 'GameApplication',
  operatingSystem: 'Any (Web Browser)',
  inLanguage: ['en', 'he', 'sv', 'ja', 'es', 'ru'],
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock',
    url: 'https://www.lexiclash.live/en/multiplayer',
  },
  publisher: { '@type': 'Organization', name: 'LexiClash', url: 'https://www.lexiclash.live' },
});

const softwareAppJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'LexiClash — Words With Friends Alternative',
  applicationCategory: 'GameApplication',
  applicationSubCategory: 'Word Game',
  operatingSystem: 'Web, iOS, Android',
  url: 'https://www.lexiclash.live/en/words-with-friends-alternative',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  featureList: [
    'Real-time multiplayer (2-20+ players, not turn-based)',
    'No download or app install required',
    'Free to play with no pay-to-win',
    '6 languages with full dictionaries (English, Hebrew RTL, Swedish, Japanese, Spanish, Russian)',
    'Daily Wordle-style challenges and Word Wheel',
    'Adventure mode with boss battles',
    'Blast mode — fast-paced cascading word combos',
    'Brain training drills for vocabulary improvement',
    'Vocabulary duels for classrooms',
    'Browser-based and PWA installable',
  ],
});

const howToJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to Play Words With Friends Alternative Free Online',
  description: 'Start a free real-time multiplayer word battle in your browser in 30 seconds. No download, no signup.',
  totalTime: 'PT30S',
  step: [
    { '@type': 'HowToStep', name: 'Open LexiClash multiplayer', text: 'Visit lexiclash.live/en/multiplayer in any browser. No download, no signup, no app store.', url: 'https://www.lexiclash.live/en/multiplayer' },
    { '@type': 'HowToStep', name: 'Create or join a room', text: 'Click Create Room to get a 6-character code, or paste a friend\'s code to join. Share the room link or QR code with up to 20 players.' },
    { '@type': 'HowToStep', name: 'Find words simultaneously', text: 'Everyone plays the same letter grid at the same time. Connect adjacent letters to form words. Longer words and faster combos score more points.' },
    { '@type': 'HowToStep', name: 'Highest score wins', text: 'After 2-3 minutes, the highest scorer wins. Words found by multiple players don\'t count for anyone — uniqueness is rewarded.' },
  ],
});

const breadcrumbJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.lexiclash.live/en' },
    { '@type': 'ListItem', position: 2, name: 'Compare Word Games', item: 'https://www.lexiclash.live/en/best-online-word-games' },
    { '@type': 'ListItem', position: 3, name: 'Words With Friends Alternative', item: 'https://www.lexiclash.live/en/words-with-friends-alternative' },
  ],
});

const stickerBadges = ['NO DOWNLOAD', 'NO SIGNUP', 'REAL-TIME', '2-20 PLAYERS', '6 LANGUAGES', 'NO PAY-TO-WIN', 'PLAY IN 30s', '8 GAME MODES'];

const stats = [
  { value: '8', label: 'Game Modes' },
  { value: '6', label: 'Languages' },
  { value: '20', label: 'Max Players/Room' },
  { value: '2-3min', label: 'Avg Match' },
];

const compareRows: ReadonlyArray<readonly [string, string, string]> = [
  ['Gameplay style', 'Real-time (everyone plays at once)', 'Turn-based (wait for friends)'],
  ['Avg match duration', '2-3 minutes', 'Days (asynchronous)'],
  ['Players per room', '2-20+', '2 only'],
  ['Price', 'Free, no pay-to-win', 'Free with ads + paid boosts'],
  ['App download', 'No (browser)', 'Yes (app store install)'],
  ['Languages', '6 (EN · HE · SV · JA · ES · RU)', '1 (English)'],
  ['Daily challenges', 'Yes (Word Wheel + Word Hunt)', 'No'],
  ['Adventure / story mode', 'Yes (boss battles)', 'No'],
  ['Group / party mode', 'Yes (20+ players, classrooms)', 'No'],
  ['Brain training drills', 'Yes (5+ drill types)', 'No'],
  ['Sign-up required', 'No', 'Yes (account)'],
  ['Cross-device room links', 'Yes (link + QR)', 'Limited (in-app only)'],
];

const gameModes = [
  { mode: 'Multiplayer Grid Battle', tag: 'CORE', desc: 'Real-time word brawl — 2-20+ players race the same grid for 2-3 min.', href: 'multiplayer', mascot: '/mascot/dj.webp', accent: 'pink' },
  { mode: 'Word Hunt Survival', tag: 'DAILY', desc: 'Wordle-meets-Boggle. Find a hidden 4-6 letter target in 10 attempts. Green/yellow feedback.', href: 'daily/word-hunt', mascot: '/mascot/explorer.webp', accent: 'cyan' },
  { mode: 'Daily Word Wheel', tag: 'DAILY', desc: 'One letter wheel, the whole world plays it. Use the center letter, climb the global leaderboard.', href: 'daily/word-wheel', mascot: '/mascot/scholar.webp', accent: 'lime' },
  { mode: 'Adventure', tag: 'STORY', desc: 'Roguelike word-crawler. Boss battles, abilities, loot. 5-8 rooms per run, 3 chapters.', href: 'adventure', mascot: '/mascot/knight.webp', accent: 'purple' },
  { mode: 'Blast', tag: 'JUICE', desc: 'Fast-paced cascading combos. Tiles fall, chains explode. The arcade-y one.', href: 'singleplayer', mascot: '/mascot/bomber.webp', accent: 'pink' },
  { mode: 'Brain Drills', tag: 'TRAIN', desc: 'Quick vocabulary workouts: anagrams, definitions, spelling sprints. 60-second sets.', href: 'brain', mascot: '/mascot/flexing.webp', accent: 'purple' },
  { mode: 'Vocabulary Duels', tag: 'EDU', desc: '1v1 student-vs-student vocabulary battles. Teacher dashboard + custom word lists.', href: 'education', mascot: '/mascot/encouraging.webp', accent: 'lime' },
  { mode: 'Party Games', tag: 'PARTY', desc: 'TV + phone hybrid. Wheel Rush, Connections, Codenames-style group games.', href: 'multiplayer', mascot: '/mascot/celebration.webp', accent: 'cyan' },
] as const;

const bestForBuckets = [
  { tag: 'PARTIES', title: 'Best for parties & groups', desc: '20+ players in one room. Share a QR, everyone plays at once. No app, no setup.', cta: 'Start a party room', href: 'multiplayer', color: 'pink' },
  { tag: 'CLASSROOMS', title: 'Best for classrooms', desc: 'Vocabulary duels, custom word lists, teacher dashboard. Free, no student accounts needed.', cta: 'Open Education', href: 'education', color: 'lime' },
  { tag: 'FAMILY', title: 'Best for family game night', desc: 'Phone + tablet + TV — same game everywhere. Works for ages 6+, all skill levels.', cta: 'Play with family', href: 'multiplayer', color: 'cyan' },
  { tag: 'ASYNC', title: 'Best as a Words With Friends replacement', desc: 'Daily challenges keep the streak alive. Fast 2-min sessions instead of days of waiting.', cta: 'Try Daily', href: 'daily', color: 'lime' },
  { tag: 'TEAMS', title: 'Best for remote team building', desc: 'Send a Slack link. 5-min icebreaker. No download, no IT approval, no friction.', cta: 'Spin up a room', href: 'multiplayer', color: 'pink' },
  { tag: 'ESL', title: 'Best for language learners', desc: '6 full dictionaries including Hebrew RTL and Japanese. Vocabulary practice in the target language.', cta: 'Pick a language', href: 'multiplayer', color: 'purple' },
] as const;

const whySwitch = [
  { title: 'No more waiting', desc: 'Everyone plays the grid simultaneously. Match takes 2-3 minutes, not 3 days.' },
  { title: '20+ players, not 2', desc: 'Built for groups: parties, classrooms, family nights, team building.' },
  { title: 'Zero downloads', desc: 'Open a browser. Send a link. Friends join instantly. No app store.' },
  { title: '6 languages', desc: 'English, Hebrew (RTL), Swedish, Japanese, Spanish, Russian — full dictionaries.' },
  { title: 'No pay-to-win', desc: 'Skill wins, not wallet. Optional cosmetics never affect competitive play.' },
  { title: '8 game modes, not 1', desc: 'Grid battles, Wordle survival, word wheel, adventure, blast, brain drills, duels, party games.' },
];

const TAG = 'rounded-full border-2 border-neo-black bg-neo-cream px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide';

export default async function WordsWithFriendsAlternativePage({ params }: PageProps) {
  const { locale } = await params;

  return (
    <LandingPage locale={locale} play={{ href: `/${locale}/multiplayer`, label: 'Play Multiplayer Free' }}>
      <script id="ld-faq" type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJsonLd }} />
      <script id="ld-videogame" type="application/ld+json" dangerouslySetInnerHTML={{ __html: videoGameJsonLd }} />
      <script id="ld-software" type="application/ld+json" dangerouslySetInnerHTML={{ __html: softwareAppJsonLd }} />
      <script id="ld-howto" type="application/ld+json" dangerouslySetInnerHTML={{ __html: howToJsonLd }} />
      <script id="ld-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }} />

      <LandingHero
        eyebrow="★ Free · Real-Time · 8 Modes ★"
        title={
          <>
            The free <Mark tone="pink">Words</Mark>
            <br />
            <Mark>With Friends</Mark>
            <br />
            alternative — live.
          </>
        }
        lead={
          <>
            Stop waiting for turns. LexiClash is the browser-based word game where 2-20+ friends play the same grid
            <em className="not-italic font-bold text-neo-lime"> at the same time</em>. Real-time, real-fast, really free.
            Eight game modes, six languages, zero downloads.
          </>
        }
        actions={
          <>
            <LandingButton href={`/${locale}/multiplayer`}>▶ Play Multiplayer Free</LandingButton>
            <LandingButton href={`/${locale}/daily`} variant="secondary">
              ★ Daily Challenge
            </LandingButton>
          </>
        }
        art={LANDING_ART.friends('Two LexiClash mascots high-fiving over a pile of letter tiles')}
      >
        <p className="text-xs font-bold uppercase tracking-wide text-neo-white/70">
          No download · No signup · 30 sec · 5 min · Streak rewards · <span className="text-neo-lime">● live now</span> · 8 game modes · 6 languages · 20+ players/room
        </p>
        <ul className="flex flex-wrap gap-2">
          {stickerBadges.map((b) => (
            <li key={b} className={`${TAG} text-neo-black`}>
              {b}
            </li>
          ))}
        </ul>
      </LandingHero>

      <StatStrip items={stats} />

      <Section
        title="LexiClash vs Words With Friends"
        intro="Side-by-side. Honest. Both are good — they're just built for different things."
      >
        <CompareTable columns={['Feature', 'LexiClash', 'Words With Friends']} rows={compareRows.map((r) => [...r])} />
      </Section>

      <Section
        title="8 modes, not 1."
        intro={
          <>
            <span className="mb-1 block font-mono text-xs uppercase tracking-wide text-neo-white/60">{'// way more than tile-placement'}</span>
            Words With Friends gives you one mode: turn-based tile placement. LexiClash gives you eight — pick the format that fits the moment.
          </>
        }
      >
        <TileGrid
          columns={4}
          items={gameModes.map((m) => ({
            href: `/${locale}/${m.href}`,
            tone: m.accent,
            icon: (
              <span className="mb-1 flex items-center justify-between gap-2">
                <span className="relative block h-14 w-14">
                  <Image src={m.mascot} alt="" fill sizes="56px" className="object-contain" />
                </span>
                <span className={TAG}>{m.tag}</span>
              </span>
            ),
            title: m.mode,
            body: (
              <>
                {m.desc}
                <span className="mt-3 block font-neo-display font-bold">Play →</span>
              </>
            ),
          }))}
        />
      </Section>

      <Section title="Best for your moment.">
        <TileGrid
          variant="paper"
          items={bestForBuckets.map((b) => ({
            href: `/${locale}/${b.href}`,
            tone: b.color,
            icon: <span className="text-xs font-bold uppercase tracking-wide text-neo-black/60">{b.tag}</span>,
            title: b.title,
            body: (
              <>
                {b.desc}
                <span className="mt-3 block font-neo-display font-bold">{b.cta} →</span>
              </>
            ),
          }))}
        />
      </Section>

      <section className="flex flex-col gap-6 rounded-neo-lg border-3 border-neo-black bg-neo-pink p-6 text-neo-black shadow-hard-xl sm:p-10">
        <h2 className="font-neo-display text-2xl font-bold leading-tight sm:text-3xl">Why players switch.</h2>
        <ul className="grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {whySwitch.map((item) => (
            <li key={item.title} className="flex flex-col gap-1 border-t-3 border-neo-black pt-3">
              <h3 className="font-neo-display text-lg font-bold">{item.title}</h3>
              <p className="leading-relaxed">{item.desc}</p>
            </li>
          ))}
        </ul>
      </section>

      <Section title="30 seconds to your first match." intro="No signup. No app store. No tutorial wall.">
        <Steps
          items={[
            { title: 'Open lexiclash.live', body: 'Any browser, any device. No download. No account.' },
            { title: 'Create or join', body: 'Get a 6-character room code. Share via link or QR. Friends drop in instantly.' },
            { title: 'Find words. Win.', body: 'Same grid for everyone. Race the clock and friends. Highest score wins.' },
          ]}
        />
      </Section>

      <Section title="Quick questions.">
        <FaqList items={faqs} />
      </Section>

      <Section title="More word games to compare.">
        <TileGrid
          variant="paper"
          columns={4}
          items={[
            { href: 'best-online-word-games', tag: 'GUIDE', title: 'Best Word Games 2026', desc: '9 games ranked, honest pros & cons' },
            { href: 'scrabble-alternative-online', tag: 'ALT', title: 'Scrabble Alternative Online', desc: 'Real-time, browser, 2-20 players' },
            { href: 'lexiclash-vs-wordle', tag: 'VS', title: 'LexiClash vs Wordle', desc: 'Unlimited play vs 1 puzzle/day' },
            { href: 'lexiclash-vs-scrabble', tag: 'VS', title: 'LexiClash vs Scrabble', desc: 'Real-time vs turn-based' },
            { href: 'play-boggle-online-free', tag: 'PLAY', title: 'Free Boggle Online', desc: 'No download, instant play' },
          ].map((c) => ({
            href: `/${locale}/${c.href}`,
            icon: <span className="text-xs font-bold uppercase tracking-wide text-neo-black/60">{c.tag}</span>,
            title: c.title,
            body: c.desc,
          }))}
        />
      </Section>

      <CtaBand
        tone="yellow"
        title={
          <>
            Stop waiting for turns.
            <br />
            Start playing.
          </>
        }
        body="Open the browser. Send a link. Friends join. Game starts in 30 seconds. The free Words With Friends alternative you actually finish before bedtime."
        actions={
          <>
            <LandingButton href={`/${locale}/multiplayer`}>▶ Play Multiplayer Free</LandingButton>
            <LandingButton href={`/${locale}/daily`} variant="secondary">
              ★ Daily Challenge
            </LandingButton>
          </>
        }
        art={LANDING_ART.trophy('')}
      />
    </LandingPage>
  );
}
