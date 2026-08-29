import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import Script from 'next/script';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isTargetLocale = locale === 'en';
  const pageUrl = `${BASE_URL}/en/words-with-friends-alternative`;

  return {
    title: 'Words With Friends Online Free — No Download | LexiClash',
    description: 'Play Words With Friends free online — real-time multiplayer for 2-20 players, not turn-based. No download, no signup. 8 game modes, start in 30 seconds →',
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
    q: 'Can I play word games with friends free online?',
    a: 'Yes. LexiClash is 100% free to play online with friends — no download, no signup, no pay-to-win. Create a room, share the 4-digit code or QR, and your friends are in the game in seconds. Works in any modern browser on phone, tablet, or laptop.',
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
    a: 'LexiClash supports 5 full dictionaries: English, Hebrew (with full RTL), Swedish, Japanese, and Spanish. Multilingual rooms work — useful for ESL classrooms, language learners, and mixed-language friend groups.',
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
    '5 languages with full dictionaries (English, Hebrew RTL, Swedish, Japanese, Spanish)',
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
    { '@type': 'HowToStep', name: 'Create or join a room', text: 'Click Create Room to get a 4-digit code, or paste a friend\'s code to join. Share the room link or QR code with up to 20 players.' },
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

const stickerBadges = ['NO DOWNLOAD', 'NO SIGNUP', 'REAL-TIME', '2-20 PLAYERS', '5 LANGUAGES', 'NO PAY-TO-WIN', 'PLAY IN 30s', '8 GAME MODES'];

const stats = [
  { value: '8', label: 'Game Modes', color: 'text-neo-lime' },
  { value: '5', label: 'Languages', color: 'text-neo-cyan' },
  { value: '20', label: 'Max Players/Room', color: 'text-neo-pink' },
  { value: '2-3min', label: 'Avg Match', color: 'text-neo-yellow' },
];

const compareRows: ReadonlyArray<readonly [string, string, string]> = [
  ['Gameplay style', 'Real-time (everyone plays at once)', 'Turn-based (wait for friends)'],
  ['Avg match duration', '2-3 minutes', 'Days (asynchronous)'],
  ['Players per room', '2-20+', '2 only'],
  ['Price', 'Free, no pay-to-win', 'Free with ads + paid boosts'],
  ['App download', 'No (browser)', 'Yes (app store install)'],
  ['Languages', '5 (EN · HE · SV · JA · ES)', '1 (English)'],
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

const accentBorder = {
  pink: 'border-neo-pink text-neo-pink',
  cyan: 'border-neo-cyan text-neo-cyan',
  lime: 'border-neo-lime text-neo-lime',
  purple: 'border-neo-purple text-neo-purple',
} as const;

const accentChip = {
  pink: 'bg-neo-pink text-neo-white',
  cyan: 'bg-neo-cyan text-neo-navy',
  lime: 'bg-neo-lime text-neo-navy',
  purple: 'bg-neo-purple text-neo-white',
} as const;

const bestForBuckets = [
  { tag: 'PARTIES', title: 'Best for parties & groups', desc: '20+ players in one room. Share a QR, everyone plays at once. No app, no setup.', cta: 'Start a party room', href: 'multiplayer', color: 'pink' },
  { tag: 'CLASSROOMS', title: 'Best for classrooms', desc: 'Vocabulary duels, custom word lists, teacher dashboard. Free, no student accounts needed.', cta: 'Open Education', href: 'education', color: 'lime' },
  { tag: 'FAMILY', title: 'Best for family game night', desc: 'Phone + tablet + TV — same game everywhere. Works for ages 6+, all skill levels.', cta: 'Play with family', href: 'multiplayer', color: 'cyan' },
  { tag: 'ASYNC', title: 'Best as a Words With Friends replacement', desc: 'Daily challenges keep the streak alive. Fast 2-min sessions instead of days of waiting.', cta: 'Try Daily', href: 'daily', color: 'lime' },
  { tag: 'TEAMS', title: 'Best for remote team building', desc: 'Send a Slack link. 5-min icebreaker. No download, no IT approval, no friction.', cta: 'Spin up a room', href: 'multiplayer', color: 'pink' },
  { tag: 'ESL', title: 'Best for language learners', desc: '5 full dictionaries including Hebrew RTL and Japanese. Vocabulary practice in the target language.', cta: 'Pick a language', href: 'multiplayer', color: 'purple' },
] as const;

const whySwitch = [
  { title: 'No more waiting', desc: 'Everyone plays the grid simultaneously. Match takes 2-3 minutes, not 3 days.' },
  { title: '20+ players, not 2', desc: 'Built for groups: parties, classrooms, family nights, team building.' },
  { title: 'Zero downloads', desc: 'Open a browser. Send a link. Friends join instantly. No app store.' },
  { title: '5 languages', desc: 'English, Hebrew (RTL), Swedish, Japanese, Spanish — full dictionaries.' },
  { title: 'No pay-to-win', desc: 'Skill wins, not wallet. Optional cosmetics never affect competitive play.' },
  { title: '8 game modes, not 1', desc: 'Grid battles, Wordle survival, word wheel, adventure, blast, brain drills, duels, party games.' },
];

export default async function WordsWithFriendsAlternativePage({ params }: PageProps) {
  const { locale } = await params;

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-neo-navy text-neo-white texture-halftone">
      <Script id="ld-faq" type="application/ld+json">{faqJsonLd}</Script>
      <Script id="ld-videogame" type="application/ld+json">{videoGameJsonLd}</Script>
      <Script id="ld-software" type="application/ld+json">{softwareAppJsonLd}</Script>
      <Script id="ld-howto" type="application/ld+json">{howToJsonLd}</Script>
      <Script id="ld-breadcrumb" type="application/ld+json">{breadcrumbJsonLd}</Script>

      {/* STICKER MARQUEE */}
      <div className="border-y-3 border-neo-black bg-neo-pink overflow-hidden">
        <div className="flex animate-[scroll_30s_linear_infinite] gap-6 whitespace-nowrap py-2 font-neo-display text-sm font-black uppercase tracking-widest text-neo-white sm:text-base">
          {[...stickerBadges, ...stickerBadges, ...stickerBadges].map((b, i) => (
            <span key={`b-${i}`} className="inline-flex items-center gap-3">
              <span>★</span>
              <span>{b}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">

        {/* HERO */}
        <section className="relative grid items-center gap-10 lg:grid-cols-12">
          <div className="relative lg:col-span-7">
            <span className="inline-block rotate-[-3deg] rounded-neo border-3 border-neo-black bg-neo-yellow px-3 py-1 font-neo-display text-xs font-black uppercase tracking-widest text-neo-navy shadow-hard">
              ★ Free · Real-Time · 8 Modes ★
            </span>
            <h1 className="mt-5 font-neo-display text-5xl font-black leading-[0.92] tracking-tight sm:text-6xl lg:text-7xl">
              The free <span className="inline-block rotate-[-2deg] bg-neo-pink px-3 text-neo-white shadow-hard">Words</span>
              <br />
              <span className="inline-block rotate-[1deg] bg-neo-lime px-3 text-neo-navy shadow-hard">With Friends</span>
              <br />
              alternative — <span className="text-neo-cyan">live</span>.
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-neo-gray-200 sm:text-xl">
              Stop waiting for turns. LexiClash is the browser-based word game where 2-20+ friends play the same grid
              <em className="not-italic font-bold text-neo-lime"> at the same time</em>. Real-time, real-fast, really free.
              Eight game modes, five languages, zero downloads.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Link
                href={`/${locale}/multiplayer`}
                className="group rounded-neo border-4 border-neo-black bg-neo-pink px-7 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-white shadow-hard-lg transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-xl active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed"
              >
                <span className="block text-base sm:text-lg">▶ Play Multiplayer Free</span>
                <span className="block text-[10px] font-bold uppercase tracking-widest opacity-80">No download · No signup · 30 sec</span>
              </Link>
              <Link
                href={`/${locale}/daily`}
                className="rounded-neo border-4 border-neo-black bg-neo-lime px-6 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-navy shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg sm:px-7"
              >
                <span className="block text-base sm:text-lg">★ Daily Challenge</span>
                <span className="block text-[10px] font-bold uppercase tracking-widest opacity-70">5 min · Streak rewards</span>
              </Link>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs uppercase tracking-widest text-neo-gray-200">
              <span className="inline-flex items-center gap-2"><span className="text-neo-lime">●</span> live now</span>
              <span>8 game modes</span>
              <span className="text-neo-yellow">5 languages</span>
              <span>20+ players/room</span>
            </div>
          </div>

          <div className="relative lg:col-span-5">
            <div className="relative mx-auto aspect-square w-full max-w-md rotate-[-2deg] rounded-neo border-4 border-neo-black bg-neo-navy-light p-6 shadow-hard-xl sm:max-w-none">
              <div className="absolute inset-3 grid grid-cols-4 gap-2 rounded-neo border-3 border-neo-black bg-neo-navy p-3">
                {['L','E','X','I','C','L','A','S','H','W','O','R','D','S','U','P'].map((ch, i) => (
                  <div
                    key={`${ch}-${i}`}
                    className={`grid place-items-center rounded border-2 border-neo-black font-neo-display text-2xl font-black shadow-hard-sm ${i % 5 === 0 ? 'bg-neo-lime text-neo-navy' : i % 4 === 0 ? 'bg-neo-pink text-neo-white' : i % 3 === 0 ? 'bg-neo-cyan text-neo-navy' : 'bg-neo-cream text-neo-navy'}`}
                    style={{ transform: `rotate(${(i % 3) - 1}deg)` }}
                  >{ch}</div>
                ))}
              </div>
              <span className="absolute -left-3 -top-3 inline-block rotate-[-12deg] border-3 border-neo-black bg-neo-yellow px-3 py-1 font-neo-display text-sm font-black uppercase text-neo-navy shadow-hard">FREE!</span>
              <span className="absolute -bottom-3 -right-3 inline-block rotate-[8deg] border-3 border-neo-black bg-neo-pink px-3 py-1 font-neo-display text-sm font-black uppercase text-neo-white shadow-hard">2-20 PLAYERS</span>
              <div className="absolute -right-4 top-1/3 hidden h-20 w-20 lg:block">
                <Image src="/mascot/dj.webp" alt="" fill sizes="80px" className="object-contain" />
              </div>
            </div>
          </div>
        </section>

        {/* STATS STRIP */}
        <section className="relative mt-16 overflow-hidden rounded-neo border-4 border-neo-black bg-neo-navy-light shadow-hard-lg">
          <div className="absolute inset-0 texture-halftone-comic-light opacity-60" aria-hidden="true" />
          <div className="relative grid grid-cols-2 gap-4 p-6 sm:grid-cols-4 sm:p-8">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className={`font-neo-display text-4xl font-black sm:text-5xl ${s.color}`}>{s.value}</div>
                <div className="mt-1 text-xs font-bold uppercase tracking-widest text-neo-gray-200">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* COMPARISON TABLE */}
        <section className="mt-20">
          <h2 className="mb-2 font-neo-display text-3xl font-black uppercase sm:text-4xl">
            LexiClash <span className="text-neo-pink">vs</span> Words With Friends
          </h2>
          <p className="mb-6 text-sm text-neo-gray-300 sm:text-base">Side-by-side. Honest. Both are good — they&apos;re just built for different things.</p>
          <div className="overflow-x-auto rounded-neo border-4 border-neo-black bg-neo-navy-light shadow-hard-lg">
            <table className="w-full border-collapse text-sm sm:text-base">
              <thead>
                <tr className="border-b-3 border-neo-black bg-neo-navy">
                  <th className="px-4 py-4 text-left font-neo-display font-black uppercase tracking-wider text-neo-yellow">Feature</th>
                  <th className="px-4 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-lime">LexiClash</th>
                  <th className="px-4 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-gray-300">Words With Friends</th>
                </tr>
              </thead>
              <tbody>
                {compareRows.map((row, i) => (
                  <tr key={row[0]} className={`border-b border-neo-gray-400/20 ${i % 2 ? 'bg-neo-navy/30' : ''}`}>
                    <td className="px-4 py-3 font-bold">{row[0]}</td>
                    <td className="px-4 py-3 text-center font-bold text-neo-lime">{row[1]}</td>
                    <td className="px-4 py-3 text-center text-neo-gray-300">{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 8 GAME MODES */}
        <section className="mt-20">
          <div className="mb-8 flex items-end justify-between">
            <h2 className="font-neo-display text-3xl font-black uppercase leading-tight sm:text-4xl">
              <span className="text-neo-cyan">8 modes</span>, not 1.
            </h2>
            <span className="hidden font-mono text-xs uppercase tracking-widest text-neo-gray-300 sm:inline">{'// way more than tile-placement'}</span>
          </div>
          <p className="mb-8 max-w-2xl text-neo-gray-200">Words With Friends gives you one mode: turn-based tile placement. LexiClash gives you eight — pick the format that fits the moment.</p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {gameModes.map((m, i) => (
              <Link
                key={m.mode}
                href={`/${locale}/${m.href}`}
                className={`group relative flex flex-col gap-3 rounded-neo border-4 border-neo-black bg-neo-navy-light p-5 shadow-hard-lg transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-xl ${accentBorder[m.accent]}`}
                style={{ transform: `rotate(${(i % 3) - 1}deg)` }}
              >
                <span className={`absolute -right-2 -top-3 inline-block rotate-[6deg] rounded border-3 border-neo-black px-2 py-0.5 font-neo-display text-[10px] font-black uppercase tracking-widest shadow-hard ${accentChip[m.accent]}`}>
                  {m.tag}
                </span>
                <div className="relative h-16 w-16">
                  <Image src={m.mascot} alt="" fill sizes="64px" className="object-contain" />
                </div>
                <h3 className="font-neo-display text-lg font-black leading-tight">{m.mode}</h3>
                <p className="text-xs text-neo-gray-200">{m.desc}</p>
                <span className="mt-auto inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest">
                  Play <span className="transition-transform group-hover:translate-x-1">→</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* BEST FOR BUCKETS */}
        <section className="mt-20">
          <h2 className="mb-8 font-neo-display text-3xl font-black uppercase sm:text-4xl">
            Best for <span className="text-neo-yellow">your moment</span>.
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {bestForBuckets.map((b, i) => (
              <div
                key={b.title}
                className={`relative rounded-neo border-4 border-neo-black bg-neo-navy-light p-5 shadow-hard-lg ${accentBorder[b.color]}`}
                style={{ transform: i % 2 === 0 ? 'rotate(-0.5deg)' : 'rotate(0.5deg)' }}
              >
                <span className={`absolute -top-3 left-4 rotate-[-3deg] rounded border-3 border-neo-black px-2 py-0.5 font-neo-display text-[10px] font-black uppercase tracking-widest shadow-hard ${accentChip[b.color]}`}>{b.tag}</span>
                <h3 className="mt-3 font-neo-display text-lg font-black leading-tight">{b.title}</h3>
                <p className="mt-2 text-sm text-neo-gray-200">{b.desc}</p>
                <Link href={`/${locale}/${b.href}`} className="mt-4 inline-flex items-center gap-1 font-neo-display text-xs font-black uppercase tracking-widest">
                  {b.cta} →
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* WHY SWITCH */}
        <section className="mt-20">
          <h2 className="mb-8 font-neo-display text-3xl font-black uppercase sm:text-4xl">
            Why players <span className="text-neo-pink">switch</span>.
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {whySwitch.map((item, i) => (
              <div
                key={item.title}
                className="rounded-neo border-3 border-neo-black bg-neo-pink p-5 text-neo-white shadow-hard"
                style={{ transform: i % 3 === 0 ? 'rotate(-0.5deg)' : i % 3 === 1 ? 'rotate(0.5deg)' : 'rotate(0deg)' }}
              >
                <h3 className="mb-2 font-neo-display font-black uppercase">{item.title}</h3>
                <p className="text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* HOW TO PLAY */}
        <section className="mt-20">
          <h2 className="mb-2 font-neo-display text-3xl font-black uppercase sm:text-4xl">
            <span className="text-neo-lime">30 seconds</span> to your first match.
          </h2>
          <p className="mb-8 max-w-2xl text-neo-gray-200">No signup. No app store. No tutorial wall.</p>
          <ol className="grid gap-5 sm:grid-cols-3">
            {[
              { n: '01', title: 'Open lexiclash.live', desc: 'Any browser, any device. No download. No account.', mascot: '/mascot/explorer.webp', tint: 'border-neo-cyan' },
              { n: '02', title: 'Create or join', desc: 'Get a 4-digit room code. Share via link or QR. Friends drop in instantly.', mascot: '/mascot/dj.webp', tint: 'border-neo-pink' },
              { n: '03', title: 'Find words. Win.', desc: 'Same grid for everyone. Race the clock and friends. Highest score wins.', mascot: '/mascot/flexing.webp', tint: 'border-neo-lime' },
            ].map((s) => (
              <li key={s.n} className={`relative rounded-neo border-4 ${s.tint} bg-neo-navy-light p-6 shadow-hard`}>
                <span className="absolute -top-4 left-4 inline-block rotate-[-4deg] border-3 border-neo-black bg-neo-yellow px-3 py-1 font-neo-display text-sm font-black text-neo-navy shadow-hard">
                  STEP {s.n}
                </span>
                <div className="mt-3 flex items-start gap-4">
                  <div className="relative h-16 w-16 shrink-0">
                    <Image src={s.mascot} alt="" fill sizes="64px" className="object-contain" />
                  </div>
                  <div>
                    <h3 className="font-neo-display text-xl font-black">{s.title}</h3>
                    <p className="mt-1 text-sm text-neo-gray-200">{s.desc}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* FAQ */}
        <section className="mt-20">
          <h2 className="mb-6 font-neo-display text-3xl font-black uppercase sm:text-4xl">
            Quick <span className="text-neo-cyan">questions</span>.
          </h2>
          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <details
                key={`faq-${idx}-${faq.q}`}
                className="group rounded-neo border-3 border-neo-black bg-neo-navy-light shadow-hard transition-all open:shadow-hard-lg"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-neo-display font-black uppercase tracking-wide sm:px-6">
                  <span>{faq.q}</span>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded border-2 border-neo-black bg-neo-yellow text-neo-navy transition-transform group-open:rotate-45">+</span>
                </summary>
                <div className="border-t-3 border-neo-black bg-neo-navy/40 px-5 py-4 text-sm text-neo-gray-200 sm:px-6 sm:text-base">{faq.a}</div>
              </details>
            ))}
          </div>
        </section>

        {/* CROSS-LINKS */}
        <section className="mt-20">
          <h2 className="mb-6 font-neo-display text-3xl font-black uppercase sm:text-4xl">More word games to compare.</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { href: 'best-online-word-games', tag: 'GUIDE', title: 'Best Word Games 2026', desc: '9 games ranked, honest pros & cons', accent: 'border-neo-yellow text-neo-yellow' },
              { href: 'scrabble-alternative-online', tag: 'ALT', title: 'Scrabble Alternative Online', desc: 'Real-time, browser, 2-20 players', accent: 'border-neo-lime text-neo-lime' },
              { href: 'lexiclash-vs-wordle', tag: 'VS', title: 'LexiClash vs Wordle', desc: 'Unlimited play vs 1 puzzle/day', accent: 'border-neo-cyan text-neo-cyan' },
              { href: 'lexiclash-vs-scrabble', tag: 'VS', title: 'LexiClash vs Scrabble', desc: 'Real-time vs turn-based', accent: 'border-neo-pink text-neo-pink' },
              { href: 'play-boggle-online-free', tag: 'PLAY', title: 'Free Boggle Online', desc: 'No download, instant play', accent: 'border-neo-lime text-neo-lime' },
            ].map((c) => (
              <Link
                key={c.href}
                href={`/${locale}/${c.href}`}
                className={`relative rounded-neo border-3 ${c.accent} bg-neo-navy-light p-4 shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg`}
              >
                <span className="absolute -top-3 left-3 border-2 border-neo-black bg-neo-navy px-2 py-0.5 font-neo-display text-[10px] font-black uppercase tracking-widest">{c.tag}</span>
                <h3 className="mt-2 font-neo-display text-base font-black">{c.title}</h3>
                <p className="mt-1 text-xs text-neo-gray-200">{c.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="relative mt-20 mb-12 overflow-hidden rounded-neo border-4 border-neo-black bg-neo-yellow p-8 text-neo-navy shadow-hard-xl sm:p-12">
          <div className="absolute inset-0 texture-halftone-comic opacity-30" aria-hidden="true" />
          <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <h2 className="font-neo-display text-4xl font-black leading-[0.95] sm:text-5xl">
                Stop waiting for turns.<br />
                <span className="bg-neo-navy px-3 text-neo-yellow">Start playing.</span>
              </h2>
              <p className="mt-4 max-w-xl text-base font-bold sm:text-lg">
                Open the browser. Send a link. Friends join. Game starts in 30 seconds. The free Words With Friends alternative
                you actually finish before bedtime.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={`/${locale}/multiplayer`}
                  className="rounded-neo border-4 border-neo-black bg-neo-pink px-7 py-4 text-center font-neo-display text-base font-black uppercase tracking-wider text-neo-white shadow-hard-lg transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-xl sm:text-lg"
                >
                  ▶ Play Multiplayer Free
                </Link>
                <Link
                  href={`/${locale}/daily`}
                  className="rounded-neo border-4 border-neo-black bg-neo-navy px-7 py-4 text-center font-neo-display text-base font-black uppercase tracking-wider text-neo-lime shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg sm:text-lg"
                >
                  ★ Daily Challenge
                </Link>
              </div>
            </div>
            <div className="relative hidden h-44 w-44 lg:block">
              <Image src="/mascot/winner.webp" alt="" fill sizes="176px" className="object-contain" />
            </div>
          </div>
        </section>
      </div>

      <style>{`@keyframes scroll{from{transform:translateX(0)}to{transform:translateX(-33.333%)}}`}</style>
    </main>
  );
}
