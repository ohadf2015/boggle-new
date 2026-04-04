import type { Metadata } from 'next';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const pageUrl = `${BASE_URL}/en/daily-word-wheel`;

  return {
    title: 'Daily Word Wheel — Free Daily Word Puzzle | LexiClash',
    description: "Play the Daily Word Wheel — a free daily word puzzle where you find words from a wheel of letters. New puzzle every day, compete for the world record. Like Wordle but for word-finding fans. Track your streak, compare scores globally. No download needed.",
    keywords: 'daily word wheel, daily word puzzle, word wheel game, daily word wheel world record, free daily word game, word wheel online, daily word challenge, word puzzle of the day, wordle alternative daily, daily word game free',
    openGraph: {
      title: 'Daily Word Wheel — Free Daily Puzzle | LexiClash',
      description: 'New word wheel puzzle every day. Find all the words, chase the world record. Free, no download!',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'LexiClash Daily Word Wheel' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Daily Word Wheel — Free Daily Puzzle | LexiClash',
      description: 'New word wheel every day. Find words, beat friends, chase the world record!',
      images: [`${BASE_URL}/og-image-en.webp`],
    },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': pageUrl,
        en: pageUrl,
        he: `${BASE_URL}/he/hebrew-multiplayer-word-game`,
        sv: `${BASE_URL}/sv/swedish-multiplayer-word-game`,
        ja: `${BASE_URL}/ja/japanese-word-game`,
        es: `${BASE_URL}/es/juego-de-palabras-multijugador`,
      },
    },
    robots: { index: true, follow: true },
  };
}

const faqs = [
  {
    q: 'What is the Daily Word Wheel?',
    a: "The Daily Word Wheel is a free daily word puzzle on LexiClash. Every day at midnight UTC, a new wheel of letters appears. Your goal is to find as many words as possible using those letters. Everyone worldwide plays the same puzzle, so you can compare scores and compete for the daily world record.",
  },
  {
    q: 'How do I play the Daily Word Wheel?',
    a: 'Visit LexiClash and tap "Daily Challenge" to find the Word Wheel. You get a set of letters arranged in a wheel with one center letter. Form words using the letters — every word must include the center letter. Find as many words as possible before time runs out. Longer words score more points.',
  },
  {
    q: 'Is the Daily Word Wheel free?',
    a: 'Yes, completely free. No download, no signup, no ads interrupting gameplay. Play in your browser on any device. A new puzzle is available every day.',
  },
  {
    q: "Can I see the world record for today's Daily Word Wheel?",
    a: 'Yes! After completing the puzzle, you can see the global leaderboard showing top scores for that day. The world record updates in real-time as players worldwide compete. Track your daily streak to see how many consecutive days you have played.',
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

export default async function DailyWordWheelPage({ params }: PageProps) {
  const { locale } = await params;

  return (
    <main className="min-h-screen bg-neo-navy text-neo-white">
      {/* JSON-LD structured data for FAQ rich results — static content only, no user input */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: faqJsonLd }}
      />

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="mb-6 font-neo-display text-4xl font-bold leading-tight sm:text-5xl">
          Daily Word Wheel — Free Daily Word Puzzle
        </h1>

        <p className="mb-8 text-lg leading-relaxed text-neo-gray-200">
          A new word wheel puzzle every day. Find words from a wheel of letters, compete for the world record,
          and track your daily streak. Like Wordle but for word-finding fans — and it&apos;s free with no download.
        </p>

        <section className="mb-12 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Link
            href={`/${locale}/daily/word-wheel`}
            className="rounded-neo border-4 border-neo-lime bg-neo-lime px-6 py-3 text-center font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg sm:px-8 sm:py-4"
          >
            Play Today&apos;s Word Wheel
          </Link>
          <Link
            href={`/${locale}/leaderboard`}
            className="rounded-neo border-4 border-neo-cyan bg-transparent px-6 py-3 text-center font-bold text-neo-cyan shadow-hard transition-all hover:bg-neo-cyan/10 sm:px-8 sm:py-4"
          >
            View World Record
          </Link>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">How the Daily Word Wheel Works</h2>
          <div className="space-y-4">
            {[
              { step: '1', title: 'New puzzle daily', desc: 'A fresh wheel of letters appears every day at midnight UTC. Everyone worldwide gets the same letters.' },
              { step: '2', title: 'Find words', desc: 'Form words using the wheel letters. Every word must include the center letter. Longer words = more points.' },
              { step: '3', title: 'Beat the clock', desc: 'Find as many words as possible before time runs out. Speed and vocabulary both matter.' },
              { step: '4', title: 'Compare globally', desc: 'See how you rank on the daily leaderboard. Chase the world record and track your streak.' },
            ].map((item) => (
              <div key={item.step} className="flex gap-4 rounded-neo border-3 border-neo-cyan bg-neo-navy/50 p-5 shadow-hard">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-3 border-neo-lime font-neo-display text-lg font-bold text-neo-lime">
                  {item.step}
                </span>
                <div>
                  <h3 className="font-neo-display font-bold text-neo-cyan">{item.title}</h3>
                  <p className="text-sm text-neo-gray-200">{item.desc}</p>
                </div>
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
                  <span className="text-neo-lime transition-transform group-open:rotate-180">&#9660;</span>
                </summary>
                <div className="border-t border-neo-gray-400 px-6 py-4 text-neo-gray-200">{faq.a}</div>
              </details>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="font-neo-display text-2xl font-bold sm:text-3xl">Play Today&apos;s Puzzle</h2>
          <p className="mt-4 text-neo-gray-200">
            The Daily Word Wheel resets every day — don&apos;t miss today&apos;s puzzle! Build your streak,
            improve your vocabulary, and compete with players around the world. Completely free, no download needed.
          </p>
          <div className="mt-6">
            <Link
              href={`/${locale}/daily/word-wheel`}
              className="inline-block rounded-neo border-4 border-neo-lime bg-neo-lime px-8 py-4 font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg"
            >
              Play Daily Word Wheel Now
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
