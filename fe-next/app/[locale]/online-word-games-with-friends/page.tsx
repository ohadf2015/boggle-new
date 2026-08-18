import type { Metadata } from 'next';
import Link from 'next/link';


interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isTargetLocale = locale === 'en';
  const pageUrl = `${BASE_URL}/en/online-word-games-with-friends`;

  return {
    title: 'Online Word Games With Friends — Free, No Download | LexiClash',
    description: 'Play word games with friends online — create a room, share the link, compete in real-time. 2-20 players, free, no download needed.',
    keywords: 'online word games with friends, play word games with friends, multiplayer word game online, word games for groups, word game with friends free, online multiplayer word games like hanging with friends, word battle with friends, party word game online, word game for groups no download, online free word cloud game multiplayer, word games live with people',
    openGraph: {
      title: 'Play Word Games With Friends Online — Free | LexiClash',
      description: 'Create a room, share the link, compete in real-time word battles. 2-20+ players, no download!',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'LexiClash - Online Word Games With Friends' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Word Games With Friends — Free Multiplayer | LexiClash',
      description: 'Real-time word battles with friends. Create a room, share link, play instantly!',
      images: [`${BASE_URL}/og-image-en.webp`],
    },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': pageUrl,
        en: pageUrl,
      },
    },
    robots: isTargetLocale ? { index: true, follow: true } : { index: false, follow: true },
  };
}

