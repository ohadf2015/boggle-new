import type { Metadata } from 'next';
import Link from 'next/link';

type Locale = 'en' | 'he' | 'sv' | 'ja' | 'es';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const pageUrl = `${BASE_URL}/en/multiplayer-word-game-online`;

  return {
    title: 'Multiplayer Word Game Online Free - Real-Time Boggle & Word Battles | LexiClash',
    description: 'Play the best free multiplayer word game online! Like Boggle, Scrabble, and Wordle combined. Create a room, send a link to friends, and compete in real-time word battles. 10,000+ words, no download required, completely free.',
    keywords: 'multiplayer word game, word game online free, real-time word game, boggle online multiplayer, word game with friends, free word games, online word battles, word game like wordle, word game like scrabble',
    openGraph: {
      title: 'Free Multiplayer Word Game Online - Real-Time Word Battles | LexiClash',
      description: 'Like Boggle, Scrabble & Wordle combined! Create a room, invite friends, compete in real-time. Free, no download.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [
        {
          url: `${BASE_URL}/og-image-en.jpg`,
          width: 1200,
          height: 630,
          alt: 'LexiClash - Free Multiplayer Word Game Online',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Free Multiplayer Word Game Online - LexiClash',
      description: 'Like Boggle, Scrabble & Wordle combined! Create a room, invite friends, compete in real-time.',
      images: [`${BASE_URL}/og-image-en.jpg`],
    },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': `${BASE_URL}/en/multiplayer-word-game-online`,
        en: `${BASE_URL}/en/multiplayer-word-game-online`,
        he: `${BASE_URL}/he/hebrew-multiplayer-word-game`,
        sv: `${BASE_URL}/sv/swedish-multiplayer-word-game`,
        ja: `${BASE_URL}/ja/japanese-word-game`,
        es: `${BASE_URL}/es/juego-de-palabras-multijugador`,
      },
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function MultiplayerWordGameOnlinePage({ params }: PageProps) {
  const { locale } = await params;
  const validLocale = (locale === 'en' ? 'en' : 'en') as Locale;

  const faqs = [
    {
      q: 'How do I start playing multiplayer word games?',
      a: 'Simply click "Create Room" or "Join Room" on the multiplayer page. Share the room link with friends, and you can all start competing in real-time! No account needed.',
    },
    {
      q: 'What makes LexiClash different from other word games?',
      a: 'LexiClash combines the fun of Boggle, Scrabble, and Wordle. Compete in real-time with instant scoring feedback, multiple game modes, boss battles, and daily challenges.',
    },
    {
      q: 'Can I play with friends online for free?',
      a: 'Yes! LexiClash is completely free. Create rooms, invite friends via link, and compete without downloads or registration required.',
    },
    {
      q: 'How many words does LexiClash support?',
      a: 'LexiClash includes 10,000+ words in each language (English, Hebrew, Swedish, and Japanese). Our dictionary is constantly updated.',
    },
    {
      q: 'What are the different game modes?',
      a: 'Play multiplayer rooms, daily challenges, word hunts, blast mode, and more. Each mode has unique rules and scoring.',
    },
  ];

  return (
    <main className="min-h-screen bg-neo-navy text-neo-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map((faq) => ({
              '@type': 'Question',
              name: faq.q,
              acceptedAnswer: {
                '@type': 'Answer',
                text: faq.a,
              },
            })),
          }),
        }}
      />

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="mb-6 font-neo-display text-4xl font-bold leading-tight sm:text-5xl">
          Multiplayer Word Game Online - Real-Time Boggle & Word Battles
        </h1>

        <p className="mb-8 text-lg leading-relaxed text-neo-gray-200">
          Welcome to LexiClash, the ultimate free multiplayer word game online! Whether you love Boggle, Scrabble, or
          Wordle, our real-time word battle platform combines the best features of each. Create a room, send a link to
          your friends, and compete in thrilling word battles instantly. With 10,000+ words in our dictionary, no
          download required, and completely free access, LexiClash is your go-to word game for competitive fun.
        </p>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">
            Why Play LexiClash Multiplayer?
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              'Real-time multiplayer battles with instant scoring',
              'Create rooms and invite friends via shareable link',
              ' 10,000+ word dictionary for rich gameplay',
              'Multiple game modes (Boggle, Hunt, Blast)',
              'Daily challenges with leaderboards',
              'Boss battles with unique twists',
              'Completely free, no downloads needed',
              'Play in 5 languages (EN, HE, SV, JA, ES)',
            ].map((feature, idx) => (
              <div
                key={idx}
                className="flex gap-3 rounded-neo border-3 border-neo-yellow bg-neo-navy/50 p-4 shadow-hard"
              >
                <span className="text-neo-yellow">✓</span>
                <p className="text-sm sm:text-base">{feature}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Link
            href={`/${validLocale}/multiplayer`}
            className="rounded-neo border-4 border-neo-yellow bg-neo-yellow px-6 py-3 font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg sm:px-8 sm:py-4"
          >
            Start Playing Multiplayer
          </Link>
          <Link
            href={`/${validLocale}/singleplayer`}
            className="rounded-neo border-4 border-neo-cyan bg-transparent px-6 py-3 font-bold text-neo-cyan shadow-hard transition-all hover:bg-neo-cyan/10 sm:px-8 sm:py-4"
          >
            Try Singleplayer
          </Link>
          <Link
            href={`/${validLocale}/daily`}
            className="rounded-neo border-4 border-neo-pink bg-transparent px-6 py-3 font-bold text-neo-pink shadow-hard transition-all hover:bg-neo-pink/10 sm:px-8 sm:py-4"
          >
            Daily Challenge
          </Link>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <details
                key={idx}
                className="group rounded-neo border-3 border-neo-gray-400 bg-neo-navy/50 shadow-hard"
              >
                <summary className="flex cursor-pointer items-center justify-between px-6 py-4 font-bold">
                  <span>{faq.q}</span>
                  <span className="text-neo-yellow transition-transform group-open:rotate-180">▼</span>
                </summary>
                <div className="border-t border-neo-gray-400 px-6 py-4 text-neo-gray-200">{faq.a}</div>
              </details>
            ))}
          </div>
        </section>

        <section className="mb-12 max-w-none">
          <h2 className="font-neo-display text-2xl font-bold sm:text-3xl">About LexiClash Multiplayer</h2>
          <p className="mt-4 text-neo-gray-200">
            LexiClash revolutionizes online word gaming by combining the strategic depth of Scrabble, the real-time
            speed of Boggle, and the puzzle satisfaction of Wordle. Our platform is designed for word enthusiasts,
            casual gamers, and competitive players alike.
          </p>
          <p className="mt-4 text-neo-gray-200">
            Play multiplayer word games online with friends, family, or strangers worldwide. Whether you want a quick
            15-minute game or a longer competitive session, LexiClash accommodates all play styles. The intuitive
            interface works on desktop and mobile, letting you play word games anywhere, anytime.
          </p>
          <p className="mt-4 text-neo-gray-200">
            Compete on global leaderboards, earn achievements, and unlock special game modes. Our boss battles add a
            unique PvE twist where players collaborate against AI opponents. Daily challenges offer fresh puzzles every
            day with exclusive rewards.
          </p>
        </section>
      </div>
    </main>
  );
}
