import type { Metadata } from 'next';
import Link from 'next/link';
import { TopBackLink } from '@/components/navigation/TopBackLink';

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
    description: 'LexiClash vs Puzzly Words compared: simultaneous multiplayer, 30+ game modes, 5 languages vs Scrabble-style rack gameplay. Free comparison for serious word game players.',
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
      description: 'Real-time multiplayer, 30+ modes, 5 languages. Full comparison inside.',
      images: [`${BASE_URL}/og-image-en.webp`],
    },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': `${BASE_URL}/en/lexiclash-vs-puzzly-words`,
        en: `${BASE_URL}/en/lexiclash-vs-puzzly-words`,
        he: `${BASE_URL}/he/lexiclash-vs-puzzly`,
        sv: `${BASE_URL}/sv/swedish-multiplayer-word-game`,
        ja: `${BASE_URL}/ja/japanese-word-game`,
        es: `${BASE_URL}/es/lexiclash-contra-puzzly`,
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
    a: 'LexiClash: 5 languages (English, Hebrew with RTL support, Swedish, Japanese, Spanish), WCAG 2.1 AA accessibility standards. Puzzly Words is English-only as far as we know. If you play in Hebrew or other languages, LexiClash is the only choice.',
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

  return (
    <main className="min-h-screen bg-neo-navy text-neo-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: faqJsonLd }}
      />

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <TopBackLink className="mb-4" />

        <h1 className="mb-6 font-neo-display text-4xl font-bold leading-tight sm:text-5xl">
          LexiClash vs Puzzly Words — Racing for Words
        </h1>

        <p className="mb-8 text-lg leading-relaxed text-neo-gray-200">
          Both are real-time multiplayer word games. Both are intense, competitive, and weirdly addictive. But they play very differently. Puzzly Words puts a 16-letter rack in your hands and asks you to build words fast — it&apos;s Scrabble at 60 mph. LexiClash drops you on a grid and says find words by connecting adjacent letters, race everyone else simultaneously. Same vibe, different beast. Here&apos;s the full breakdown so you can pick your poison.
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
                  <th className="px-4 py-3 text-center text-neo-gray-300">Puzzly Words</th>
                </tr>
              </thead>
              <tbody>
                {[
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
                ].map(([feature, lexi, puzzly]) => (
                  <tr key={feature} className="border-b border-neo-gray-400/50">
                    <td className="px-4 py-3 font-medium">{feature}</td>
                    <td className="px-4 py-3 text-center text-neo-cyan">{lexi}</td>
                    <td className="px-4 py-3 text-center text-neo-gray-300">{puzzly}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">What LexiClash Does That Puzzly Words Doesn&apos;t</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { title: 'Adventure Campaign', desc: '100+ levels across 10 worlds with boss battles, upgrades, and loot. A full story mode that turns word hunting into a journey.' },
              { title: 'Brain Training Drills', desc: '5 dedicated modes (Memory Hunt, Combo Master, etc.) that sharpen specific cognitive skills. Gameplay designed around learning, not just winning.' },
              { title: 'Multilingual & RTL', desc: 'English, Hebrew (full RTL), Swedish, Japanese, Spanish. Play word games in your language. Hebrew speakers especially — this is the only option.' },
              { title: 'Unlimited Game Modes', desc: '30+ modes including Connections, Wordle-style daily, Blast (action), Party games, and more. Same core skill set, wildly different experiences.' },
              { title: 'Global Leaderboards', desc: 'Daily challenges with worldwide rankings. Same idea as Puzzly, but integrated into adventure progression and multiple game types.' },
              { title: 'No App Required', desc: 'Runs in your browser. Open a link, play immediately. Puzzly has apps, which is nice, but a web game is always faster to jump into.' },
            ].map((item) => (
              <div key={item.title} className="rounded-neo border-3 border-neo-lime/40 bg-neo-navy/50 p-4 shadow-hard">
                <h3 className="mb-1 font-bold text-neo-lime">{item.title}</h3>
                <p className="text-sm text-neo-gray-200">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">The Gameplay Difference: Grid vs Rack</h2>
          <div className="rounded-neo border-3 border-neo-gray-400 bg-neo-navy/50 p-6 shadow-hard">
            <div className="mb-6">
              <h3 className="mb-2 font-bold text-neo-cyan">Puzzly Words (Rack Model)</h3>
              <p className="text-neo-gray-200">
                You get a 16-letter rack. Your job: build 1, 2, or 3 words from those letters in 60 seconds. Overlapping counts (building off other words). Think Scrabble but with a timer screaming at you. It&apos;s tense and clever — you actually have to think about which words to build to set yourself up for the next turn.
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-bold text-neo-pink">LexiClash (Grid Model)</h3>
              <p className="text-neo-gray-200">
                You get a grid of random letters (like Boggle). Your job: find as many words as possible by connecting adjacent letters. No limit on how many you can make. It&apos;s scanning + pattern recognition + speed. Less chess-like than Puzzly, more arcade-like. Anyone can find something, but finding everything takes practice.
              </p>
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
            Puzzly Words is a fantastic game. If you love the rack-building, word-placement puzzle of Scrabble and want it live with real players and a 60-second fuse, that&apos;s exactly what you get. Period.
          </p>
          <p className="mt-4 text-neo-gray-200">
            LexiClash is for people who want more variety: the same multiplayer rush, but also story campaigns, brain training, daily challenges, five languages, and the freedom to play as much as they want. It&apos;s bigger, deeper, and weird in the best way.
          </p>
          <p className="mt-4 text-neo-gray-200">
            Both are free. Both are real multiplayer. You honestly can&apos;t go wrong. But if you&apos;re scrolling this page, you probably want to see what LexiClash is about. Here&apos;s your shot.
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