const faqs = [
  {
    q: 'How do I play word games online with friends?',
    a: "It's easy! Go to LexiClash, tap 'Create Room', and share the link with your friends via text, WhatsApp, Discord, or any messenger. Friends click the link and join instantly — no signup or download needed. Up to 20+ players can join.",
  },
  {
    q: 'Is this like Words With Friends but multiplayer?',
    a: "Similar idea but very different gameplay. Words With Friends is turn-based (you wait for each other). LexiClash is real-time — everyone plays the same grid simultaneously, racing to find words. It's faster, more exciting, and better for groups.",
  },
  {
    q: 'What online multiplayer word games are like Hanging With Friends?',
    a: 'LexiClash captures the social, competitive spirit of Hanging With Friends but with richer gameplay. Instead of guessing letters, you find words on a grid in real-time against friends. Plus it has daily challenges, adventure mode, and brain training — all multiplayer.',
  },
  {
    q: 'Can I play word games with friends on different devices?',
    a: 'Yes! LexiClash works in any browser — phone, tablet, laptop, desktop. No app needed. Friends on iPhone can play against friends on Android or desktop. Everyone just needs the room link.',
  },
  {
    q: 'How many friends can play at once?',
    a: 'Up to 20+ players can join a single room. Perfect for large parties, classrooms, team building events, or family game nights. Everyone plays the same grid simultaneously.',
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

export default async function OnlineWordGamesWithFriendsPage({ params }: PageProps) {
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
          Online Word Games With Friends — Play Free
        </h1>

        <p className="mb-8 text-lg leading-relaxed text-neo-gray-200">
          Want to play word games with friends online? LexiClash makes it easy — create a room, share the link,
          and compete in real-time word battles with 2-20+ players. No download, no signup. Like Boggle meets
          Words With Friends, but everyone plays at the same time.
        </p>

        <section className="mb-12 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Link
            href={`/${locale}/multiplayer`}
            className="rounded-neo border-4 border-neo-pink bg-neo-pink px-6 py-3 text-center font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg sm:px-8 sm:py-4"
          >
            Create a Room — Play With Friends
          </Link>
          <Link
            href={`/${locale}/singleplayer`}
            className="rounded-neo border-4 border-neo-cyan bg-transparent px-6 py-3 text-center font-bold text-neo-cyan shadow-hard transition-all hover:bg-neo-cyan/10 sm:px-8 sm:py-4"
          >
            Practice Solo First
          </Link>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">How to Play With Friends</h2>
          <div className="space-y-4">
            {[
              { step: '1', title: 'Create a room', desc: 'Tap "Create Room" and customize your game — grid size, time limit, and game mode.' },
              { step: '2', title: 'Share the link', desc: 'Send the room link or QR code to friends via WhatsApp, Discord, text, or any messenger.' },
              { step: '3', title: 'Play together', desc: 'Everyone sees the same grid and races to find words in real-time. Longest words and fastest fingers win!' },
              { step: '4', title: 'See results', desc: 'After time runs out, see who found the most words, scored the highest, and discovered the rarest finds.' },
            ].map((item) => (
              <div key={item.step} className="flex gap-4 rounded-neo border-3 border-neo-pink bg-neo-navy/50 p-5 shadow-hard">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-3 border-neo-pink font-neo-display text-lg font-bold text-neo-pink">
                  {item.step}
                </span>
                <div>
                  <h3 className="font-neo-display font-bold text-neo-pink">{item.title}</h3>
                  <p className="text-sm text-neo-gray-200">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">Multiplayer Game Modes</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { title: 'Classic Battle', desc: 'Find words on a grid. Highest score wins. The original word battle experience.' },
              { title: 'Word Hunt', desc: 'Find specific target words before your opponents. Strategy meets speed.' },
              { title: 'Blast Mode', desc: 'Chain words into combos for massive scores. Fast and furious word finding.' },
              { title: 'Daily Challenge', desc: 'Everyone plays the same puzzle. Compare scores with friends and the world.' },
            ].map((mode) => (
              <div key={mode.title} className="rounded-neo border-3 border-neo-pink bg-neo-navy/50 p-5 shadow-hard">
                <h3 className="mb-2 font-neo-display text-lg font-bold text-neo-pink">{mode.title}</h3>
                <p className="text-sm text-neo-gray-200">{mode.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <details key={faq.q} className="group rounded-neo border-3 border-neo-gray-400 bg-neo-navy/50 shadow-hard">
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
          <h2 className="mb-4 font-neo-display text-2xl font-bold sm:text-3xl">More Ways to Play</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Link href={`/${locale}/daily-word-wheel`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-lime/40">
              <h3 className="font-bold text-neo-lime">Daily Word Wheel</h3>
              <p className="mt-1 text-xs text-neo-gray-200">Play the daily puzzle and compare scores with friends</p>
            </Link>
            <Link href={`/${locale}/play-boggle-online-free`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-cyan/40">
              <h3 className="font-bold text-neo-cyan">Free Boggle Online</h3>
              <p className="mt-1 text-xs text-neo-gray-200">No download, no signup required</p>
            </Link>
            <Link href={`/${locale}/best-online-word-games`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-pink/40">
              <h3 className="font-bold text-neo-pink">Best Word Games 2026</h3>
              <p className="mt-1 text-xs text-neo-gray-200">Complete comparison guide</p>
            </Link>
            <Link href={`/${locale}/multiplayer-word-game-online`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-lime/40">
              <h3 className="font-bold text-neo-lime">Multiplayer Word Game Online</h3>
              <p className="mt-1 text-xs text-neo-gray-200">Real-time Scrabble alternative — play live</p>
            </Link>
            <Link href={`/${locale}/word-games-online-free`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-cyan/40">
              <h3 className="font-bold text-neo-cyan">Word Games Online Free</h3>
              <p className="mt-1 text-xs text-neo-gray-200">7+ free modes — no download, no signup</p>
            </Link>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="font-neo-display text-2xl font-bold sm:text-3xl">Ready to Play With Friends?</h2>
          <p className="mt-4 text-neo-gray-200">
            Create a room in seconds and invite friends to join. No downloads, no accounts, no hassle.
            Just real-time word battles with the people you want to play with.
          </p>
          <div className="mt-6">
            <Link
              href={`/${locale}/multiplayer`}
              className="inline-block rounded-neo border-4 border-neo-pink bg-neo-pink px-8 py-4 font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg"
            >
              Play With Friends Now — Free
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
