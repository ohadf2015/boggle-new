import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';

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
          url: `${BASE_URL}/og-image-${isEn ? 'en' : locale}.webp`,
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
      images: [`${BASE_URL}/og-image-${isEn ? 'en' : locale}.webp`],
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
    a: 'WordCraft plays in English, Hebrew (right-to-left), Swedish, Japanese, and Spanish, each with its own tile distribution and dictionary.',
  },
];

const modes = [
  {
    name: 'Territory',
    tag: 'The signature twist',
    desc: 'Build words, claim the cells you play, and capture rivals by crossing their tiles. Ride the heat meter into overdrive.',
    href: 'word-craft',
    accent: 'text-neo-purple',
  },
  {
    name: 'Card Run',
    tag: 'Roguelike score-attack',
    desc: 'Timed rounds, then draft a power card between each. Stack vowel boosts, multipliers and extra tiles for a monster run total.',
    href: 'word-craft?mode=cards',
    accent: 'text-neo-cyan',
  },
  {
    name: 'Gem Hunt',
    tag: 'Collect & combo',
    desc: 'Words uncover buried gems. Chase rare crowns, fill your inventory, and bank a high collection score.',
    href: 'word-craft?mode=gems',
    accent: 'text-neo-lime',
  },
  {
    name: 'Pass & Play',
    tag: 'Turn-based with a friend',
    desc: 'Two players, one device, alternating turns with a privacy curtain on hand-off. Perfect for the couch or a party screen.',
    href: 'word-craft?vs=human',
    accent: 'text-neo-pink',
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
    inLanguage: ['en', 'he', 'sv', 'ja', 'es'],
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    publisher: { '@type': 'Organization', name: 'LexiClash', url: BASE_URL },
  });

  return (
    <main className="min-h-dvh bg-neo-navy text-neo-white">
      <Script id="ld-wc-faq" type="application/ld+json">{faqJsonLd}</Script>
      <Script id="ld-wc-howto" type="application/ld+json">{howToJsonLd}</Script>
      <Script id="ld-wc-game" type="application/ld+json">{gameJsonLd}</Script>

      {/* Sticker marquee */}
      <div className="overflow-hidden border-y-2 border-black bg-neo-purple">
        <div className="flex whitespace-nowrap py-2 font-neo-display text-sm font-black uppercase tracking-widest text-neo-navy">
          {Array.from({ length: 2 }).map((_, i) => (
            <span key={i} className="flex shrink-0">
              {['No download', 'Play in 5s', 'Free forever', 'Claim territory', '5 languages', 'Word strategy'].map((s) => (
                <span key={s} className="mx-4">★ {s}</span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-5 py-14 text-center sm:py-20">
        <h1 className="font-neo-display text-4xl font-black leading-[0.95] sm:text-6xl">
          <span className="bg-neo-purple px-3 text-neo-navy shadow-hard">WordCraft</span>
          <br className="hidden sm:block" />
          <span className="text-neo-white"> — build words, </span>
          <span className="text-neo-cyan">claim territory</span>
          <span className="text-neo-white">, </span>
          <span className="text-neo-pink">win</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl font-neo-body text-lg text-neo-white/90">
          A free word-strategy grid game with a twist: every tile you play claims
          ground, and crossing a rival captures theirs. Play instantly — no download,
          no signup.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={play('word-craft')}
            className="rounded-neo border-neo-thick border-black bg-neo-lime px-8 py-4 font-neo-display text-lg font-black uppercase tracking-wide text-neo-navy shadow-hard-lg transition-transform hover:-translate-x-1 hover:-translate-y-1"
          >
            Play free
          </Link>
          <Link
            href={play('word-craft?vs=human')}
            className="rounded-neo border-neo-thick border-black bg-neo-pink px-8 py-4 font-neo-display text-lg font-black uppercase tracking-wide text-neo-navy shadow-hard transition-transform hover:-translate-x-1 hover:-translate-y-1"
          >
            Pass &amp; Play with a friend
          </Link>
        </div>
        <div className="mx-auto mt-10 max-w-3xl animate-neo-pop">
          <picture>
            <source srcSet="/word-craft/landing-hero.webp" type="image/webp" />
            <img
              src="/word-craft/landing-hero.jpg"
              alt="WordCraft: cream letter tiles spelling WORDCRAFT glowing in lime, cyan and pink on a dark navy board, with a drawstring sack spilling more tiles"
              width={1280}
              height={714}
              className="w-full rounded-neo border-neo-thick border-black shadow-hard-lg"
            />
          </picture>
        </div>
      </section>

      {/* Modes */}
      <section className="mx-auto max-w-5xl px-5 py-10">
        <h2 className="mb-6 text-center font-neo-display text-2xl font-black uppercase tracking-wide sm:text-3xl">
          Four ways to play
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {modes.map((m) => (
            <Link
              key={m.name}
              href={play(m.href)}
              className="block rounded-neo border-neo-thick border-black bg-neo-navy-light p-5 text-left shadow-hard transition-transform hover:-translate-x-1 hover:-translate-y-1"
            >
              <span className="font-neo-body text-xs uppercase tracking-widest text-neo-white/60">{m.tag}</span>
              <div className={`font-neo-display text-2xl font-black ${m.accent}`}>{m.name}</div>
              <p className="mt-2 font-neo-body text-sm text-neo-white/90">{m.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* How to play */}
      <section className="mx-auto max-w-4xl px-5 py-12">
        <h2 className="mb-6 text-center font-neo-display text-2xl font-black uppercase tracking-wide sm:text-3xl">
          How to play
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="rounded-neo border-neo-thick border-black bg-neo-navy-light p-5 shadow-hard">
              <div className="grid h-10 w-10 place-items-center rounded-neo border-neo border-black bg-neo-yellow font-neo-display text-xl font-black text-neo-navy">
                {s.n}
              </div>
              <div className="mt-3 font-neo-display text-lg font-black">{s.title}</div>
              <p className="mt-1 font-neo-body text-sm text-neo-white/90">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why WordCraft */}
      <section className="mx-auto max-w-4xl px-5 py-12">
        <h2 className="mb-6 text-center font-neo-display text-2xl font-black uppercase tracking-wide sm:text-3xl">
          Why players love it
        </h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            'Scrabble-deep word play with a fresh territory twist',
            'Heat & overdrive momentum that rewards streaks',
            'Roguelike Card runs — draft power-ups between rounds',
            'Gem Hunt collection mode for combo hunters',
            'Pass-and-play turn-based on one device',
            'Plays in 5 languages, including Hebrew (RTL)',
          ].map((f) => (
            <li key={f} className="flex items-start gap-3 rounded-neo border-neo border-black bg-neo-navy-light p-4 font-neo-body text-sm shadow-hard">
              <span className="text-neo-lime">✦</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-5 py-12">
        <h2 className="mb-6 text-center font-neo-display text-2xl font-black uppercase tracking-wide sm:text-3xl">
          FAQ
        </h2>
        <div className="flex flex-col gap-3">
          {faqs.map((f, idx) => (
            <details
              key={`faq-${idx}`}
              className="group rounded-neo border-neo-thick border-black bg-neo-navy-light shadow-hard open:shadow-hard-lg"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-neo-display font-black uppercase tracking-wide">
                <span>{f.q}</span>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded border-neo border-black bg-neo-yellow text-neo-navy transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <div className="border-t-2 border-black bg-neo-navy/40 px-5 py-4 font-neo-body text-sm text-neo-white/90">
                {f.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-3xl px-5 py-16 text-center">
        <h2 className="font-neo-display text-3xl font-black uppercase tracking-wide sm:text-4xl">
          Ready to craft some words?
        </h2>
        <p className="mx-auto mt-4 max-w-xl font-neo-body text-neo-white/90">
          Free, instant, no download. Jump into a grid and start claiming territory.
        </p>
        <div className="mt-8">
          <Link
            href={play('word-craft')}
            className="inline-block rounded-neo border-neo-thick border-black bg-neo-lime px-10 py-5 font-neo-display text-xl font-black uppercase tracking-wide text-neo-navy shadow-hard-lg transition-transform hover:-translate-x-1 hover:-translate-y-1"
          >
            Play WordCraft free
          </Link>
        </div>
      </section>
    </main>
  );
}
