import type { Metadata } from 'next';
import Link from 'next/link';
import { TopBackLink } from '@/components/navigation/TopBackLink';
import BoggleWordShakeGameClient from './PageClient';

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
    description: 'Word shake boggle is classic Boggle (Parker Brothers, 1973): 16 cubes, a 4x4 dome, 3 minutes. LexiClash plays the shake-and-find game free in the browser — no download.',
    keywords: 'word shake boggle, wordplay boggle shake, boggle wordshake, boggle shake, boggle shake free, wordshake boggle, play boggle shake online, free boggle online no download, boggle word shake free no download, boggle word shake online, word shake game free, boggle shake free online, word scramble game free no download, boggle word game free, word shake multiplayer',
    robots: isTargetLocale ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: {
      title: 'Boggle Word Shake Free — Play Online | LexiClash',
      description: 'Word shake boggle is classic Boggle (Parker Brothers, 1973): 16 cubes, a 4x4 dome, 3 minutes. Free, no download.',
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
      },
    },
  };
}

const WORD_SHAKE_BOGGLE_ANSWER =
  'Word shake boggle is the letter-cube game people mean when they search for a shaken word grid: classic Boggle, designed by Allan Turoff and released by Parker Brothers in 1973, shakes 16 letter cubes into a 4x4 dome and gives players 3 minutes to find words of at least 3 letters by linking cubes that touch on a side or a corner. A cube may be used only once in a word, the Qu face counts as two letters, and in group play a word found by more than one player scores for nobody. Classic Boggle scoring is 1 point for a 3- or 4-letter word, 2 points for 5 letters, 3 for 6, 5 for 7, and 11 for 8 or more. The same query also reaches classroom Word Shake generators, which do not shake dice: as of 22 October 2026 the Edu-Games Word Shake tool prints a 3x3, 4x4, or 5x5 grid from a teacher vocabulary list and offers a PDF solution page. LexiClash, at lexiclash.live, plays the shake-and-find game free in the browser with no download and no signup. LexiClash boards are 5x5, 6x6, and 7x7, the standard solo round lasts 120 seconds, the shortest counted word is 2 letters, a 3-letter word scores 10 points before combos, and a room holds up to 50 players. Boggle is a Hasbro trademark. LexiClash is an independent game, not the Hasbro app and not a printable worksheet.';

const WORDPLAY_BOGGLE_SHAKE_ANSWER =
  'Wordplay boggle shake is the opening move of classic Boggle, the letter-cube game Allan Turoff designed and Parker Brothers released in 1973. Sixteen letter cubes sit in a 4x4 grid under a clear dome. Players shake the dome so each cube shows one letter, then have 3 minutes to find words of at least 3 letters by linking letters that touch on a side or a corner. A cube may be used only once in a word, and the Qu face counts as two letters. Classic Boggle scoring is 1 point for a 3- or 4-letter word, 2 points for 5 letters, 3 for 6, 5 for 7, and 11 for 8 or more. LexiClash plays that same shake-and-find game free in the browser at lexiclash.live, with no download, no signup, 5x5, 6x6, and 7x7 boards, and live rooms for up to 50 players. Wordplay boggle shake is the game you shake, not the dictionary verb boggle (to be overwhelmed, from the old word bogle).';

const classicBoggleScoring = [
  { letters: '3-4', points: '1' },
  { letters: '5', points: '2' },
  { letters: '6', points: '3' },
  { letters: '7', points: '5' },
  { letters: '8+', points: '11' },
];

const wordShakeVsBoggle = [
  { label: 'Grid', classic: '16 cubes, 4x4 dome', classroom: '3x3, 4x4, or 5x5 printable', lexiclash: '5x5, 6x6, 7x7' },
  { label: 'How letters land', classic: 'Shake the dome', classroom: 'Teacher word list, or random if empty', lexiclash: 'New grid each round' },
  { label: 'Time', classic: '3 minutes', classroom: 'Untimed, or a teacher timer', lexiclash: '120 seconds solo standard; 90 seconds multiplayer default' },
  { label: 'Shortest word', classic: '3 letters', classroom: 'Usually 3 letters', lexiclash: '2 letters' },
  { label: '3-letter score', classic: '1', classroom: 'Varies; a topic word may double', lexiclash: '10 before combos' },
  { label: '8+ letter score', classic: '11', classroom: 'Varies', lexiclash: '500 before combos' },
  { label: 'Players', classic: 'Table; a shared word scores 0', classroom: 'Worksheet, often solo', lexiclash: 'Live rooms, up to 50' },
  { label: 'Price', classic: 'Boxed game', classroom: 'Free generator; some PDF exports need a free membership', lexiclash: 'Free, no download, no signup' },
];

