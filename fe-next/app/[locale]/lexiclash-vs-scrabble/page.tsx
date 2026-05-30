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
  const pageUrl = `${BASE_URL}/${locale}/lexiclash-vs-scrabble`;
  const canonicalUrl = `${BASE_URL}/en/lexiclash-vs-scrabble`;

  return {
    title: 'LexiClash vs Scrabble GO — No Interruptions, No Bots, Real Competition | LexiClash',
    description: 'Tired of Scrabble GO interstitials and fake bot opponents? LexiClash is a real-time word game with real players, no mid-game ad interruptions, and no pay-to-win. Free comparison.',
    keywords: 'lexiclash vs scrabble, scrabble go alternative, scrabble go too many ads, scrabble go bots, scrabble go pay to win, best scrabble alternative 2026, no interstitial word games, real multiplayer word game',
    openGraph: {
      title: 'LexiClash vs Scrabble GO — Honest Comparison 2026',
      description: 'No interruptions, no bots, no pay-to-win. See why players are switching from Scrabble GO.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'LexiClash vs Scrabble GO Comparison' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LexiClash vs Scrabble GO — No Interruptions, Real Players',
      description: 'Tired of Scrabble GO interstitials? LexiClash is the clean alternative.',
      images: [`${BASE_URL}/og-image-en.webp`],
    },
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'x-default': `${BASE_URL}/en/lexiclash-vs-scrabble`,
        en: `${BASE_URL}/en/lexiclash-vs-scrabble`,
        he: `${BASE_URL}/he/hebrew-multiplayer-word-game`,
        sv: `${BASE_URL}/sv/swedish-multiplayer-word-game`,
        ja: `${BASE_URL}/ja/japanese-word-game`,
        es: `${BASE_URL}/es/juego-de-palabras-multijugador`,
      },
    },
    robots: { index: isEnglish, follow: true },
  };
}

