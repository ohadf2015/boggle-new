import type { Metadata } from 'next';
import Link from 'next/link';
import { TopBackLink } from '@/components/navigation/TopBackLink';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';
  // Body is English-only. Canonical always points to /en/ to avoid cross-locale duplicate-content flags.
  const pageUrl = `${BASE_URL}/en/lexiclash-vs-cabanagrams`;

  return {
    title: 'LexiClash vs Cabanagrams — Which Word Game Wins? | LexiClash',
    description: 'LexiClash vs Cabanagrams compared: 30+ game modes, mobile + web, competitive ladder vs single Bananagrams mode, no signup. Free comparison for multiplayer word gamers.',
    keywords: 'lexiclash vs cabanagrams, cabanagrams alternative, multiplayer word game, bananagrams online, word games like cabanagrams, free multiplayer word game, best word game 2026, cabanagrams vs lexiclash',
    openGraph: {
      title: 'LexiClash vs Cabanagrams — Which Word Game Wins in 2026?',
      description: 'Bananagrams meets 30 game modes. Compare features, gameplay, and why competitive word gamers choose LexiClash.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'LexiClash vs Cabanagrams Comparison' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LexiClash vs Cabanagrams — Which Is Better?',
      description: 'Bananagrams online with 30+ modes, mobile, ranked play. Full comparison inside.',
      images: [`${BASE_URL}/og-image-en.webp`],
    },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': `${BASE_URL}/en/lexiclash-vs-cabanagrams`,
        en: `${BASE_URL}/en/lexiclash-vs-cabanagrams`,
      },
    },
    robots: { index: isEnglish, follow: true },
  };
}

