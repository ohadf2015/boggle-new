import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { TopBackLink } from '@/components/navigation/TopBackLink';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isTargetLocale = locale === 'en';
  const pageUrl = `${BASE_URL}/en/competitive-word-games`;

  return {
    title: 'Best Competitive Word Games with Global Leaderboards (2026) | LexiClash',
    description: 'Compete in word games with global leaderboards — free, no download. Real-time multiplayer, ranked daily challenges, worldwide rankings. Start now →',
    keywords: 'best competitive word games with global leaderboards, competitive word games, word games with leaderboards, ranked word games, multiplayer word game leaderboard, real-time word game competition, free competitive word games online',
    robots: isTargetLocale ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: {
      title: 'Best Competitive Word Games with Global Leaderboards | LexiClash',
      description: 'Real-time multiplayer word battles, ranked daily challenges, a worldwide leaderboard — free, no download.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'LexiClash - Competitive Word Games with Global Leaderboards' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Best Competitive Word Games with Global Leaderboards | LexiClash',
      description: 'Real-time word battles + global leaderboard. Free, no download.',
      images: [`${BASE_URL}/og-image-en.webp`],
    },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': pageUrl,
        en: pageUrl,
      },
    },
  };
}

const faqs = [
  {
    q: 'What are the best competitive word games with global leaderboards?',
    a: 'LexiClash is a free, browser-based competitive word game with a worldwide leaderboard, real-time multiplayer battles for 2-20+ players, and ranked daily challenges where everyone solves the same puzzle. NYT Spelling Bee and Wordle have informal score-sharing, but LexiClash is built around live competition and persistent rankings — no download, no pay-to-win.',
  },
  {
    q: 'Is there a free competitive word game I can play in the browser?',
    a: 'Yes. LexiClash runs entirely in the browser on phone, tablet, or desktop. Create or join a room, race opponents on the same letter grid in real time, and climb the global and daily leaderboards — all free, no signup required to start.',
  },
  {
    q: 'How does the LexiClash global leaderboard work?',
    a: 'Every ranked match and daily challenge feeds a worldwide leaderboard. Daily challenges give all players the identical puzzle so scores are directly comparable, and seasonal rankings reset to keep competition fresh. You can see where you stand globally and against friends.',
  },
  {
    q: 'Can I compete against friends and strangers?',
    a: 'Both. Create a private room and share the link to battle friends directly, or join the public daily challenge to compete against players worldwide on the global leaderboard. Matches are real-time — everyone races the same grid at once, no waiting for turns.',
  },
  {
    q: 'What game modes are good for competitive play?',
    a: 'Multiplayer Grid Battle (real-time head-to-head), the ranked Daily Word Wheel and Daily Word Hunt (same puzzle for everyone, leaderboard-scored), and Party mode for 20+ players. Each feeds into your global ranking.',
  },
];

/* Static JSON-LD — all content is hardcoded string literals, rendered via next/script (no dangerouslySetInnerHTML). */
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
  name: 'LexiClash — Competitive Word Games',
  url: `${BASE_URL}/en/competitive-word-games`,
  description: 'Free real-time multiplayer competitive word game with a global leaderboard and ranked daily challenges. Browser-based, no download, 5 languages.',
  genre: ['Word Game', 'Puzzle', 'Multiplayer'],
  gamePlatform: ['Web Browser', 'Android'],
  playMode: ['MultiPlayer', 'SinglePlayer'],
  numberOfPlayers: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 20 },
  applicationCategory: 'GameApplication',
  operatingSystem: 'Any (Web Browser)',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock', url: `${BASE_URL}/en/multiplayer` },
  publisher: { '@type': 'Organization', name: 'LexiClash', url: BASE_URL },
});

