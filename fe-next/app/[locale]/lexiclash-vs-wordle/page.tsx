import type { Metadata } from 'next';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';
  // Body is English-only. Non-English routes exist only because of the [locale] dynamic segment.
  // Canonical must always point to the English URL to avoid cross-locale duplicate-content flags.
  const pageUrl = `${BASE_URL}/en/lexiclash-vs-wordle`;

  return {
    title: 'LexiClash vs Wordle — Which Word Game Is Better in 2026? | LexiClash',
    description: 'LexiClash vs Wordle compared: multiplayer battles, unlimited plays, adventure mode, and 5 languages vs one puzzle per day. See which word game fits your style.',
    keywords: 'lexiclash vs wordle, wordle alternative, wordle multiplayer, word games like wordle, wordle with friends, unlimited wordle, best word games 2026, wordle vs boggle, word game comparison',
    openGraph: {
      title: 'LexiClash vs Wordle — Full Comparison 2026',
      description: 'One puzzle a day or unlimited word battles? Compare features, gameplay, and why players are switching.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'LexiClash vs Wordle Comparison' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LexiClash vs Wordle — Which Is Better?',
      description: 'One puzzle a day or unlimited word battles? Full comparison inside.',
      images: [`${BASE_URL}/og-image-en.webp`],
    },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': `${BASE_URL}/en/lexiclash-vs-wordle`,
        en: `${BASE_URL}/en/lexiclash-vs-wordle`,
        he: `${BASE_URL}/he/lexiclash-neged-wordle`,
        sv: `${BASE_URL}/sv/swedish-multiplayer-word-game`,
        ja: `${BASE_URL}/ja/japanese-word-game`,
        es: `${BASE_URL}/es/lexiclash-contra-wordle`,
      },
    },
    // Only English body exists; noindex non-en routes so crawler treats /en/ as the single indexable version.
    robots: { index: false, follow: true },
  };
}

// Static FAQ data — all values are hardcoded string literals, safe for JSON-LD serialization
const faqs = [
  {
    q: 'Is LexiClash like Wordle?',
    a: 'Honestly, not really — they just both involve words. Wordle gives you six tries to guess a single 5-letter word using color-coded clues. LexiClash drops you onto a grid of letters and says "go find every word you can, as fast as you can." You can play solo, against bots, or live against friends. Totally different energy.',
  },
  {
    q: 'Can I play LexiClash more than once a day?',
    a: 'As many times as you want. That\u0027s kind of the whole point. Solo rounds, multiplayer lobbies, adventure mode, brain training drills, daily challenges — there\u0027s no artificial limit. Wordle\u0027s one-a-day thing is charming, but sometimes you just want to keep playing.',
  },
  {
    q: 'Does LexiClash have multiplayer?',
    a: 'Yep — real-time, same board, same timer, 2 to 20+ players. You make a room, share a link, and everyone races to find words simultaneously. It gets loud. Wordle is strictly a solo experience (sharing your colored squares on Twitter doesn\u0027t count).',
  },
  {
    q: 'Is LexiClash actually free?',
    a: 'Completely. No account required, no app to download, no subscription. Wordle is technically free too, but it lives inside the NYT Games bundle now ($40/year for the full suite). LexiClash has no paywall and never will.',
  },
  {
    q: 'Which one is better for brain training?',
    a: 'Wordle trains your deductive reasoning once a day, and it\u0027s genuinely good at that. LexiClash gives you five dedicated drill modes (Memory Hunt, Combo Master, Lightning Round, Pattern Switcher, Rare Gems) plus a full adventure mode with boss fights. If you want variety and volume in your daily brain workout, LexiClash has more to offer.',
  },
];

// Static JSON-LD — all content is hardcoded string literals, not user input
const faqJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.q,
    acceptedAnswer: { '@type': 'Answer', text: faq.a },
  })),
});

