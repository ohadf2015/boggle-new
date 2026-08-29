import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import Script from 'next/script';
import { TopBackLink } from '@/components/navigation/TopBackLink';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isTargetLocale = locale === 'en';
  const pageUrl = `${BASE_URL}/en/play-boggle-online-free`;

  return {
    title: 'Boggle Online Free — Play Instantly, No Download | LexiClash',
    description: 'Play Boggle online free — no download, no account. 4×4 to 6×6 grids, real-time multiplayer with up to 50 players or solo vs bots. Start now →',
    keywords: 'play boggle online free no download, boggle online free no download, play boggle online free, free boggle online no download, free online boggle no download, boggle game free no download, play boggle word shake free no download, play boggle online free with other players, boggle alternatives 2026, games like boggle online free, word game no download, boggle word shake free, word games online free, word making games, word hunt game online, free word game no download, word puzzle game free',
    openGraph: {
      title: 'Free Boggle Online — Play Solo or Multiplayer | LexiClash',
      description: 'Free boggle online — no download, no signup. Real-time multiplayer with friends or solo challenge. Instant play in your browser!',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [
        {
          url: `${BASE_URL}/og-image-en.webp`,
          width: 1200,
          height: 630,
          alt: 'LexiClash - Play Boggle Online Free No Download',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Play Boggle Online Free - No Download | LexiClash',
      description: 'Play boggle free online — no download, no signup. Solo or with friends!',
      images: [`${BASE_URL}/og-image-en.webp`],
    },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': `${BASE_URL}/en/play-boggle-online-free`,
        en: `${BASE_URL}/en/play-boggle-online-free`,
      },
    },
    robots: isTargetLocale ? { index: true, follow: true } : { index: false, follow: true },
  };
}

const faqs = [
  {
    q: 'Can I play Boggle online free with no download?',
    a: 'Yes! LexiClash lets you play boggle online completely free with no download and no signup required. Just visit lexiclash.live and start playing instantly in your browser on any device — phone, tablet, or desktop.',
  },
  {
    q: 'Is this like real Boggle?',
    a: "LexiClash is inspired by Boggle with exciting additions! Like Boggle, you find words by connecting adjacent letters on a grid. But LexiClash adds real-time multiplayer, combo scoring, multiple grid sizes (4x4, 5x5, 6x6), daily challenges, and boss battles — all free.",
  },
  {
    q: 'Can I play with friends online?',
    a: 'Absolutely! Create a room, share the link with friends, and compete in real-time word battles. Up to 20+ players can join. No account required — just share the room code or QR code.',
  },
  {
    q: 'Is LexiClash better than Words With Friends?',
    a: "LexiClash offers a different experience. Unlike Words With Friends (turn-based), LexiClash is real-time — everyone plays simultaneously, making it faster and more exciting. It combines Boggle-style grid word finding with competitive multiplayer. Both are great, but LexiClash is completely free with no pay-to-win mechanics.",
  },
  {
    q: 'What are the best Boggle alternatives online?',
    a: 'LexiClash is one of the best free Boggle alternatives. It offers the classic letter-grid word-finding gameplay plus multiplayer battles, daily challenges, adventure mode with boss fights, and brain training drills. All free, no download needed, available in 5 languages.',
  },
  {
    q: 'Does it work on mobile without downloading an app?',
    a: "Yes! LexiClash works perfectly in your mobile browser — no app download needed. It's optimized for touch screens and works on iOS and Android. You can also install it as a Progressive Web App (PWA) from your browser for an app-like experience.",
  },
  {
    q: 'Can students play Boggle online free in a classroom?',
    a: 'Yes! LexiClash works great as a free classroom Boggle game — no accounts, no downloads, no setup. Teachers create a room in seconds and share the link or QR code. Up to 20+ students compete simultaneously on the word grid, making it ideal for vocabulary practice, spelling drills, and ESL classes.',
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

const howToJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to Play Boggle Online Free',
  description: 'Start playing free online Boggle in 3 simple steps — no download or account required.',
  totalTime: 'PT1M',
  step: [
    { '@type': 'HowToStep', name: 'Open LexiClash', text: 'Visit lexiclash.live in any browser — works on phone, tablet, and desktop. No download or signup needed.', url: 'https://www.lexiclash.live/en/singleplayer' },
    { '@type': 'HowToStep', name: 'Choose Your Mode', text: 'Pick Solo (vs AI bots), Multiplayer (2-20+ friends), Daily Challenge (same puzzle worldwide), or Adventure Mode (boss battles).' },
    { '@type': 'HowToStep', name: 'Find Words & Score', text: 'Swipe or click to connect adjacent letters and form words. Longer words and fast combos score more points. Compete on the global leaderboard!' },
  ],
});

const softwareAppJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'LexiClash — Free Online Boggle',
  url: 'https://www.lexiclash.live',
  applicationCategory: 'GameApplication',
  operatingSystem: 'Any',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  featureList: [
    'Real-time multiplayer up to 20 players',
    'No download required — play in browser',
    'Daily Word Wheel puzzle',
    '5 language support (EN, HE, SV, JA, ES)',
    '4x4, 5x5, 6x6 grid sizes',
    'Adventure mode with boss battles',
    'Combo scoring system',
  ],
  browserRequirements: 'Requires a modern web browser',
  inLanguage: ['en', 'he', 'sv', 'ja', 'es', 'ru'],
});

const stickerBadges = ['NO DOWNLOAD', 'NO SIGNUP', 'NO ADS HELL', 'PLAY IN 5s', '5 LANGUAGES', 'REAL-TIME', 'INSTANT FUN'];

const modes = [
  { href: 'singleplayer', color: 'lime', label: 'Solo', title: 'BEAT THE BOTS', desc: 'You vs sneaky AI rivals. Three difficulty tiers — pick your pain.', mascot: '/mascot/play.webp', cta: 'Play Solo Free' },
  { href: 'multiplayer', color: 'pink', label: 'Multiplayer', title: 'BRING THE CHAOS', desc: 'Real-time word brawls with 2–20+ friends. Share a code, drop in, fight.', mascot: '/mascot/dj.webp', cta: 'Play With Friends' },
  { href: 'daily', color: 'cyan', label: 'Daily', title: 'WORD WHEEL', desc: 'One letter set, the whole world plays it. Chase the global record.', mascot: '/mascot/scholar.webp', cta: 'Spin The Wheel' },
] as const;

const modeColorMap = {
  lime: 'border-neo-lime text-neo-lime',
  pink: 'border-neo-pink text-neo-pink',
  cyan: 'border-neo-cyan text-neo-cyan',
} as const;

const modeBgMap = {
  lime: 'bg-neo-lime text-neo-navy',
  pink: 'bg-neo-pink text-neo-white',
  cyan: 'bg-neo-cyan text-neo-navy',
} as const;

const stats = [
  { value: '4×4-6×6', label: 'Grid Sizes', color: 'text-neo-lime' },
  { value: '5', label: 'Languages', color: 'text-neo-cyan' },
  { value: '20', label: 'Max Players', color: 'text-neo-pink' },
  { value: '8', label: 'Game Modes', color: 'text-neo-yellow' },
];

const features = [
  { icon: '⚡', text: 'Free online — no download, no signup, no ads-hell' },
  { icon: '🤖', text: 'Solo mode vs AI bots at three sass levels' },
  { icon: '🎉', text: 'Real-time multiplayer with 2–20+ players' },
  { icon: '🔠', text: 'Three grid sizes: 4×4, 5×5, 6×6' },
  { icon: '🌀', text: 'Daily Word Wheel — chase the global record' },
  { icon: '🔥', text: 'Combo scoring rewards lightning chains' },
  { icon: '📱', text: 'Phone, tablet, desktop — same game everywhere' },
  { icon: '🌍', text: 'Five languages: EN · HE · SV · JA · ES' },
  { icon: '🐉', text: 'Adventure mode with boss battles & loot' },
  { icon: '🧠', text: 'Brain drills to sharpen the word-brain' },
];

const compareRows: ReadonlyArray<readonly [string, string, string, string]> = [
  ['Free to play', '✓', '✗ board game', '✓ with ads'],
  ['No download', '✓', '✗', '✗ app required'],
  ['Real-time MP', '✓', '✓ in person', '✗ turn-based'],
  ['Online with friends', '✓', '✗', '✓'],
  ['Daily challenges', '✓', '✗', '✗'],
  ['Multi-language', '5 langs', '✗', '✗'],
  ['Boss battles', '✓', '✗', '✗'],
  ['Grid sizes', '4×4 · 5×5 · 6×6', '4×4 only', 'N/A'],
];

