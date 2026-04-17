import type { Metadata } from 'next';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isTargetLocale = locale === 'en';
  const pageUrl = `${BASE_URL}/en/words-with-friends-alternative`;

  return {
    title: 'Words With Friends Alternative — Real-Time Free | LexiClash',
    description: 'Skip the waiting. LexiClash is a free word game where 2-20 players compete on the same grid at the same time. No turns, no download, no ads. Play in 30 seconds.',
    keywords: 'words with friends multiplayer free online, words with friends alternative, word games multiplayer, multiplayer word games online, free word game with friends online, word game like words with friends, online multiplayer word games like hanging with friends, word battle online free, online word games with friends free, web word games with friends, spell game with friends online',
    openGraph: {
      title: 'Words With Friends Alternative — Real-Time Multiplayer | LexiClash',
      description: 'Free multiplayer word game — everyone plays at once, not turn-based. No download needed!',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'LexiClash - Words With Friends Alternative' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Words With Friends Alternative — Free Online | LexiClash',
      description: 'Real-time multiplayer word battles — not turn-based. Free, no download!',
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
    robots: { index: false, follow: true },
  };
}

const faqs = [
  {
    q: 'Is LexiClash like Words With Friends?',
    a: 'LexiClash is a multiplayer word game like Words With Friends, but with a key difference: everyone plays simultaneously in real-time instead of taking turns. You compete on the same letter grid at the same time, making it faster and more exciting. No waiting for your friend to take their turn!',
  },
  {
    q: 'Can I play word games with friends free online?',
    a: 'Yes! LexiClash is completely free to play online with friends. No download, no signup, no ads interrupting gameplay. Create a room, share the link, and start playing in seconds. Works on any device with a browser.',
  },
  {
    q: 'What makes LexiClash better than Words With Friends?',
    a: 'LexiClash offers real-time gameplay (not turn-based), supports 2-20+ players at once (great for parties), works in 5 languages, requires no app download, and includes unique modes like adventure with boss battles, daily challenges, and brain training drills.',
  },
  {
    q: 'Are there online multiplayer word games like Hanging With Friends?',
    a: 'LexiClash captures the competitive social spirit of Hanging With Friends with richer gameplay. Instead of guessing letters, you find words on a grid in real-time against friends. It also has daily challenges, adventure mode, and brain training — all multiplayer-ready.',
  },
  {
    q: 'Do I need to download an app?',
    a: 'No download needed! LexiClash runs entirely in your web browser. Works on iPhone, Android, tablet, laptop, and desktop. You can optionally install it as a Progressive Web App for an app-like experience, but it is not required.',
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

export default async function WordsWithFriendsAlternativePage({ params }: PageProps) {
  const { locale } = await params;
  const isTargetLocale = locale === 'en';

  return (
    <main className="min-h-screen bg-neo-navy text-neo-white">
      {/* Static JSON-LD structured data for FAQ rich results — hardcoded content only, no user input */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: faqJsonLd }}
      />

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="mb-6 font-neo-display text-4xl font-bold leading-tight sm:text-5xl">
          Words With Friends Alternative — Play Free Online
        </h1>

        <p className="mb-8 text-lg leading-relaxed text-neo-gray-200">
          Love Words With Friends but want something faster? LexiClash is a free multiplayer word game
          where everyone plays at the same time — no waiting for turns. Create a room, share the link,
          and battle friends in real-time word finding. No download, no signup, no ads.
        </p>

        <section className="mb-12 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Link
            href={`/${locale}/multiplayer`}
            className="rounded-neo border-4 border-neo-pink bg-neo-pink px-6 py-3 text-center font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg sm:px-8 sm:py-4"
          >
            Play Multiplayer Free
          </Link>
          <Link
            href={`/${locale}/singleplayer`}
            className="rounded-neo border-4 border-neo-cyan bg-transparent px-6 py-3 text-center font-bold text-neo-cyan shadow-hard transition-all hover:bg-neo-cyan/10 sm:px-8 sm:py-4"
          >
            Try Solo Mode
          </Link>
          <Link
            href={`/${locale}/daily`}
            className="rounded-neo border-4 border-neo-lime bg-transparent px-6 py-3 text-center font-bold text-neo-lime shadow-hard transition-all hover:bg-neo-lime/10 sm:px-8 sm:py-4"
          >
            Daily Challenge
          </Link>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">
            LexiClash vs Words With Friends
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse rounded-neo border-3 border-neo-gray-400 text-sm sm:text-base">
              <thead>
                <tr className="border-b-3 border-neo-gray-400 bg-neo-navy/80">
                  <th className="px-4 py-3 text-left font-bold text-neo-lime">Feature</th>
                  <th className="px-4 py-3 text-center font-bold text-neo-cyan">LexiClash</th>
                  <th className="px-4 py-3 text-center text-neo-gray-300">Words With Friends</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Gameplay', 'Real-time (simultaneous)', 'Turn-based (waiting)'],
                  ['Players per game', '2-20+', '2'],
                  ['Price', 'Free, no ads', 'Free with ads'],
                  ['Download required', 'No (browser)', 'Yes (app store)'],
                  ['Languages', '5 (EN, HE, SV, JA, ES)', '1 (English)'],
                  ['Daily challenges', 'Yes (Wordle-style)', 'No'],
                  ['Adventure mode', 'Yes (boss battles)', 'No'],
                  ['Party mode', 'Yes (20+ players)', 'No'],
                ].map(([feature, lexi, wwf], idx) => (
                  <tr key={idx} className="border-b border-neo-gray-400/50">
                    <td className="px-4 py-3 font-medium">{feature}</td>
                    <td className="px-4 py-3 text-center text-neo-cyan">{lexi}</td>
                    <td className="px-4 py-3 text-center text-neo-gray-300">{wwf}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">
            Why Players Switch From Words With Friends
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { title: 'No More Waiting', desc: 'Everyone plays the same grid simultaneously. Games take 2-3 minutes, not days.' },
              { title: 'Play With Groups', desc: 'Up to 20+ players in one room. Perfect for parties, family nights, and team building.' },
              { title: 'Zero Downloads', desc: 'Open a browser and play. Send a link to friends — they join instantly. No app store.' },
              { title: 'Multiple Languages', desc: 'Play in English, Hebrew, Swedish, Japanese, or Spanish with full dictionaries.' },
              { title: 'No Ads In Gameplay', desc: 'No interstitial ads interrupting your game. Just pure word-finding competition.' },
              { title: 'Unique Game Modes', desc: 'Adventure with boss battles, daily challenges, brain training, and blast mode — not just grid matches.' },
            ].map((item, idx) => (
              <div key={idx} className="rounded-neo border-3 border-neo-pink bg-neo-navy/50 p-5 shadow-hard">
                <h3 className="mb-2 font-neo-display font-bold text-neo-pink">{item.title}</h3>
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
                  <span className="text-neo-pink transition-transform group-open:rotate-180">&#9660;</span>
                </summary>
                <div className="border-t border-neo-gray-400 px-6 py-4 text-neo-gray-200">{faq.a}</div>
              </details>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-4 font-neo-display text-2xl font-bold sm:text-3xl">Compare More Word Games</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Link href={`/${locale}/lexiclash-vs-wordle`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-lime/40">
              <h3 className="font-bold text-neo-cyan">LexiClash vs Wordle</h3>
              <p className="mt-1 text-xs text-neo-gray-200">Unlimited play vs 1 puzzle/day</p>
            </Link>
            <Link href={`/${locale}/lexiclash-vs-scrabble`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-lime/40">
              <h3 className="font-bold text-neo-cyan">LexiClash vs Scrabble</h3>
              <p className="mt-1 text-xs text-neo-gray-200">Real-time vs turn-based</p>
            </Link>
            <Link href={`/${locale}/play-boggle-online-free`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-lime/40">
              <h3 className="font-bold text-neo-cyan">Free Boggle Online</h3>
              <p className="mt-1 text-xs text-neo-gray-200">No download, play instantly</p>
            </Link>
            <Link href={`/${locale}/daily-word-wheel`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-lime/40">
              <h3 className="font-bold text-neo-lime">Daily Word Wheel</h3>
              <p className="mt-1 text-xs text-neo-gray-200">New puzzle daily — free to play</p>
            </Link>
          </div>
        </section>

        <section>
          <h2 className="font-neo-display text-2xl font-bold sm:text-3xl">Ready to Try Something Better?</h2>
          <p className="mt-4 text-neo-gray-200">
            LexiClash is the free Words With Friends alternative that plays faster, supports more players,
            and works in your browser. No download, no signup — just share a link and play.
          </p>
          <div className="mt-6">
            <Link
              href={`/${locale}/multiplayer`}
              className="inline-block rounded-neo border-4 border-neo-pink bg-neo-pink px-8 py-4 font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg"
            >
              Play Free — No Download
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