const faqs = [
  {
    q: 'What is word shake boggle?',
    a: WORD_SHAKE_BOGGLE_ANSWER,
  },
  {
    q: 'What is wordplay boggle shake?',
    a: WORDPLAY_BOGGLE_SHAKE_ANSWER,
  },
  {
    q: 'What is Boggle Word Shake?',
    a: 'Boggle Word Shake is a word-finding game: letters land on a grid, and players find words by connecting adjacent letters. LexiClash plays Boggle Word Shake free in the browser, with no download and rooms of up to 50 players.',
  },
  {
    q: 'Can I play Boggle Word Shake free with no download?',
    a: 'Yes! LexiClash runs entirely in your browser. No app download, no signup. Just visit the site and start playing instantly on phone, tablet, or desktop.',
  },
  {
    q: 'How is this different from the original Boggle Word Shake app?',
    a: 'LexiClash offers the same word-shake gameplay plus real-time multiplayer (rooms hold up to 50 players), boards of 5x5, 6x6, and 7x7, daily challenges, combo scoring, and 6-language support — all free with no pay-to-win boosts.',
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

        <section className="mb-8" aria-labelledby="word-shake-boggle">
          <h2 id="word-shake-boggle" className="mb-3 font-neo-display text-2xl font-bold sm:text-3xl">
            What is word shake boggle?
          </h2>
          <p className="mb-4 text-lg leading-relaxed text-neo-gray-200">{WORD_SHAKE_BOGGLE_ANSWER}</p>
          <p className="mb-3 text-sm text-neo-gray-400">
            Classic column: Parker Brothers Boggle, 1973. Classroom column: Edu-Games Word Shake tool, checked 22 October 2026. LexiClash column: lexiclash.live board sizes, timer, minimum word length, base scores, and room cap as shipped in the game.
          </p>
          <div className="mb-2 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <caption className="mb-2 text-left font-bold text-neo-lime">
                Word shake boggle compared: classic Boggle, a classroom generator, and LexiClash
              </caption>
              <thead>
                <tr className="border-b-2 border-neo-cyan text-left">
                  <th className="py-2 pr-3 font-bold">Compared</th>
                  <th className="py-2 pr-3 font-bold">Classic Boggle</th>
                  <th className="py-2 pr-3 font-bold">Classroom Word Shake</th>
                  <th className="py-2 font-bold">LexiClash</th>
                </tr>
              </thead>
              <tbody>
                {wordShakeVsBoggle.map((row) => (
                  <tr key={row.label} className="border-b border-neo-gray-400/40 align-top">
                    <th className="py-2 pr-3 text-left font-bold">{row.label}</th>
                    <td className="py-2 pr-3">{row.classic}</td>
                    <td className="py-2 pr-3">{row.classroom}</td>
                    <td className="py-2">{row.lexiclash}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-8" aria-labelledby="wordplay-boggle-shake">
          <h2 id="wordplay-boggle-shake" className="mb-3 font-neo-display text-2xl font-bold sm:text-3xl">
            What is wordplay boggle shake?
          </h2>
          <p className="mb-4 text-lg leading-relaxed text-neo-gray-200">{WORDPLAY_BOGGLE_SHAKE_ANSWER}</p>
          <p className="mb-3 text-sm text-neo-gray-400">
            Classic Boggle scoring (Parker Brothers, 1973). Page updated October 2026.
          </p>
          <table className="mb-2 w-full max-w-sm border-collapse text-sm">
            <caption className="mb-2 text-left font-bold text-neo-lime">
              Classic Boggle points by word length
            </caption>
            <thead>
              <tr className="border-b-2 border-neo-cyan text-left">
                <th className="py-2 pr-4 font-bold">Letters</th>
                <th className="py-2 font-bold">Points</th>
              </tr>
            </thead>
            <tbody>
              {classicBoggleScoring.map((row) => (
                <tr key={row.letters} className="border-b border-neo-gray-400/40">
                  <td className="py-2 pr-4">{row.letters}</td>
                  <td className="py-2">{row.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <p className="mb-4 text-lg font-bold leading-relaxed text-neo-lime">
          LexiClash is a free online Boggle Word Shake game: shake a letter grid, find hidden words, and compete live with friends — no download, no signup.
        </p>

        <p className="mb-8 text-lg leading-relaxed text-neo-gray-200">
          Miss the classic Boggle Shake game? LexiClash brings the same scramble-and-find gameplay to your browser —
          completely free, no download required. Shake up a grid of letters, find as many words as you can, and compete
          against friends or AI bots in real-time. Looking for free boggle online no download? You found it. Choose from
          5x5, 6x6, or 7x7 boards with combo scoring for extra challenge.
        </p>

        <section className="mb-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
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
      </div>

      {/* Live playable Boggle Word Shake game — rendered immediately on this URL */}
      <section aria-label="Play Boggle Word Shake" className="relative flex h-[650px] min-h-[650px] w-full flex-col lg:h-[750px]">
        <BoggleWordShakeGameClient />
      </section>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">
            How to Play Boggle Word Shake Online
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { step: '1', title: 'Open LexiClash', desc: 'Visit lexiclash.live — works on any device. No download or signup.' },
              { step: '2', title: 'Start a Game', desc: 'Play solo vs AI bots, or create a room and invite friends via link. A room holds up to 50 players.' },
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
              'Real-time multiplayer, up to 50 players in a room',
              'Board sizes: 5x5, 6x6, 7x7',
              'Combo scoring for fast word chains',
              'No download — plays in any browser',
              'Daily challenges with global leaderboard',
              'Available in 6 languages',
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
