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
  const isTargetLocale = locale === 'en';
  const pageUrl = `${BASE_URL}/en/boggle-word-shake-free`;

  return {
    title: 'Boggle WordShake Free Online — Play Boggle Shake | LexiClash',
    description: 'Shake the letter grid, find hidden words, score combos. Play Boggle Word Shake free — instant browser play, no download, no signup. Solo or challenge 2–20 friends live.',
    keywords: 'boggle wordshake, boggle shake, boggle shake free, wordshake boggle, play boggle shake online, free boggle online no download, boggle word shake free no download, boggle word shake online, word shake game free, boggle shake free online, word scramble game free no download, boggle word game free, word shake multiplayer',
    robots: isTargetLocale ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: {
      title: 'Boggle Word Shake Free — Play Online | LexiClash',
      description: 'Shake the grid, find words, compete with friends. Free, no download!',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'LexiClash - Boggle Word Shake Free' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Boggle Word Shake Free — No Download | LexiClash',
      description: 'Shake, find words, score — free online Boggle alternative!',
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
  };
}

const faqs = [
  {
    q: 'What is Boggle Word Shake?',
    a: 'Boggle Word Shake is a word-finding game where letters are scrambled on a grid and you find words by connecting adjacent letters. LexiClash brings this classic gameplay online — free, no download, with multiplayer support for up to 20 players.',
  },
  {
    q: 'Can I play Boggle Word Shake free with no download?',
    a: 'Yes! LexiClash runs entirely in your browser. No app download, no signup. Just visit the site and start playing instantly on phone, tablet, or desktop.',
  },
  {
    q: 'How is this different from the original Boggle Word Shake app?',
    a: 'LexiClash offers the same word-shake gameplay plus real-time multiplayer (2-20+ players), multiple grid sizes (4x4, 5x5, 6x6), daily challenges, combo scoring, and 5-language support — all free with no pay-to-win boosts.',
  },
  {
    q: 'Can I play Boggle Word Shake with friends online?',
    a: 'Absolutely! Create a room, share the link, and everyone plays the same scrambled grid simultaneously. No waiting for turns — everyone races to find words at the same time.',
  },
  {
    q: 'Is there a daily Boggle Word Shake challenge?',
    a: 'Yes! The Daily Word Wheel gives everyone the same puzzle each day. Find all possible words and compare your score on the global leaderboard.',
  },
];

/* Static JSON-LD structured data — all content is hardcoded string literals, safe for serialization */
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
  name: 'How to Play Boggle Word Shake Free Online',
  description: 'Start playing free online Boggle Word Shake in 3 simple steps.',
  totalTime: 'PT1M',
  step: [
    { '@type': 'HowToStep', name: 'Open LexiClash', text: 'Visit lexiclash.live in any browser. No download or signup needed.' },
    { '@type': 'HowToStep', name: 'Start a game', text: 'Choose Solo mode or create a multiplayer room and share the link with friends.' },
    { '@type': 'HowToStep', name: 'Shake & find words', text: 'The grid scrambles with random letters. Connect adjacent letters to form words. Longer words and fast combos score more!' },
  ],
});

