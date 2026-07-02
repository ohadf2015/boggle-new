import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';

// Keyword landing for the LIVE Blast mode (its play route /blast is a
// noindexed game shell). English body → EN canonical, same convention as
// /word-craft-game. Added 2026-07-02 as part of the AdSense low-value-content
// remediation: every live mode gets one content-rich indexable surface.

const BASE_URL = 'https://www.lexiclash.live';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === 'en';
  const pageUrl = `${BASE_URL}/${locale}/word-blast-game`;
  return {
    title: 'Word Blast — Free Fast-Paced Word Game with Combos | LexiClash',
    description:
      'Play Word Blast free online — a fast word game where back-to-back words build a combo multiplier up to 5x and special tiles blast rows, columns and 3x3 zones. No download, no signup. Survive the waves and chase a high score.',
    keywords:
      'word blast game, fast word game online, word game with combos, tile blast word game, arcade word game free, word game no download, combo word game, timed word game',
    openGraph: {
      title: 'Word Blast — Combos, Chain Reactions, High Scores | LexiClash',
      description:
        'Back-to-back words build your multiplier; fire, ice, bomb and lightning tiles blow up the board. Free, instant, no download.',
      locale: isEn ? 'en_US' : locale,
      type: 'website',
      url: pageUrl,
      siteName: 'LexiClash',
      images: [
        {
          url: `${BASE_URL}/og-image-en.webp`,
          width: 1200,
          height: 630,
          alt: 'Word Blast — Free Fast-Paced Word Game',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Word Blast — Free Fast-Paced Word Game | LexiClash',
      description: 'Chain words, grow the multiplier, blast the board. Free online, no download.',
      images: [`${BASE_URL}/og-image-en.webp`],
    },
    alternates: {
      // English body → consolidate ranking signal onto the EN canonical.
      canonical: isEn ? pageUrl : `${BASE_URL}/en/word-blast-game`,
      languages: {
        'x-default': `${BASE_URL}/en/word-blast-game`,
        en: `${BASE_URL}/en/word-blast-game`,
      },
    },
    robots: isEn ? { index: true, follow: true } : { index: false, follow: true },
  };
}

const faqs = [
  {
    q: 'What is Word Blast?',
    a: 'Word Blast is LexiClash’s fast-paced arcade word mode. You spell words on a letter board to clear tiles before the waves overwhelm you. Submitting words back-to-back builds a combo level that multiplies your score, and special effect tiles trigger chain reactions that blast whole rows, columns and zones.',
  },
  {
    q: 'How does the combo multiplier work?',
    a: 'Every word submitted inside the combo window raises your combo level, scaling your score multiplier from 1x up to 5x and beyond at level 8. The window starts at a comfortable 3 seconds and shrinks toward 1 second at high levels — keeping the chain alive is the whole game.',
  },
  {
    q: 'What do the special tiles do?',
    a: 'Effect tiles do something dramatic when used in a word: fire wipes a full row, ice freezes neighbouring tiles in place, bomb detonates a 3x3 zone, and lightning clears an entire column. Use two effect tiles in one word and both trigger — controlled chaos.',
  },
  {
    q: 'Is Word Blast free to play with no download?',
    a: 'Yes. Word Blast runs instantly in your browser — no download, no signup, no app store. Open the page, tap Play, and the first wave starts.',
  },
  {
    q: 'What happens when I run out of moves?',
    a: 'You get a small stock of lives per run. When a wave beats you, you can revive and keep the run going; when your lives are gone, the run ends and your score is banked. Then you try to beat it.',
  },
  {
    q: 'Any tips for a high score?',
    a: 'Protect the combo above all: a short 3-letter word at combo level 5 outscores a fancy 6-letter word at level 1. Use short words as combo glue while you scan for long ones, and save hints for high combo levels where they preserve a big multiplier.',
  },
];

const tiles = [
  { name: 'Fire', desc: 'Wipes the entire row it sits on.', accent: 'text-neo-orange' },
  { name: 'Bomb', desc: 'Detonates a 3x3 zone around the tile.', accent: 'text-neo-pink' },
  { name: 'Lightning', desc: 'Clears the full column in one strike.', accent: 'text-neo-cyan' },
  { name: 'Ice', desc: 'Freezes neighbouring tiles in place.', accent: 'text-neo-lime' },
];

const steps = [
  { n: '1', title: 'Open Word Blast', text: 'Tap Play — it loads instantly in your browser. No download, no signup.' },
  { n: '2', title: 'Spell fast', text: 'Connect letters to form words and clear tiles. Each word inside the window raises your combo level.' },
  { n: '3', title: 'Blast & survive', text: 'Trigger effect tiles for chain reactions, survive the waves, and bank a high score.' },
];

export default async function WordBlastGameLandingPage({ params }: PageProps) {
  const { locale } = await params;

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
    name: 'How to Play Word Blast',
    description: 'Start playing Word Blast free online in three steps.',
    totalTime: 'PT1M',
    step: steps.map((s) => ({
      '@type': 'HowToStep',
      name: s.title,
      text: s.text,
      url: `${BASE_URL}/${locale}/blast`,
    })),
  });

  const gameJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: 'Word Blast',
    url: `${BASE_URL}/${locale}/word-blast-game`,
    description:
      'A free fast-paced arcade word game: chain words to grow a combo multiplier and trigger fire, ice, bomb and lightning tiles that blast the board.',
    genre: ['Word Game', 'Arcade', 'Puzzle'],
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
      <Script id="ld-wb-faq" type="application/ld+json">{faqJsonLd}</Script>
      <Script id="ld-wb-howto" type="application/ld+json">{howToJsonLd}</Script>
      <Script id="ld-wb-game" type="application/ld+json">{gameJsonLd}</Script>

      {/* Sticker marquee */}
      <div className="overflow-hidden border-y-2 border-black bg-neo-orange">
        <div className="flex whitespace-nowrap py-2 font-neo-display text-sm font-black uppercase tracking-widest text-neo-navy">
          {Array.from({ length: 2 }).map((_, i) => (
            <span key={i} className="flex shrink-0">
              {['No download', 'Play in 5s', 'Free forever', '5x combos', 'Chain reactions', 'Beat the waves'].map((s) => (
                <span key={s} className="mx-4">★ {s}</span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-5 py-14 text-center sm:py-20">
        <h1 className="font-neo-display text-4xl font-black leading-[0.95] sm:text-6xl">
          <span className="bg-neo-orange px-3 text-neo-navy shadow-hard">Word Blast</span>
          <br className="hidden sm:block" />
          <span className="text-neo-white"> — chain words, </span>
          <span className="text-neo-cyan">grow the combo</span>
          <span className="text-neo-white">, </span>
          <span className="text-neo-pink">blast the board</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl font-neo-body text-lg text-neo-white/90">
          A free fast-paced word game where every back-to-back word raises your score
          multiplier and special tiles set off chain reactions. Play instantly — no
          download, no signup.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={`/${locale}/blast`}
            className="rounded-neo border-neo-thick border-black bg-neo-lime px-8 py-4 font-neo-display text-lg font-black uppercase tracking-wide text-neo-navy shadow-hard-lg transition-transform hover:-translate-x-1 hover:-translate-y-1"
          >
            Play free
          </Link>
          <Link
            href={`/${locale}/guides/blast-strategy`}
            className="rounded-neo border-neo-thick border-black bg-neo-pink px-8 py-4 font-neo-display text-lg font-black uppercase tracking-wide text-neo-navy shadow-hard transition-transform hover:-translate-x-1 hover:-translate-y-1"
          >
            Read the strategy guide
          </Link>
        </div>
      </section>

      {/* How it plays */}
      <section className="mx-auto max-w-4xl px-5 pb-14">
        <h2 className="font-neo-display text-2xl font-black uppercase sm:text-3xl">How Word Blast works</h2>
        <p className="mt-4 max-w-3xl font-neo-body text-neo-white/90">
          Waves of letter tiles fill the board. You clear them by spelling words —
          the longer the word, the bigger the base score. But the real points live in
          the <strong>combo meter</strong>: every word submitted inside the shrinking
          combo window raises your level, scaling the multiplier from 1x to 5x and
          beyond. The window starts at 3 seconds and tightens toward 1 second at high
          levels, so the top of the leaderboard belongs to players who keep the chain
          alive with quick, short words while hunting the long ones.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="rounded-neo border-neo-thick border-black bg-neo-navy-light p-5 shadow-hard">
              <div className="font-neo-display text-3xl font-black text-neo-orange">{s.n}</div>
              <h3 className="mt-2 font-neo-display text-lg font-black uppercase">{s.title}</h3>
              <p className="mt-2 font-neo-body text-sm text-neo-white/85">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Effect tiles */}
      <section className="mx-auto max-w-4xl px-5 pb-14">
        <h2 className="font-neo-display text-2xl font-black uppercase sm:text-3xl">Effect tiles = chain reactions</h2>
        <p className="mt-4 max-w-3xl font-neo-body text-neo-white/90">
          Special tiles appear as the waves escalate. Use one inside a word and it
          detonates; use two in the same word and both trigger at once.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {tiles.map((t) => (
            <div key={t.name} className="rounded-neo border-neo-thick border-black bg-neo-navy-light p-5 shadow-hard">
              <h3 className={`font-neo-display text-lg font-black uppercase ${t.accent}`}>{t.name}</h3>
              <p className="mt-2 font-neo-body text-sm text-neo-white/85">{t.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-4xl px-5 pb-16">
        <h2 className="font-neo-display text-2xl font-black uppercase sm:text-3xl">Word Blast FAQ</h2>
        <div className="mt-6 space-y-4">
          {faqs.map((f) => (
            <details key={f.q} className="rounded-neo border-neo-thick border-black bg-neo-navy-light p-5 shadow-hard">
              <summary className="cursor-pointer font-neo-display font-black">{f.q}</summary>
              <p className="mt-3 font-neo-body text-sm text-neo-white/85">{f.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link
            href={`/${locale}/blast`}
            className="inline-block rounded-neo border-neo-thick border-black bg-neo-orange px-8 py-4 font-neo-display text-lg font-black uppercase tracking-wide text-neo-navy shadow-hard-lg transition-transform hover:-translate-x-1 hover:-translate-y-1"
          >
            Start a run — it&apos;s free
          </Link>
        </div>
      </section>
    </main>
  );
}