export default async function LexiClashVsWordlePage({ params }: PageProps) {
  const { locale } = await params;

  return (
    <main className="min-h-screen bg-neo-navy text-neo-white">
      {/* Static JSON-LD for FAQ rich results — hardcoded content only, no user input */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: faqJsonLd }}
      />

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="mb-6 font-neo-display text-4xl font-bold leading-tight sm:text-5xl">
          Wordle Is Brilliant. LexiClash Is What You Play After.
        </h1>

        <p className="mb-8 text-lg leading-relaxed text-neo-gray-200">
          Let&apos;s get this out of the way: Wordle is a masterpiece of game design. One puzzle, five letters, six
          tries, done. It turned the entire internet into word nerds and that rules. But if you&apos;ve ever finished
          your daily Wordle at 8:03 AM and thought <strong>&quot;now what?&quot;</strong> — that&apos;s where LexiClash
          comes in. Unlimited rounds, live multiplayer, a full adventure mode with boss fights, and support for five
          languages. Same word-game brain, completely different animal.
        </p>

        <section className="mb-12 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Link href={`/${locale}/singleplayer`} className="rounded-neo border-4 border-neo-lime bg-neo-lime px-6 py-3 text-center font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg sm:px-8 sm:py-4">
            Try LexiClash Free
          </Link>
          <Link href={`/${locale}/daily`} className="rounded-neo border-4 border-neo-cyan bg-transparent px-6 py-3 text-center font-bold text-neo-cyan shadow-hard transition-all hover:bg-neo-cyan/10 sm:px-8 sm:py-4">
            Daily Challenge
          </Link>
          <Link href={`/${locale}/multiplayer`} className="rounded-neo border-4 border-neo-pink bg-transparent px-6 py-3 text-center font-bold text-neo-pink shadow-hard transition-all hover:bg-neo-pink/10 sm:px-8 sm:py-4">
            Play With Friends
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
                  <th className="px-4 py-3 text-center text-neo-gray-300">Wordle</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Games per day', 'Unlimited', '1'],
                  ['Multiplayer', 'Real-time, 2-20+ players', 'None'],
                  ['Game type', 'Word-finding on grid', 'Letter guessing'],
                  ['Free to play', 'Yes, fully free', 'Yes (part of NYT)'],
                  ['No download needed', 'Yes', 'Yes'],
                  ['Languages', '5 (EN, HE, SV, JA, ES)', '1 (English)'],
                  ['Adventure mode', '100+ levels, boss battles', 'None'],
                  ['Daily challenge', 'Yes + global leaderboard', 'Yes'],
                  ['Brain training', '5 drill modes', 'None'],
                  ['Streak system', 'Yes + streak freeze', 'Yes'],
                  ['Shareable results', 'Emoji grid + challenge link', 'Emoji grid only'],
                  ['Account required', 'No', 'No (optional NYT)'],
                ].map(([feature, lexi, wordle], idx) => (
                  <tr key={idx} className="border-b border-neo-gray-400/50">
                    <td className="px-4 py-3 font-medium">{feature}</td>
                    <td className="px-4 py-3 text-center text-neo-cyan">{lexi}</td>
                    <td className="px-4 py-3 text-center text-neo-gray-300">{wordle}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">What LexiClash Does That Wordle Doesn&apos;t</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { title: 'You Can Actually Keep Playing', desc: 'Wordle gives you one puzzle and says "see you tomorrow." LexiClash has no limit. Solo, multiplayer, adventure mode — play for five minutes or five hours.' },
              { title: 'Multiplayer That Gets Competitive', desc: 'Same board, same timer, everyone racing at once. It turns out word games are way more fun when you can watch your friend panic in real time.' },
              { title: 'A Different Kind of Word Brain', desc: 'Wordle is logic and elimination — genuinely satisfying. LexiClash is pattern recognition and speed. You\u0027re scanning a grid, chaining letters, finding words your brain didn\u0027t know it knew.' },
              { title: 'A Whole Adventure Mode', desc: '100+ levels across 10 worlds, each with a boss that has unique mechanics. Upgrades, loot, progression. It\u0027s a word game with an actual campaign, which sounds absurd until you\u0027re hooked.' },
              { title: 'Play in Your Language', desc: 'English, Hebrew, Swedish, Japanese, and Spanish. Each language has its own dictionary and grid generation. Wordle is English-only (though fan-made clones exist for other languages).' },
              { title: 'No Subscription Creep', desc: 'Wordle got absorbed into the NYT Games bundle — still playable free, but the upsell is always there. LexiClash is free, no account needed, no "unlock premium" popups. Ever.' },
            ].map((item, idx) => (
              <div key={idx} className="rounded-neo border-3 border-neo-lime/40 bg-neo-navy/50 p-4 shadow-hard">
                <h3 className="mb-1 font-bold text-neo-lime">{item.title}</h3>
                <p className="text-sm text-neo-gray-200">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <details key={idx} className="group rounded-neo border-3 border-neo-gray-400 bg-neo-navy/50 shadow-hard">
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
            <Link href={`/${locale}/lexiclash-vs-scrabble`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-lime/40">
              <h3 className="font-bold text-neo-cyan">LexiClash vs Scrabble GO</h3>
              <p className="mt-1 text-xs text-neo-gray-200">No ads, no bots, real players</p>
            </Link>
            <Link href={`/${locale}/best-online-word-games`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-lime/40">
              <h3 className="font-bold text-neo-cyan">Best Word Games 2026</h3>
              <p className="mt-1 text-xs text-neo-gray-200">Complete comparison guide</p>
            </Link>
            <Link href={`/${locale}/play-boggle-online-free`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-lime/40">
              <h3 className="font-bold text-neo-cyan">Play Boggle Online Free</h3>
              <p className="mt-1 text-xs text-neo-gray-200">No download, instant play</p>
            </Link>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="font-neo-display text-2xl font-bold sm:text-3xl">Look, Just Try It</h2>
          <p className="mt-4 text-neo-gray-200">
            If you love Wordle, you&apos;ll probably love this too — it scratches the same part of your brain but
            lets you keep scratching. No download, no signup, no credit card. Open the link, pick a mode, start
            finding words. You&apos;ll know within 30 seconds if it&apos;s your thing.
          </p>
          <div className="mt-6">
            <Link href={`/${locale}/singleplayer`} className="inline-block rounded-neo border-4 border-neo-lime bg-neo-lime px-8 py-4 font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg">
              Play LexiClash Free Now
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