export default async function CompetitiveWordGamesPage({ params }: PageProps) {
  const { locale } = await params;

  return (
    <main className="min-h-screen bg-neo-navy text-neo-white">
      <Script id="ld-faq-competitive" type="application/ld+json">{faqJsonLd}</Script>
      <Script id="ld-videogame-competitive" type="application/ld+json">{videoGameJsonLd}</Script>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <TopBackLink className="mb-4" />

        <h1 className="mb-6 font-neo-display text-4xl font-bold leading-tight sm:text-5xl">
          The Best Competitive Word Games with Global Leaderboards
        </h1>

        <p className="mb-8 text-lg leading-relaxed text-neo-gray-200" data-speakable="true">
          Most word games are solitary — you solve, you close the tab. LexiClash is built the other way
          around: real-time multiplayer battles, ranked daily challenges where everyone gets the same
          puzzle, and a worldwide leaderboard that actually means something. It is free, runs in any
          browser, and there are no pay-to-win boosts deciding the match. If you want competitive word
          games with global leaderboards, this is the short list — and you can start a match right now.
        </p>

        <section className="mb-12 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Link
            href={`/${locale}/multiplayer`}
            className="rounded-neo border-4 border-neo-pink bg-neo-pink px-6 py-3 text-center font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg sm:px-8 sm:py-4"
          >
            Play a Ranked Match
          </Link>
          <Link
            href={`/${locale}/leaderboard`}
            className="rounded-neo border-4 border-neo-yellow bg-transparent px-6 py-3 text-center font-bold text-neo-yellow shadow-hard transition-all hover:bg-neo-yellow/10 sm:px-8 sm:py-4"
          >
            View Global Leaderboard
          </Link>
          <Link
            href={`/${locale}/daily-word-wheel`}
            className="rounded-neo border-4 border-neo-lime bg-transparent px-6 py-3 text-center font-bold text-neo-lime shadow-hard transition-all hover:bg-neo-lime/10 sm:px-8 sm:py-4"
          >
            Ranked Daily Challenge
          </Link>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">
            What Makes a Word Game Genuinely Competitive
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { title: 'Real-time, not turn-based', desc: 'Everyone races the same grid at once. No four-day waits between turns — a match ends in 2-3 minutes.' },
              { title: 'A leaderboard that persists', desc: 'Daily and seasonal global rankings. Your score is comparable because everyone solved the identical puzzle.' },
              { title: 'No pay-to-win', desc: 'No bought power-ups freezing the clock or revealing words. Skill decides the match, not your wallet.' },
              { title: 'Same puzzle for everyone', desc: 'Ranked daily challenges hand every player the exact same board, so the leaderboard reflects real skill.' },
            ].map((item) => (
              <div key={item.title} className="rounded-neo border-3 border-neo-pink bg-neo-navy/50 p-5 shadow-hard">
                <h3 className="mb-1 font-bold text-neo-pink">{item.title}</h3>
                <p className="text-sm text-neo-gray-200">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">
            Competitive Game Modes on LexiClash
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href={`/${locale}/multiplayer`} className="rounded-neo border-3 border-neo-pink/50 bg-neo-navy/50 p-5 shadow-hard transition-all hover:border-neo-pink">
              <h3 className="font-bold text-neo-pink">Multiplayer Grid Battle</h3>
              <p className="mt-1 text-sm text-neo-gray-200">Real-time head-to-head for 2-20+ players on a shared grid. The core competitive mode.</p>
            </Link>
            <Link href={`/${locale}/daily-word-wheel`} className="rounded-neo border-3 border-neo-lime/50 bg-neo-navy/50 p-5 shadow-hard transition-all hover:border-neo-lime">
              <h3 className="font-bold text-neo-lime">Daily Word Wheel</h3>
              <p className="mt-1 text-sm text-neo-gray-200">Same puzzle for everyone, every day. Leaderboard-scored — pure skill comparison.</p>
            </Link>
            <Link href={`/${locale}/daily`} className="rounded-neo border-3 border-neo-cyan/50 bg-neo-navy/50 p-5 shadow-hard transition-all hover:border-neo-cyan">
              <h3 className="font-bold text-neo-cyan">Daily Word Hunt</h3>
              <p className="mt-1 text-sm text-neo-gray-200">A daily target-word hunt on a Boggle-style grid. Ranked on the global board.</p>
            </Link>
            <Link href={`/${locale}/leaderboard`} className="rounded-neo border-3 border-neo-yellow/50 bg-neo-navy/50 p-5 shadow-hard transition-all hover:border-neo-yellow">
              <h3 className="font-bold text-neo-yellow">Global Leaderboard</h3>
              <p className="mt-1 text-sm text-neo-gray-200">Where every ranked match and daily challenge lands. See your worldwide standing.</p>
            </Link>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <details key={`faq-${idx}-${faq.q}`} className="group rounded-neo border-3 border-neo-gray-400 bg-neo-navy/50 shadow-hard">
                <summary className="flex cursor-pointer items-center justify-between px-6 py-4 font-bold">
                  <span>{faq.q}</span>
                  <span className="text-neo-yellow transition-transform group-open:rotate-180">&#9660;</span>
                </summary>
                <div className="border-t border-neo-gray-400 px-6 py-4 text-neo-gray-200" data-speakable="true">{faq.a}</div>
              </details>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-4 font-neo-display text-2xl font-bold sm:text-3xl">More Word Games</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Link href={`/${locale}/blog/most-popular-word-games-2026`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-cyan/40">
              <h3 className="font-bold text-neo-cyan">Most Popular Word Games 2026</h3>
              <p className="mt-1 text-xs text-neo-gray-200">The games everyone is playing — and why</p>
            </Link>
            <Link href={`/${locale}/best-online-word-games`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-lime/40">
              <h3 className="font-bold text-neo-lime">Best Online Word Games</h3>
              <p className="mt-1 text-xs text-neo-gray-200">9 honest picks, no download</p>
            </Link>
            <Link href={`/${locale}/multiplayer-word-game-online`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-pink/40">
              <h3 className="font-bold text-neo-pink">Multiplayer Word Game Online</h3>
              <p className="mt-1 text-xs text-neo-gray-200">Real-time, browser-based, free</p>
            </Link>
          </div>
        </section>

        <section>
          <h2 className="font-neo-display text-2xl font-bold sm:text-3xl">Climb the Leaderboard Now</h2>
          <p className="mt-4 text-neo-gray-200">
            Stop searching for &quot;competitive word games with global leaderboards&quot; — you found the
            one that is free, real-time, and runs in your browser. Play a ranked match and see where you
            land worldwide.
          </p>
          <div className="mt-6">
            <Link
              href={`/${locale}/multiplayer`}
              className="inline-block rounded-neo border-4 border-neo-pink bg-neo-pink px-8 py-4 font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg"
            >
              Play a Ranked Match
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
