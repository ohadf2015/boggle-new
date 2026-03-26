import type { Metadata } from 'next';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const pageUrl = `${BASE_URL}/en/play-boggle-online-free`;

  return {
    title: 'Play Boggle Online Free — No Download, No Signup | LexiClash',
    description: 'Play boggle online free with no download — just open your browser and start! Solo vs AI bots or multiplayer with 2-20+ friends in real-time. Multiple grid sizes (4x4, 5x5, 6x6), daily word wheel challenges, adventure mode. The best free Boggle alternative in 2026. Works on phone, tablet, and desktop.',
    keywords: 'play boggle online free no download, boggle online free no download, play boggle online free, free boggle online no download, boggle game free no download, play boggle online free with other players, boggle alternatives 2026, games like boggle online free, word game no download, boggle word shake free, online web based multiplayer words games, word multiplayer',
    openGraph: {
      title: 'Play Boggle Online Free - No Download Needed | LexiClash',
      description: 'Play boggle online free — no download, no signup. Solo or multiplayer with friends. Instant play in your browser!',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [
        {
          url: `${BASE_URL}/og-image-en.jpg`,
          width: 1200,
          height: 630,
          alt: 'LexiClash - Play Boggle Online Free No Download',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Play Boggle Online Free - No Download | LexiClash',
      description: 'Play boggle free online — no download, no signup. Solo or with friends!',
      images: [`${BASE_URL}/og-image-en.jpg`],
    },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': `${BASE_URL}/en/play-boggle-online-free`,
        en: `${BASE_URL}/en/play-boggle-online-free`,
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

// FAQ data — all values are static string literals (safe for JSON serialization)
const faqs = [
  {
    q: 'Can I play Boggle online free with no download?',
    a: 'Yes! LexiClash lets you play boggle online completely free with no download and no signup required. Just visit lexiclash.live and start playing instantly in your browser on any device — phone, tablet, or desktop.',
  },
  {
    q: 'Is this like real Boggle?',
    a: "LexiClash is inspired by Boggle with exciting additions! Like Boggle, you find words by connecting adjacent letters on a grid. But LexiClash adds real-time multiplayer, combo scoring, multiple grid sizes (4x4, 5x5, 6x6), daily challenges, and boss battles — all free.",
  },
  {
    q: 'Can I play with friends online?',
    a: 'Absolutely! Create a room, share the link with friends, and compete in real-time word battles. Up to 20+ players can join. No account required — just share the room code or QR code.',
  },
  {
    q: 'Is LexiClash better than Words With Friends?',
    a: "LexiClash offers a different experience. Unlike Words With Friends (turn-based), LexiClash is real-time — everyone plays simultaneously, making it faster and more exciting. It combines Boggle-style grid word finding with competitive multiplayer. Both are great, but LexiClash is completely free with no ads interrupting gameplay.",
  },
  {
    q: 'What are the best Boggle alternatives online?',
    a: 'LexiClash is one of the best free Boggle alternatives. It offers the classic letter-grid word-finding gameplay plus multiplayer battles, daily challenges, adventure mode with boss fights, and brain training drills. All free, no download needed, available in 5 languages.',
  },
  {
    q: 'Does it work on mobile without downloading an app?',
    a: "Yes! LexiClash works perfectly in your mobile browser — no app download needed. It's optimized for touch screens and works on iOS and Android. You can also install it as a Progressive Web App (PWA) from your browser for an app-like experience.",
  },
];

// Static JSON-LD — all content is hardcoded string literals, not user input
const faqJsonLd = JSON.stringify({
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
});

export default async function PlayBoggleOnlineFreePage({ params }: PageProps) {
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
          Play Boggle Online Free — No Download Required
        </h1>

        <p className="mb-8 text-lg leading-relaxed text-neo-gray-200">
          Looking to play boggle online free with no download? LexiClash is the best free boggle alternative
          you can play instantly in your browser. Find words on a letter grid, challenge AI bots solo, or compete
          with friends in real-time multiplayer battles. Like Words With Friends meets Boggle — but everyone
          plays at the same time! No app to install, no signup needed.
        </p>

        <section className="mb-12 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Link
            href={`/${locale}/singleplayer`}
            className="rounded-neo border-4 border-neo-yellow bg-neo-yellow px-6 py-3 text-center font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg sm:px-8 sm:py-4"
          >
            Play Boggle Solo — Free
          </Link>
          <Link
            href={`/${locale}/multiplayer`}
            className="rounded-neo border-4 border-neo-cyan bg-transparent px-6 py-3 text-center font-bold text-neo-cyan shadow-hard transition-all hover:bg-neo-cyan/10 sm:px-8 sm:py-4"
          >
            Play With Friends
          </Link>
          <Link
            href={`/${locale}/daily`}
            className="rounded-neo border-4 border-neo-pink bg-transparent px-6 py-3 text-center font-bold text-neo-pink shadow-hard transition-all hover:bg-neo-pink/10 sm:px-8 sm:py-4"
          >
            Daily Word Wheel
          </Link>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">
            Why LexiClash Is the Best Free Boggle Online
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              'Play boggle free online — no download, no signup',
              'Solo mode with AI bots at multiple difficulty levels',
              'Real-time multiplayer with 2-20+ players',
              'Multiple grid sizes: 4×4, 5×5, and 6×6',
              'Daily Word Wheel challenge — chase the world record',
              'Combo scoring system for fast word chains',
              'Works on phone, tablet, and desktop browser',
              'Available in 5 languages (EN, HE, SV, JA, ES)',
              'Adventure mode with boss battles and upgrades',
              'Brain training drills to sharpen word skills',
            ].map((feature, idx) => (
              <div
                key={idx}
                className="flex gap-3 rounded-neo border-3 border-neo-yellow bg-neo-navy/50 p-4 shadow-hard"
              >
                <span className="shrink-0 text-neo-yellow">✓</span>
                <p className="text-sm sm:text-base">{feature}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">
            LexiClash vs Boggle vs Words With Friends
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse rounded-neo border-3 border-neo-gray-400 text-sm sm:text-base">
              <thead>
                <tr className="border-b-3 border-neo-gray-400 bg-neo-navy/80">
                  <th className="px-4 py-3 text-left font-bold text-neo-yellow">Feature</th>
                  <th className="px-4 py-3 text-center font-bold text-neo-cyan">LexiClash</th>
                  <th className="px-4 py-3 text-center text-neo-gray-300">Boggle</th>
                  <th className="px-4 py-3 text-center text-neo-gray-300">Words With Friends</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Free to play', '✓', '✗ (board game)', '✓ (with ads)'],
                  ['No download', '✓', '✗', '✗ (app required)'],
                  ['Real-time multiplayer', '✓', '✓ (in person)', '✗ (turn-based)'],
                  ['Online with friends', '✓', '✗', '✓'],
                  ['Daily challenges', '✓', '✗', '✗'],
                  ['Multiple languages', '5 languages', '✗', '✗'],
                  ['Boss battles', '✓', '✗', '✗'],
                  ['Multiple grid sizes', '4×4, 5×5, 6×6', '4×4 only', 'N/A'],
                ].map(([feature, lexi, boggle, wwf], idx) => (
                  <tr key={idx} className="border-b border-neo-gray-400/50">
                    <td className="px-4 py-3 font-medium">{feature}</td>
                    <td className="px-4 py-3 text-center text-neo-cyan">{lexi}</td>
                    <td className="px-4 py-3 text-center text-neo-gray-300">{boggle}</td>
                    <td className="px-4 py-3 text-center text-neo-gray-300">{wwf}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

        <section className="mb-12">
          <h2 className="font-neo-display text-2xl font-bold sm:text-3xl">Start Playing Now</h2>
          <p className="mt-4 text-neo-gray-200">
            Stop searching for &quot;boggle online free no download&quot; — you found it! LexiClash is the best
            free alternative to Boggle and Words With Friends that you can play right now in your browser. No
            app store visit, no account creation, no waiting. Just pure word-finding fun.
          </p>
          <p className="mt-4 text-neo-gray-200">
            Challenge yourself solo against AI bots, compete with friends in real-time multiplayer, or try the
            Daily Word Wheel challenge where everyone worldwide plays the same puzzle. Track your stats, earn
            achievements, and climb the global leaderboard.
          </p>
          <div className="mt-6">
            <Link
              href={`/${locale}/singleplayer`}
              className="inline-block rounded-neo border-4 border-neo-yellow bg-neo-yellow px-8 py-4 font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg"
            >
              Play Free Boggle Now — No Download
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