export default async function PlayBoggleOnlineFreePage({ params }: PageProps) {
  const { locale } = await params;

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-neo-navy text-neo-white texture-halftone">
      <Script id="ld-faq" type="application/ld+json">{faqJsonLd}</Script>
      <Script id="ld-howto" type="application/ld+json">{howToJsonLd}</Script>
      <Script id="ld-app" type="application/ld+json">{softwareAppJsonLd}</Script>

      {/* STICKER MARQUEE */}
      <div className="border-y-3 border-neo-black bg-neo-lime overflow-hidden">
        <div className="flex animate-[scroll_30s_linear_infinite] gap-6 whitespace-nowrap py-2 font-neo-display text-sm font-black uppercase tracking-widest text-neo-navy sm:text-base">
          {[...stickerBadges, ...stickerBadges, ...stickerBadges].map((b, i) => (
            <span key={`b-${i}`} className="inline-flex items-center gap-3">
              <span>★</span>
              <span>{b}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <TopBackLink className="mb-4" />

        {/* HERO */}
        <section className="relative grid items-center gap-10 lg:grid-cols-12">
          <div className="relative lg:col-span-7">
            <span className="inline-block rotate-[-3deg] rounded-neo border-3 border-neo-black bg-neo-yellow px-3 py-1 font-neo-display text-xs font-black uppercase tracking-widest text-neo-navy shadow-hard">
              ★ Browser-Native ★ Zero Install ★
            </span>
            <h1 className="mt-5 font-neo-display text-5xl font-black leading-[0.92] tracking-tight sm:text-6xl lg:text-7xl">
              Play <span className="inline-block rotate-[-2deg] bg-neo-lime px-3 text-neo-navy shadow-hard">Boggle</span>
              <br />
              Online <span className="text-neo-cyan">Free</span>.
              <br />
              <span className="text-neo-pink">No</span> downloads.
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-neo-gray-200 sm:text-xl">
              The loudest, fastest free Boggle alternative on the internet. Find words on a letter grid solo, or
              throw 20 friends into a real-time word brawl. Open the browser. Start playing. That&apos;s it.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Link
                href={`/${locale}/singleplayer`}
                className="group rounded-neo border-4 border-neo-black bg-neo-yellow px-7 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-navy shadow-hard-lg transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-xl active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed"
              >
                <span className="block text-base sm:text-lg">▶ Play Free Now</span>
                <span className="block text-[10px] font-bold uppercase tracking-widest opacity-70">No download · No login</span>
              </Link>
              <Link
                href={`/${locale}/multiplayer`}
                className="rounded-neo border-4 border-neo-black bg-neo-pink px-6 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-white shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg sm:px-7"
              >
                <span className="block text-base sm:text-lg">★ Play w/ Friends</span>
                <span className="block text-[10px] font-bold uppercase tracking-widest opacity-80">2–20 players</span>
              </Link>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs uppercase tracking-widest text-neo-gray-200">
              <span className="inline-flex items-center gap-2"><span className="text-neo-lime">●</span> live now</span>
              <span>browser-based</span>
              <span className="text-neo-yellow">5 languages</span>
              <span>2-20 players</span>
            </div>
          </div>

          {/* HERO IMAGE — tilted with sticker corners */}
          <div className="relative lg:col-span-5">
            <div className="relative mx-auto aspect-[16/10] w-full max-w-md rotate-[2deg] rounded-neo border-4 border-neo-black bg-neo-navy-light shadow-hard-xl sm:max-w-none">
              <Image
                src="/landing/play-boggle-hero.webp"
                alt="LexiClash Boggle letter grid with kawaii mascot character"
                fill
                priority
                sizes="(min-width: 1024px) 480px, 100vw"
                className="rounded-neo object-cover"
              />
              <span className="absolute -left-3 -top-3 inline-block rotate-[-12deg] border-3 border-neo-black bg-neo-yellow px-3 py-1 font-neo-display text-sm font-black uppercase text-neo-navy shadow-hard">FREE!</span>
              <span className="absolute -bottom-3 -right-3 inline-block rotate-[8deg] border-3 border-neo-black bg-neo-pink px-3 py-1 font-neo-display text-sm font-black uppercase text-neo-white shadow-hard">2026</span>
            </div>
          </div>
        </section>

        {/* WORDS WITH FRIENDS CROSS-LINK BANNER */}
        <section className="mt-12">
          <Link
            href="/en/words-with-friends-alternative"
            className="group relative flex items-center justify-between gap-4 overflow-hidden rounded-neo border-4 border-neo-black bg-neo-pink p-5 shadow-hard-lg transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-xl sm:p-6"
          >
            <div className="absolute inset-0 texture-halftone-comic opacity-20" aria-hidden="true" />
            <div className="relative">
              <span className="inline-block rotate-[-3deg] rounded border-2 border-neo-black bg-neo-yellow px-2 py-0.5 font-neo-display text-[10px] font-black uppercase tracking-widest text-neo-navy shadow-hard-sm">★ Looking for Words With Friends? ★</span>
              <h3 className="mt-3 font-neo-display text-xl font-black uppercase leading-tight text-neo-white sm:text-2xl">
                The free <span className="bg-neo-navy px-2 text-neo-lime">Words With Friends</span> alternative — but real-time.
              </h3>
              <p className="mt-2 max-w-xl text-sm text-neo-white">2-20 friends play the same grid simultaneously. Match takes 2-3 min, not 3 days. No download.</p>
            </div>
            <span className="relative shrink-0 rounded-neo border-3 border-neo-black bg-neo-navy px-4 py-2 font-neo-display text-sm font-black uppercase tracking-widest text-neo-lime shadow-hard transition-all group-hover:translate-x-1">
              Compare →
            </span>
          </Link>
        </section>

        {/* MODE TRIO */}
        <section className="mt-20">
          <div className="mb-8 flex items-end justify-between">
            <h2 className="font-neo-display text-3xl font-black uppercase leading-tight sm:text-4xl">
              Pick your <span className="text-neo-lime">poison</span>.
            </h2>
            <span className="hidden font-mono text-xs uppercase tracking-widest text-neo-gray-300 sm:inline">{'// 3 modes · 0 paywalls'}</span>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {modes.map((m, i) => (
              <Link
                key={m.href}
                href={`/${locale}/${m.href}`}
                className={`group relative flex flex-col gap-4 rounded-neo border-4 border-neo-black bg-neo-navy-light p-6 shadow-hard-lg transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-xl ${modeColorMap[m.color]}`}
                style={{ transform: `rotate(${i % 2 === 0 ? '-1deg' : '1deg'})` }}
              >
                <span className={`absolute -right-2 -top-3 inline-block rotate-[6deg] rounded border-3 border-neo-black px-2 py-0.5 font-neo-display text-[10px] font-black uppercase tracking-widest shadow-hard ${modeBgMap[m.color]}`}>
                  {m.label}
                </span>
                <div className="relative h-24 w-24">
                  <Image src={m.mascot} alt="" fill sizes="96px" className="object-contain" unoptimized />
                </div>
                <h3 className="font-neo-display text-2xl font-black leading-tight">{m.title}</h3>
                <p className="text-sm text-neo-gray-200">{m.desc}</p>
                <span className="mt-auto inline-flex items-center gap-2 font-neo-display text-sm font-black uppercase tracking-widest">
                  {m.cta} <span className="transition-transform group-hover:translate-x-1">→</span>
                </span>
              </Link>
            ))}
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

        {/* HOW TO PLAY */}
        <section className="mt-20">
          <h2 className="mb-2 font-neo-display text-3xl font-black uppercase sm:text-4xl">
            Three steps. <span className="text-neo-pink">One minute.</span>
          </h2>
          <p className="mb-8 max-w-2xl text-neo-gray-200">No tutorials. No onboarding wall. You&apos;ll be finding words before the kettle boils.</p>
          <ol className="grid gap-5 sm:grid-cols-3">
            {[
              { n: '01', title: 'Open the browser', desc: 'Hit lexiclash.live on phone, tablet, or laptop. No app store. No account. No vibe-killers.', mascot: '/mascot/explorer.webp', tint: 'border-neo-cyan' },
              { n: '02', title: 'Pick a mode', desc: 'Solo vs bots, real-time multiplayer, daily Word Wheel, or boss-battle adventure mode.', mascot: '/mascot/question.webp', tint: 'border-neo-pink' },
              { n: '03', title: 'Find words. Score. Win.', desc: 'Connect adjacent letters. Longer words + faster chains = a fatter score and louder bragging rights.', mascot: '/mascot/flexing.webp', tint: 'border-neo-lime' },
            ].map((s) => (
              <li key={s.n} className={`relative rounded-neo border-4 ${s.tint} bg-neo-navy-light p-6 shadow-hard`}>
                <span className="absolute -top-4 left-4 inline-block rotate-[-4deg] border-3 border-neo-black bg-neo-yellow px-3 py-1 font-neo-display text-sm font-black text-neo-navy shadow-hard">
                  STEP {s.n}
                </span>
                <div className="mt-3 flex items-start gap-4">
                  <div className="relative h-16 w-16 shrink-0">
                    <Image src={s.mascot} alt="" fill sizes="64px" className="object-contain" unoptimized />
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

        {/* MULTIPLAYER SHOWCASE */}
        <section className="relative mt-20 grid items-center gap-8 rounded-neo border-4 border-neo-black bg-neo-pink p-1 shadow-hard-xl lg:grid-cols-2">
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-neo border-4 border-neo-black">
            <Image
              src="/landing/play-boggle-multiplayer.webp"
              alt="Three mascots competing on a multiplayer Boggle word board"
              fill
              sizes="(min-width: 1024px) 600px, 100vw"
              className="object-cover"
            />
          </div>
          <div className="p-6 sm:p-8 lg:p-10">
            <span className="inline-block rotate-[-2deg] border-3 border-neo-black bg-neo-yellow px-3 py-1 font-neo-display text-xs font-black uppercase tracking-widest text-neo-navy shadow-hard">★ MULTIPLAYER ★</span>
            <h2 className="mt-4 font-neo-display text-3xl font-black uppercase leading-tight text-neo-white sm:text-4xl">
              The party <span className="bg-neo-navy px-2 text-neo-lime">starts</span> when friends join.
            </h2>
            <p className="mt-4 text-neo-white">
              Spin up a room in 3 seconds. Share a 4-letter code or QR. 20 people on phones, one TV in the middle —
              chaos in five languages. Real-time scoring, combo streaks, the works.
            </p>
            <Link
              href={`/${locale}/multiplayer`}
              className="mt-6 inline-block rounded-neo border-4 border-neo-black bg-neo-navy px-7 py-3 font-neo-display text-base font-black uppercase tracking-wider text-neo-lime shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg"
            >
              Start a Room →
            </Link>
          </div>
        </section>

        {/* CLASSROOM */}
        <section className="mt-20 max-w-3xl">
          <h2 className="mb-3 font-neo-display text-3xl font-black uppercase leading-tight sm:text-4xl">
            Boggle online for the <span className="text-neo-cyan">classroom</span>.
          </h2>
          <p className="text-sm leading-relaxed text-neo-white sm:text-base">
            Teachers use LexiClash as a free classroom Boggle game — no accounts, no downloads, no setup. Spin up a
            room in seconds, share the link or QR code, and 20+ students compete live on the same word grid. Great
            for vocabulary practice, spelling drills, and ESL classes. Want a version built for schools, with
            classroom-ready tools?{' '}
            <Link href={`/${locale}/education/for-schools`} className="text-neo-cyan underline">
              Check out LexiClash for Schools
            </Link>
            .
          </p>
        </section>

        {/* WHY LEXICLASH */}
        <section className="mt-20">
          <h2 className="mb-8 font-neo-display text-3xl font-black uppercase sm:text-4xl">
            The <span className="text-neo-yellow">good stuff</span>, all included.
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {features.map((f, i) => (
              <li
                key={f.text}
                className="flex items-start gap-4 rounded-neo border-3 border-neo-black bg-neo-navy-light p-4 shadow-hard transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard-lg"
                style={{ transform: i % 3 === 0 ? 'rotate(-0.4deg)' : i % 3 === 1 ? 'rotate(0.3deg)' : 'rotate(0deg)' }}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-neo border-3 border-neo-black bg-neo-lime text-xl shadow-hard-sm" aria-hidden="true">{f.icon}</span>
                <p className="pt-1.5 text-sm sm:text-base">{f.text}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* COMPARISON */}
        <section className="mt-20">
          <h2 className="mb-2 font-neo-display text-3xl font-black uppercase sm:text-4xl">
            LexiClash <span className="text-neo-pink">vs</span> The World.
          </h2>
          <p className="mb-6 text-sm text-neo-gray-300 sm:text-base">Where Boggle and Words With Friends fall short, LexiClash struts.</p>
          <div className="overflow-x-auto rounded-neo border-4 border-neo-black bg-neo-navy-light shadow-hard-lg">
            <table className="w-full border-collapse text-sm sm:text-base">
              <thead>
                <tr className="border-b-3 border-neo-black bg-neo-navy">
                  <th className="px-4 py-4 text-left font-neo-display font-black uppercase tracking-wider text-neo-yellow">Feature</th>
                  <th className="px-4 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-lime">LexiClash</th>
                  <th className="px-4 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-gray-300">Boggle</th>
                  <th className="px-4 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-gray-300">WWF</th>
                </tr>
              </thead>
              <tbody>
                {compareRows.map((row, i) => (
                  <tr key={row[0]} className={`border-b border-neo-gray-400/20 ${i % 2 ? 'bg-neo-navy/30' : ''}`}>
                    <td className="px-4 py-3 font-bold">{row[0]}</td>
                    <td className="px-4 py-3 text-center font-bold text-neo-lime">{row[1]}</td>
                    <td className="px-4 py-3 text-center text-neo-gray-300">{row[2]}</td>
                    <td className="px-4 py-3 text-center text-neo-gray-300">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
          <h2 className="mb-6 font-neo-display text-3xl font-black uppercase sm:text-4xl">More word fights.</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { href: 'daily-word-wheel', tag: 'DAILY', title: 'Daily Word Wheel', desc: 'New letter puzzle every day', accent: 'border-neo-lime text-neo-lime' },
              { href: 'lexiclash-vs-wordle', tag: 'VS', title: 'LexiClash vs Wordle', desc: 'Unlimited play vs 1 puzzle/day', accent: 'border-neo-cyan text-neo-cyan' },
              { href: 'lexiclash-vs-scrabble', tag: 'VS', title: 'LexiClash vs Scrabble GO', desc: 'No pay-to-win, real players', accent: 'border-neo-pink text-neo-pink' },
              { href: 'best-online-word-games', tag: 'GUIDE', title: 'Best Word Games 2026', desc: 'Complete comparison guide', accent: 'border-neo-yellow text-neo-yellow' },
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
                Stop searching.<br />
                <span className="bg-neo-navy px-3 text-neo-yellow">Start playing.</span>
              </h2>
              <p className="mt-4 max-w-xl text-base font-bold sm:text-lg">
                You searched &ldquo;boggle online free no download&rdquo; and you found it. The browser is open. The game is free.
                The friends are waiting. Push the button.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={`/${locale}/singleplayer`}
                  className="rounded-neo border-4 border-neo-black bg-neo-navy px-7 py-4 text-center font-neo-display text-base font-black uppercase tracking-wider text-neo-lime shadow-hard-lg transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-xl sm:text-lg"
                >
                  ▶ Play Boggle Now
                </Link>
                <Link
                  href={`/${locale}/multiplayer`}
                  className="rounded-neo border-4 border-neo-black bg-neo-pink px-7 py-4 text-center font-neo-display text-base font-black uppercase tracking-wider text-neo-white shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg sm:text-lg"
                >
                  ★ Invite Friends
                </Link>
              </div>
            </div>
            <div className="relative hidden h-44 w-44 lg:block">
              <Image src="/mascot/winner.webp" alt="" fill sizes="176px" className="object-contain" unoptimized />
            </div>
          </div>
        </section>
      </div>

      {/* MARQUEE KEYFRAMES */}
      <style>{`@keyframes scroll{from{transform:translateX(0)}to{transform:translateX(-33.333%)}}`}</style>
    </main>
  );
}
