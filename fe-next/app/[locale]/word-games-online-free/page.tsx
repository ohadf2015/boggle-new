import type { Metadata } from 'next';
import Link from 'next/link';


interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isTargetLocale = locale === 'en';
  const pageUrl = `${BASE_URL}/en/word-games-online-free`;

  return {
    title: 'Word Games Online Free — Play Instantly, No Download | LexiClash',
    description: 'Play word games online free — no download, no signup. LexiClash offers multiplayer word battles, daily word wheels, word hunts, brain training drills, and adventure mode with boss fights. The best free word game for groups, parties, and classrooms.',
    keywords: 'word games online free, free word games, word games no download, online word games, word puzzle games free, word games for groups, multiplayer word games online free, word games like boggle, word game free no download, brain training word games, daily word puzzle',
    openGraph: {
      title: 'Word Games Online Free — Play Instantly | LexiClash',
      description: 'Free word games you can play instantly — multiplayer battles, daily challenges, adventure mode, brain training. No download needed!',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'LexiClash - Free Word Games Online' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Word Games Online Free — No Download | LexiClash',
      description: 'Play free word games instantly — multiplayer, daily puzzles, adventure mode. No download!',
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
    robots: isTargetLocale ? { index: true, follow: true } : { index: false, follow: true },
  };
}

const faqs = [
  {
    q: 'What free word games can I play online without downloading?',
    a: 'LexiClash offers 7+ word games you can play free in your browser: Classic mode (find words on a grid), Multiplayer battles (2-20+ players), Daily Word Wheel (daily puzzle everyone plays), Word Hunt (find target words), Blast mode (chain combos for high scores), Adventure mode (boss fights and upgrades), and Brain Training drills. All free, no download.',
  },
  {
    q: 'What are the best online word games for groups?',
    a: 'LexiClash is ideal for groups — up to 20+ players can join a room via link or QR code. Everyone plays the same grid simultaneously in real-time. Perfect for parties, family game nights, classrooms, and team building. No accounts needed.',
  },
  {
    q: 'Are these word games good for learning vocabulary?',
    a: 'Yes! LexiClash helps build vocabulary in 5 languages (English, Hebrew, Swedish, Japanese, Spanish). The brain training drills specifically target pattern recognition and word recall. Teachers use it in classrooms for engaging vocabulary practice.',
  },
  {
    q: 'How is LexiClash different from Wordle or Scrabble?',
    a: "Unlike Wordle (one puzzle per day, single player), LexiClash has unlimited games and real-time multiplayer. Unlike Scrabble (turn-based, one word at a time), LexiClash is simultaneous — everyone races to find words on the same grid at the same time. It's faster, more social, and completely free.",
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

export default async function WordGamesOnlineFreePage({ params }: PageProps) {
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
          Word Games Online Free — Play Instantly
        </h1>

        <p className="mb-8 text-lg leading-relaxed text-neo-gray-200">
          Looking for free word games you can play online right now? LexiClash has 7+ word game modes — all free,
          no download, no signup. Play solo against AI, challenge friends in real-time multiplayer, or try
          daily puzzles. Available in 5 languages on any device.
        </p>

        <section className="mb-12 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Link
            href={`/${locale}/singleplayer`}
            className="rounded-neo border-4 border-neo-lime bg-neo-lime px-6 py-3 text-center font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg sm:px-8 sm:py-4"
          >
            Play Free — Solo Mode
          </Link>
          <Link
            href={`/${locale}/multiplayer`}
            className="rounded-neo border-4 border-neo-pink bg-transparent px-6 py-3 text-center font-bold text-neo-pink shadow-hard transition-all hover:bg-neo-pink/10 sm:px-8 sm:py-4"
          >
            Multiplayer With Friends
          </Link>
          <Link
            href={`/${locale}/daily`}
            className="rounded-neo border-4 border-neo-cyan bg-transparent px-6 py-3 text-center font-bold text-neo-cyan shadow-hard transition-all hover:bg-neo-cyan/10 sm:px-8 sm:py-4"
          >
            Daily Challenges
          </Link>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">7+ Free Word Games to Play</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { title: 'Classic Word Battle', desc: 'Find words on a grid — solo or multiplayer. Like Boggle but better.' },
              { title: 'Daily Word Wheel', desc: 'A new puzzle every day. Find words from a wheel of letters. Chase the world record.' },
              { title: 'Word Hunt', desc: 'Find specific target words hidden in the grid before time runs out.' },
              { title: 'Blast Mode', desc: 'Chain combos for explosive scores. Rapid-fire word finding at its best.' },
              { title: 'Adventure Mode', desc: 'Boss battles, upgrades, and quests. An RPG word game experience.' },
              { title: 'Brain Training', desc: '5 drill types to sharpen pattern recognition, memory, and speed.' },
            ].map((game) => (
              <div key={game.title} className="rounded-neo border-3 border-neo-cyan bg-neo-navy/50 p-5 shadow-hard">
                <h3 className="mb-2 font-neo-display text-lg font-bold text-neo-cyan">{game.title}</h3>
                <p className="text-sm text-neo-gray-200">{game.desc}</p>
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
                  <span className="text-neo-lime transition-transform group-open:rotate-180">&#9660;</span>
                </summary>
                <div className="border-t border-neo-gray-400 px-6 py-4 text-neo-gray-200">{faq.a}</div>
              </details>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="font-neo-display text-2xl font-bold sm:text-3xl">Start Playing Free Word Games Now</h2>
          <p className="mt-4 text-neo-gray-200">
            No more searching for word games online free — LexiClash has everything. Multiplayer word battles,
            daily puzzles, brain training, adventure mode, and more. All completely free in your browser.
          </p>
          <div className="mt-6">
            <Link
              href={`/${locale}/singleplayer`}
              className="inline-block rounded-neo border-4 border-neo-lime bg-neo-lime px-8 py-4 font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg"
            >
              Play Free Word Games Now
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