// Static FAQ data — all values are hardcoded string literals, safe for JSON-LD serialization
const faqs = [
  {
    q: 'How is LexiClash different from Cabanagrams?',
    a: 'Cabanagrams is a Bananagrams-style word game: you race to build a personal grid of connected tiles. LexiClash is grid-based letter finding: you race to find words by connecting adjacent letters on a shared board. Same "no setup, no scoring, just build words fast" vibe, completely different mechanics. Cabanagrams is beautifully laser-focused on one mode; LexiClash offers 30+ modes and progression systems.',
  },
  {
    q: 'Does LexiClash work on mobile?',
    a: 'Yes, web + Android. Cabanagrams is web-only — no native iOS or Android apps. Both work in your browser. LexiClash is also available as an Android app if you prefer downloading.',
  },
  {
    q: 'Can you play solo in both games?',
    a: 'Cabanagrams: Solo play exists (vs AI at 3 difficulty levels). LexiClash: Extensive solo content — adventure mode with 100+ levels, five brain-training drills, daily challenges, and solo classic games. If you want a game that\'s great solo AND with friends, LexiClash wins. If you just want quick Bananagrams sessions, Cabanagrams is simpler.',
  },
  {
    q: 'What about languages and accessibility?',
    a: 'LexiClash: 6 languages (English, Hebrew with RTL support, Swedish, Japanese, Spanish), WCAG 2.1 AA accessibility standards. Cabanagrams: 11 languages supported, including many European and Asian languages. Cabanagrams has broader language reach; LexiClash uniquely supports Hebrew RTL and combines language with 30+ game modes.',
  },
  {
    q: 'How is progression different?',
    a: 'Cabanagrams: No progression system — each session is independent. Great for casual play. LexiClash: Ranked ladder, daily challenges with leaderboards, adventure campaign with unlocks, brain-drill levels. If you like casual drop-in play, Cabanagrams wins. If you want long-term goals, LexiClash offers it.',
  },
  {
    q: 'What about the business model?',
    a: 'Cabanagrams: Free, donationware (Buy Me a Coffee). Sustains the game via voluntary donations. LexiClash: Free, supported by ads (optional, can be skipped). Both are truly free to play. Cabanagrams is donation-based (great for minimal interruptions); LexiClash offers sustainable freemium with ads and a thriving competitive community.',
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

export default async function LexiClashVsCabanagramsPage({ params }: PageProps) {
  const { locale } = await params;

  return (
    <main className="min-h-screen bg-neo-navy text-neo-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: faqJsonLd }}
      />

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <TopBackLink className="mb-4" />

        <h1 className="mb-6 font-neo-display text-4xl font-bold leading-tight sm:text-5xl">
          LexiClash vs Cabanagrams — Which Word Game Wins?
        </h1>

        <p className="mb-8 text-lg leading-relaxed text-neo-gray-200">
          Both are free, no-signup word games built on the foundation of Bananagrams — build words fast, race other players, no complicated scoring. But they diverge from there. Cabanagrams nails the purist Bananagrams experience in your browser with 11 languages. LexiClash swaps the personal-grid mechanic for shared-board word finding and wraps it in 30+ game modes, progression systems, and mobile apps. Here&apos;s the breakdown.
        </p>

        <section className="mb-12 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Link href={`/${locale}/multiplayer`} className="rounded-neo border-4 border-neo-lime bg-neo-lime px-6 py-3 text-center font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg sm:px-8 sm:py-4">
            Try LexiClash Free
          </Link>
          <Link href={`/${locale}/adventure`} className="rounded-neo border-4 border-neo-cyan bg-transparent px-6 py-3 text-center font-bold text-neo-cyan shadow-hard transition-all hover:bg-neo-cyan/10 sm:px-8 sm:py-4">
            Adventure Mode
          </Link>
          <Link href={`/${locale}/brain`} className="rounded-neo border-4 border-neo-purple bg-transparent px-6 py-3 text-center font-bold text-neo-purple shadow-hard transition-all hover:bg-neo-purple/10 sm:px-8 sm:py-4">
            Brain Drills
          </Link>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">The Honest Comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse rounded-neo border-3 border-neo-gray-400 text-sm sm:text-base">
              <thead>
                <tr className="border-b-3 border-neo-gray-400 bg-neo-navy/80">
                  <th className="px-4 py-3 text-left font-bold text-neo-lime">Feature</th>
                  <th className="px-4 py-3 text-center font-bold text-neo-cyan">LexiClash</th>
                  <th className="px-4 py-3 text-center text-neo-gray-300">Cabanagrams</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Game mechanic', 'Shared grid, connect letters', 'Personal grid, build words'],
                  ['Game modes', '30+', '1 main mode (Bananagrams-style)'],
                  ['Solo vs AI', 'Yes, extensive solo + adventure', 'Yes, 3 difficulty tiers'],
                  ['Multiplayer', 'Real-time, 2-20+ players', 'Real-time, up to 4 players'],
                  ['Languages', '5 (EN, HE, SV, JA, ES)', '11 (broad multilingual support)'],
                  ['RTL support', 'Yes (Hebrew)', 'No'],
                  ['Platforms', 'Web + Android app', 'Web-only'],
                  ['No download needed', 'Yes (browser only)', 'Yes (browser only)'],
                  ['Free to play', 'Completely', 'Completely'],
                  ['Monetization', 'Ad-supported (optional)', 'Donationware (Buy Me a Coffee)'],
                  ['Progression system', 'Ranked ladder, achievements', 'None (session-based)'],
                  ['Daily challenges', 'Yes, with leaderboards', 'Word of the day (varies)'],
                  ['Adventure/Story', 'Yes (100+ levels, boss fights)', 'No'],
                  ['Accessibility', 'WCAG 2.1 AA', 'Standard'],
                ].map(([feature, lexi, cabanagrams]) => (
                  <tr key={feature} className="border-b border-neo-gray-400/50">
                    <td className="px-4 py-3 font-medium">{feature}</td>
                    <td className="px-4 py-3 text-center text-neo-cyan">{lexi}</td>
                    <td className="px-4 py-3 text-center text-neo-gray-300">{cabanagrams}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">What LexiClash Offers That Cabanagrams Doesn&apos;t</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { title: 'Adventure Campaign', desc: '100+ levels, story progression, boss battles, loot upgrades. A full narrative experience that turns word games into exploration.' },
              { title: 'Brain Training Drills', desc: '5 dedicated modes (Memory Hunt, Combo Master, etc.) designed around cognitive improvement, not just competition.' },
              { title: '30+ Game Modes', desc: 'Connections, Wordle-style daily, Blast action mode, party games, ranked competitive, and more. Same skill set, wildly different feels.' },
              { title: 'Native Android App', desc: 'Play from your home screen. Cabanagrams is web-only; LexiClash has a proper Android app with offline access and shortcuts.' },
              { title: 'Ranked Competitive Play', desc: 'ELO ladder, ranked seasons, leaderboards. Cabanagrams is casual drop-in; LexiClash has infrastructure for serious players.' },
              { title: 'Cross-Locale Progression', desc: '6 languages (EN, HE, SV, JA, ES) with full progression sync. Hebrew speakers get a full RTL experience.' },
            ].map((item) => (
              <div key={item.title} className="rounded-neo border-3 border-neo-lime/40 bg-neo-navy/50 p-4 shadow-hard">
                <h3 className="mb-1 font-bold text-neo-lime">{item.title}</h3>
                <p className="text-sm text-neo-gray-200">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">The Gameplay Difference: Shared Grid vs Personal Grid</h2>
          <div className="rounded-neo border-3 border-neo-gray-400 bg-neo-navy/50 p-6 shadow-hard">
            <div className="mb-6">
              <h3 className="mb-2 font-bold text-neo-cyan">Cabanagrams (Personal Grid)</h3>
              <p className="text-neo-gray-200">
                You each get your own grid of random tiles. Your job: rearrange them into a connected, valid word grid as fast as possible. Think Bananagrams — competitive scrabble where setup and strategy matter. You win by finishing first. It&apos;s clever, tactile, and multiplayer-focused but simple in scope.
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-bold text-neo-pink">LexiClash (Shared Grid)</h3>
              <p className="text-neo-gray-200">
                Everyone sees the same grid of random letters (like Boggle). Your job: find as many words as possible by connecting adjacent letters. Unlimited words per round. It&apos;s scanning + pattern recognition + speed. Less chess-like than Cabanagrams, more arcade-like. The same energy (real-time, competitive, frantic) but completely different puzzle-solving path.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">Why Choose Each Game</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-neo border-3 border-neo-cyan bg-neo-navy/50 p-6 shadow-hard">
              <h3 className="mb-3 font-bold text-neo-cyan">Choose Cabanagrams If You Want:</h3>
              <ul className="space-y-2 text-sm text-neo-gray-200">
                <li>Pure Bananagrams experience in your browser</li>
                <li>Minimal, focused gameplay (one great mode)</li>
                <li>11 language options for global play</li>
                <li>No ads, fully supported by donations</li>
                <li>Quick, casual sessions with friends</li>
              </ul>
            </div>
            <div className="rounded-neo border-3 border-neo-lime/40 bg-neo-navy/50 p-6 shadow-hard">
              <h3 className="mb-3 font-bold text-neo-lime">Choose LexiClash If You Want:</h3>
              <ul className="space-y-2 text-sm text-neo-gray-200">
                <li>30+ game modes (variety + replayability)</li>
                <li>Adventure campaign + brain training</li>
                <li>Native Android app (no browser required)</li>
                <li>Ranked competitive play with progression</li>
                <li>Hebrew, Swedish, Japanese support</li>
                <li>Everything for free with optional ads</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <details key={`faq-${idx}-${faq.q}`} className="group rounded-neo border-3 border-neo-gray-400 bg-neo-navy/50 shadow-hard">
                <summary className="flex cursor-pointer items-center justify-between px-6 py-4 font-bold">
                  <span>{faq.q}</span>
                  <span className="text-neo-lime transition-transform group-open:rotate-180">▼</span>
                </summary>
                <div className="border-t border-neo-gray-400 px-6 py-4 text-neo-gray-200">{faq.a}</div>
              </details>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-4 font-neo-display text-2xl font-bold sm:text-3xl">More Comparisons</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Link href={`/${locale}/lexiclash-vs-wordle`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-lime/40">
              <h3 className="font-bold text-neo-cyan">LexiClash vs Wordle</h3>
              <p className="mt-1 text-xs text-neo-gray-200">Unlimited vs 1 puzzle/day</p>
            </Link>
            <Link href={`/${locale}/lexiclash-vs-scrabble`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-lime/40">
              <h3 className="font-bold text-neo-cyan">LexiClash vs Scrabble GO</h3>
              <p className="mt-1 text-xs text-neo-gray-200">No interruptions, no bots</p>
            </Link>
            <Link href={`/${locale}/best-online-word-games`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-lime/40">
              <h3 className="font-bold text-neo-cyan">Best Word Games 2026</h3>
              <p className="mt-1 text-xs text-neo-gray-200">Complete comparison guide</p>
            </Link>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="font-neo-display text-2xl font-bold sm:text-3xl">So Which One?</h2>
          <p className="mt-4 text-neo-gray-200">
            Cabanagrams is a fantastic game. It nails the Bananagrams experience and has incredible language breadth. If you love that personal-grid-building puzzle and want it with real players online, that&apos;s exactly what you get. The donation model is honest and friction-free.
          </p>
          <p className="mt-4 text-neo-gray-200">
            LexiClash is for people who want more: the same multiplayer adrenaline, but also adventure campaigns, brain training, 30+ modes, mobile apps, ranked play, and progression systems. It&apos;s bigger, deeper, and built for players who want to invest hours, not just sessions.
          </p>
          <p className="mt-4 text-neo-gray-200">
            Both are free. Both are real multiplayer. You honestly can&apos;t go wrong. But if you&apos;re scrolling this page, you probably want to see what LexiClash has to offer. Here&apos;s your shot.
          </p>
          <div className="mt-6">
            <Link href={`/${locale}/multiplayer`} className="inline-block rounded-neo border-4 border-neo-lime bg-neo-lime px-8 py-4 font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg">
              Play LexiClash Now — Free, No Download
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