export default async function BoggleWordShakeFreePage({ params }: PageProps) {
  const { locale } = await params;

  return (
    <main className="min-h-screen bg-neo-navy text-neo-white">
      {/* JSON-LD: static hardcoded content only, no user input — safe for inline serialization */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJsonLd }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: howToJsonLd }} />

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <TopBackLink className="mb-4" />

        <h1 className="mb-6 font-neo-display text-4xl font-bold leading-tight sm:text-5xl">
          Boggle Shake Free Online — Play in Browser, No Download
        </h1>

        <p className="mb-8 text-lg leading-relaxed text-neo-gray-200">
          Miss the classic Boggle Shake game? LexiClash brings the same scramble-and-find gameplay to your browser —
          completely free, no download required. Shake up a grid of letters, find as many words as you can, and compete
          against friends or AI bots in real-time. Looking for free boggle online no download? You found it. Choose from
          4x4, 5x5, or 6x6 grids with combo scoring for extra challenge.
        </p>

        <section className="mb-12 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Link
            href={`/${locale}/singleplayer`}
            className="rounded-neo border-4 border-neo-yellow bg-neo-yellow px-6 py-3 text-center font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg sm:px-8 sm:py-4"
          >
            Play Word Shake Solo — Free
          </Link>
          <Link
            href={`/${locale}/multiplayer`}
            className="rounded-neo border-4 border-neo-cyan bg-transparent px-6 py-3 text-center font-bold text-neo-cyan shadow-hard transition-all hover:bg-neo-cyan/10 sm:px-8 sm:py-4"
          >
            Play With Friends
          </Link>
          <Link
            href={`/${locale}/daily-word-wheel`}
            className="rounded-neo border-4 border-neo-lime bg-transparent px-6 py-3 text-center font-bold text-neo-lime shadow-hard transition-all hover:bg-neo-lime/10 sm:px-8 sm:py-4"
          >
            Daily Word Wheel
          </Link>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">
            How to Play Boggle Word Shake Online
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { step: '1', title: 'Open LexiClash', desc: 'Visit lexiclash.live — works on any device. No download or signup.' },
              { step: '2', title: 'Start a Game', desc: 'Play solo vs AI bots, or create a room and invite 2-20+ friends via link.' },
              { step: '3', title: 'Shake & Find Words', desc: 'Letters scramble on the grid. Connect adjacent letters to form words. Longer = more points!' },
            ].map((item) => (
              <div key={item.step} className="rounded-neo border-3 border-neo-cyan bg-neo-navy/50 p-5 shadow-hard">
                <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full border-3 border-neo-cyan bg-neo-cyan/20 font-bold text-neo-cyan">
                  {item.step}
                </div>
                <h3 className="mb-1 font-bold text-neo-cyan">{item.title}</h3>
                <p className="text-sm text-neo-gray-200">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">
            Why LexiClash Beats the Original Word Shake
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              'Same scramble-and-find gameplay you love',
              'Real-time multiplayer with 2-20+ players',
              'Multiple grid sizes: 4x4, 5x5, 6x6',
              'Combo scoring for fast word chains',
              'No download — plays in any browser',
              'Daily challenges with global leaderboard',
              'Available in 5 languages',
              'Adventure mode with boss battles',
            ].map((feature) => (
              <div key={feature} className="flex gap-3 rounded-neo border-3 border-neo-yellow bg-neo-navy/50 p-4 shadow-hard">
                <span className="shrink-0 text-neo-yellow">&#10003;</span>
                <p className="text-sm sm:text-base">{feature}</p>
              </div>
            ))}
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
                <div className="border-t border-neo-gray-400 px-6 py-4 text-neo-gray-200">{faq.a}</div>
              </details>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-4 font-neo-display text-2xl font-bold sm:text-3xl">More Word Games</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Link href={`/${locale}/play-boggle-online-free`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-cyan/40">
              <h3 className="font-bold text-neo-cyan">Play Boggle Online Free</h3>
              <p className="mt-1 text-xs text-neo-gray-200">The full free Boggle experience</p>
            </Link>
            <Link href={`/${locale}/daily-word-wheel`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-lime/40">
              <h3 className="font-bold text-neo-lime">Daily Word Wheel</h3>
              <p className="mt-1 text-xs text-neo-gray-200">New puzzle every day</p>
            </Link>
            <Link href="/en/words-with-friends-alternative" className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-pink/40">
              <h3 className="font-bold text-neo-pink">vs Words With Friends</h3>
              <p className="mt-1 text-xs text-neo-gray-200">Real-time, not turn-based</p>
            </Link>
          </div>
        </section>

        <section>
          <h2 className="font-neo-display text-2xl font-bold sm:text-3xl">Start Shaking Words Now</h2>
          <p className="mt-4 text-neo-gray-200">
            No need to search for &quot;boggle word shake free no download&quot; anymore — you found it.
            Play the best free Boggle Word Shake alternative right now in your browser.
          </p>
          <div className="mt-6">
            <Link
              href={`/${locale}/singleplayer`}
              className="inline-block rounded-neo border-4 border-neo-yellow bg-neo-yellow px-8 py-4 font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg"
            >
              Play Boggle Word Shake Free
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