// Static FAQ data — all values are hardcoded string literals, safe for JSON-LD serialization
const faqs = [
  {
    q: 'Why are people leaving Scrabble GO?',
    a: 'Honestly? The ads broke people. You finish a game, get an ad. You open the app, get an ad. You breathe near your phone, believe it or not — ad. Then you realize half your opponents were bots the whole time, and the other half bought Word Radar so they never actually had to think. People aren\'t leaving because they stopped loving word games. They\'re leaving because Scrabble GO stopped respecting them.',
  },
  {
    q: 'Does LexiClash have ads like Scrabble GO?',
    a: 'Not even close. LexiClash has optional rewarded ads — you can choose to watch one to double your coins after a game. That\'s it. No forced ads between rounds, no pop-ups mid-game, no "watch this 30-second video to continue playing the game you already downloaded for free." You play when you want, uninterrupted.',
  },
  {
    q: 'Are there bots pretending to be real players?',
    a: 'No, and this one really matters. In LexiClash multiplayer, every single opponent is a real human being. When you play solo, the AI bots are clearly labeled with their difficulty level — because treating players like adults who can handle the truth shouldn\'t be revolutionary, but here we are.',
  },
  {
    q: 'Is LexiClash pay-to-win?',
    a: 'Absolutely not. You can\'t buy your way to a win. Coins are earned by playing and can only buy cosmetic stuff — skins, avatar parts, that kind of thing. Your vocabulary is your advantage, not your credit card. Scrabble GO sells boosters that literally reveal the best word on the board. At that point, what are you even playing?',
  },
  {
    q: 'How is the gameplay different?',
    a: 'Scrabble is turn-based tile placement on a shared board — and to be clear, that\'s a genuinely great game design. The board game is a classic for a reason. LexiClash is a different beast: everyone plays the same letter grid at the same time, racing to find words by connecting adjacent letters. Games take 60 to 180 seconds instead of hours. It\'s less chess, more arena.',
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

export default async function LexiClashVsScrabblePage({ params }: PageProps) {
  const { locale } = await params;

  return (
    <main className="min-h-screen bg-neo-navy text-neo-white">
      {/* Static JSON-LD for FAQ rich results — hardcoded content only, no user input */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: faqJsonLd }}
      />

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <TopBackLink className="mb-4" />
        <h1 className="mb-6 font-neo-display text-4xl font-bold leading-tight sm:text-5xl">
          LexiClash vs Scrabble GO — No Interruptions, No Bots, Real Competition
        </h1>

        <p className="mb-4 text-lg leading-relaxed text-neo-gray-200">
          Let&apos;s get one thing straight: Scrabble is a brilliant game. The board game has earned every bit of its
          80-year reputation. But Scrabble GO — the app — is a different story entirely.
        </p>

        <p className="mb-8 text-lg leading-relaxed text-neo-gray-200">
          If you&apos;ve played it recently, you already know. The ads that hit you every 30 seconds. The &quot;opponents&quot;
          who are obviously bots but the app pretends they&apos;re real. The boosters that let people pay to skip
          the whole &quot;thinking&quot; part of a word game. I spent two years on Scrabble GO before I snapped. LexiClash is
          what I wish that app had been. Here&apos;s the honest breakdown.
        </p>

        <section className="mb-12 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Link href={`/${locale}/multiplayer`} className="rounded-neo border-4 border-neo-lime bg-neo-lime px-6 py-3 text-center font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg sm:px-8 sm:py-4">
            Play Real Multiplayer
          </Link>
          <Link href={`/${locale}/singleplayer`} className="rounded-neo border-4 border-neo-cyan bg-transparent px-6 py-3 text-center font-bold text-neo-cyan shadow-hard transition-all hover:bg-neo-cyan/10 sm:px-8 sm:py-4">
            Solo vs Labeled Bots
          </Link>
          <Link href={`/${locale}/daily`} className="rounded-neo border-4 border-neo-pink bg-transparent px-6 py-3 text-center font-bold text-neo-pink shadow-hard transition-all hover:bg-neo-pink/10 sm:px-8 sm:py-4">
            Daily Challenge
          </Link>
        </section>

        <section className="mb-12">
          <h2 className="mb-3 font-neo-display text-2xl font-bold sm:text-3xl">The Scrabble GO Pain Points (You Know the Ones)</h2>
          <p className="mb-6 text-neo-gray-200">
            Every single one of these drove me up the wall. If you&apos;re nodding along, you&apos;re not alone.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { pain: 'Ads every 30 seconds, sometimes mid-game', fix: 'Optional rewarded ads only. You choose. Zero interruptions, ever.' },
              { pain: 'Bot opponents dressed up as real players', fix: 'Multiplayer is 100% real humans. Bots in solo mode are clearly labeled.' },
              { pain: 'Pay-to-win boosters (Word Radar, Swap+)', fix: 'Coins buy cosmetics only. Your brain is the only advantage here.' },
              { pain: 'A UI buried under gems, energy bars, and event popups', fix: 'Clean interface. You open the app, you play the game. That&apos;s it.' },
              { pain: 'Games that drag on for hours or even days', fix: 'Fast 60-180 second rounds. Quick, intense, done.' },
              { pain: 'Have to download a 300MB+ app', fix: 'Runs in your browser. Click and play, nothing to install.' },
            ].map((item) => (
              <div key={item.pain} className="rounded-neo border-3 border-neo-red/30 bg-neo-navy/50 p-4 shadow-hard">
                <p className="text-sm text-neo-red line-through opacity-70">{item.pain}</p>
                <p className="mt-1 text-sm font-bold text-neo-lime">{item.fix}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-3 font-neo-display text-2xl font-bold sm:text-3xl">Side-by-Side Comparison</h2>
          <p className="mb-6 text-neo-gray-200">
            Numbers don&apos;t lie. Here&apos;s what you actually get with each app.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse rounded-neo border-3 border-neo-gray-400 text-sm sm:text-base">
              <thead>
                <tr className="border-b-3 border-neo-gray-400 bg-neo-navy/80">
                  <th className="px-4 py-3 text-left font-bold text-neo-lime">Feature</th>
                  <th className="px-4 py-3 text-center font-bold text-neo-cyan">LexiClash</th>
                  <th className="px-4 py-3 text-center text-neo-gray-300">Scrabble GO</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Price', 'Free', 'Free (but good luck with that)'],
                  ['Ads', 'Optional rewarded only', 'Mandatory, every 30s'],
                  ['Real opponents', 'Yes, always', 'Mixed with unlabeled bots'],
                  ['Pay-to-win', 'No', 'Yes (Word Radar, Swap+)'],
                  ['Game speed', '60-180 sec rounds', 'Hours or days per game'],
                  ['Multiplayer type', 'Real-time simultaneous', 'Turn-based'],
                  ['Players per game', '2-20+', '2'],
                  ['No download needed', 'Yes (runs in browser)', 'No (app required)'],
                  ['Languages', '5', '1'],
                  ['Adventure mode', 'Yes, 100+ levels', 'No'],
                  ['Daily challenges', 'Yes + global leaderboard', 'Yes (limited)'],
                  ['UI complexity', 'Clean, game-focused', 'Gems, energy, events, popups'],
                ].map(([feature, lexi, scrabble]) => (
                  <tr key={feature} className="border-b border-neo-gray-400/50">
                    <td className="px-4 py-3 font-medium">{feature}</td>
                    <td className="px-4 py-3 text-center text-neo-cyan">{lexi}</td>
                    <td className="px-4 py-3 text-center text-neo-gray-300">{scrabble}</td>
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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link href={`/${locale}/scrabble-alternative-online`} className="rounded-neo border-3 border-neo-lime/60 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-lime">
              <h3 className="font-bold text-neo-lime">Scrabble Alternative Online</h3>
              <p className="mt-1 text-xs text-neo-gray-200">Real-time, browser-based, 2-20 players</p>
            </Link>
            <Link href={`/${locale}/lexiclash-vs-wordle`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-lime/40">
              <h3 className="font-bold text-neo-cyan">LexiClash vs Wordle</h3>
              <p className="mt-1 text-xs text-neo-gray-200">Unlimited play vs 1 puzzle/day</p>
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
            I&apos;m not going to pretend LexiClash is perfect. But it does the one thing Scrabble GO forgot how
            to do: it lets you play a word game without constantly trying to sell you something. No interstitials ambushing
            you between rounds. No bots wearing human masks. No $9.99 booster that plays the game for you.
            Just your brain, a grid of letters, and someone real on the other side. It&apos;s free, it runs in
            your browser, and you&apos;ll know within one round whether it&apos;s for you.
          </p>
          <div className="mt-6">
            <Link href={`/${locale}/multiplayer`} className="inline-block rounded-neo border-4 border-neo-lime bg-neo-lime px-8 py-4 font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg">
              Play LexiClash — No Interruptions, No Bots
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
