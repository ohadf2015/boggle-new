import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { TopBackLink } from '@/components/navigation/TopBackLink';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_URL = `${BASE_URL}/en/scrabble-alternative-online`;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isTargetLocale = locale === 'en';

  return {
    title: 'Scrabble Alternative Online — Free Multiplayer Word Game (No Download) | LexiClash',
    description: 'Free Scrabble-alternative word game online — real-time multiplayer for 2-20+ players. Play in your browser, no app, no signup. Compare LexiClash vs Scrabble GO.',
    keywords: 'scrabble alternative online, scrabble online free, scrabble alternative free, online scrabble alternative no download, scrabble online multiplayer free, scrabble like word game online, word game like scrabble online, online word battle scrabble alternative, scrabble browser game free',
    openGraph: {
      title: 'Scrabble Alternative Online — Free, Real-Time, 2-20 Players | LexiClash',
      description: 'A real-time Scrabble alternative: same word-grid strategy, no turn-waiting. 2-20+ players in one browser room. No download.',
      url: PAGE_URL,
      type: 'website',
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'LexiClash — Scrabble Alternative Online' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Scrabble Alternative Online — Free & Real-Time | LexiClash',
      description: 'Free Scrabble-alternative word game online. Browser-based, 2-20 players, no download.',
      images: [`${BASE_URL}/og-image-en.webp`],
    },
    alternates: {
      canonical: PAGE_URL,
      languages: {
        'x-default': PAGE_URL,
        en: PAGE_URL,
        es: `${BASE_URL}/es/juego-de-palabras-multijugador`,
        sv: `${BASE_URL}/sv/swedish-multiplayer-word-game`,
        he: `${BASE_URL}/he/hebrew-multiplayer-word-game`,
        ja: `${BASE_URL}/ja/japanese-word-game`,
      },
    },
    robots: isTargetLocale
      ? { index: true, follow: true }
      : { index: false, follow: true },
  };
}

const faqs = [
  {
    q: 'What is the best free Scrabble alternative online?',
    a: "LexiClash is the best free Scrabble alternative online if you want real-time multiplayer instead of turn-based: 2-20+ players share one letter grid simultaneously, the match wraps in 2-3 minutes, and there's no app install or signup. Scrabble GO still owns official rules and the brand; LexiClash trades that for speed, group size, and zero ads mid-match.",
  },
  {
    q: 'How is LexiClash different from official Scrabble?',
    a: 'Official Scrabble (and Scrabble GO) is turn-based on a 15×15 board where players place tiles for letter-multiplier scores. LexiClash uses a smaller letter grid where every player searches for valid words at the same time, scored by length and uniqueness. Both are word-strategy games — LexiClash is built for real-time group play, Scrabble for one-on-one tile placement.',
  },
  {
    q: 'Is there a free online Scrabble alternative with no download?',
    a: 'Yes. LexiClash runs entirely in any modern browser — desktop, phone, or tablet. No app store install, no account creation, no email required. Open the link, create a room, share the code, play. It also installs as a Progressive Web App if you want a home-screen icon.',
  },
  {
    q: 'Can I play a Scrabble-style word game with friends online for free?',
    a: 'LexiClash supports 2-20+ players in a single room. Create a room, share the link or QR, friends join from any device. Free forever, no pay-to-win, no premium tier required to compete. The leaderboard is global with daily, weekly, and all-time rankings.',
  },
  {
    q: 'What languages are supported?',
    a: 'Five full dictionaries: English, Spanish, Swedish, Japanese, and Hebrew (with right-to-left support). Useful for ESL classrooms, language learners, and mixed-language friend groups who want a Scrabble-style word game in their native language.',
  },
  {
    q: 'Are there ads or pay-to-win mechanics?',
    a: 'A small banner sometimes appears outside of matches; that is it. No interstitial pop-ups mid-game and no paid power-ups that buy wins. Rewarded videos exist for cosmetic currency only, never competitive advantage.',
  },
];

const faqJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
});

const videoGameJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'VideoGame',
  name: 'LexiClash',
  alternateName: ['LexiClash Word Battle', 'LexiClash Scrabble Alternative'],
  url: PAGE_URL,
  description: 'A free real-time multiplayer word game and Scrabble alternative. 2-20+ players share one letter grid simultaneously, search for valid words, scored by length and uniqueness. Browser-based, no download, no signup.',
  image: `${BASE_URL}/og-image-en.webp`,
  genre: ['Word Game', 'Puzzle', 'Multiplayer', 'Strategy', 'Casual'],
  gamePlatform: ['Web Browser', 'iOS', 'Android', 'PWA'],
  playMode: ['MultiPlayer', 'SinglePlayer'],
  numberOfPlayers: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 20 },
  applicationCategory: 'GameApplication',
  operatingSystem: 'Any (Web Browser)',
  inLanguage: ['en', 'he', 'sv', 'ja', 'es'],
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock', url: `${BASE_URL}/en/multiplayer` },
  publisher: { '@type': 'Organization', name: 'LexiClash', url: BASE_URL },
});

const howToJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to Play a Free Scrabble Alternative Online',
  description: 'Start a free real-time multiplayer word battle in your browser in 30 seconds — no download, no signup.',
  totalTime: 'PT30S',
  step: [
    { '@type': 'HowToStep', name: 'Open LexiClash multiplayer', text: 'Visit lexiclash.live/en/multiplayer in any browser.', url: `${BASE_URL}/en/multiplayer` },
    { '@type': 'HowToStep', name: 'Create or join a room', text: 'Create a room to get a code, or paste a friend\'s code. Share the link or QR with up to 20 players.' },
    { '@type': 'HowToStep', name: 'Find words simultaneously', text: 'Everyone plays the same letter grid at once. Connect adjacent letters to form valid words.' },
    { '@type': 'HowToStep', name: 'Highest score wins', text: 'After 2-3 minutes, the highest scorer wins. Longer words and unique finds score more points.' },
  ],
});

const breadcrumbJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/en` },
    { '@type': 'ListItem', position: 2, name: 'Compare Word Games', item: `${BASE_URL}/en/best-online-word-games` },
    { '@type': 'ListItem', position: 3, name: 'Scrabble Alternative Online', item: PAGE_URL },
  ],
});

const compareRows: ReadonlyArray<readonly [string, string, string]> = [
  ['Gameplay style', 'Real-time (everyone plays at once)', 'Turn-based tile placement'],
  ['Avg match duration', '2-3 minutes', '15-30 min per game'],
  ['Players per room', '2-20+', '2-4'],
  ['Browser play', 'Yes (no install)', 'No (app required)'],
  ['Mid-game ads', 'None', 'Frequent in Scrabble GO'],
  ['Sign-up required', 'No', 'Yes (Scopely account)'],
  ['Languages', '5 (EN · ES · SV · JA · HE)', '1 (English primary)'],
  ['Daily challenges', 'Yes (Word Wheel + Word Hunt)', 'Limited events'],
  ['Pay-to-win mechanics', 'None', 'Boosts buy advantages'],
];

export default async function ScrabbleAlternativeOnlinePage({ params }: PageProps) {
  await params;
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-neo-navy text-neo-white texture-halftone">
      <Script id="ld-faq" type="application/ld+json">{faqJsonLd}</Script>
      <Script id="ld-videogame" type="application/ld+json">{videoGameJsonLd}</Script>
      <Script id="ld-howto" type="application/ld+json">{howToJsonLd}</Script>
      <Script id="ld-breadcrumb" type="application/ld+json">{breadcrumbJsonLd}</Script>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <TopBackLink className="mb-4" />
        <section className="mb-12">
          <span className="inline-block rotate-[-3deg] rounded-neo border-3 border-neo-black bg-neo-yellow px-3 py-1 font-neo-display text-xs font-black uppercase tracking-widest text-neo-navy shadow-hard">
            ★ Free · Real-Time · 2-20 Players ★
          </span>
          <h1 className="mt-5 font-neo-display text-5xl font-black leading-[0.95] tracking-tight sm:text-6xl">
            The free <span className="inline-block rotate-[-2deg] bg-neo-pink px-3 text-neo-white shadow-hard">Scrabble</span>
            <br />
            alternative — <span className="text-neo-cyan">online &amp; live</span>.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">
            LexiClash is a free, browser-based <strong>Scrabble alternative</strong>: same word-strategy depth, none of the turn-waiting. 2-20+ players share one letter grid simultaneously, the match wraps in 2-3 minutes, and nothing ever installs. No signup, no app store, no pay-to-win.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Link
              href="/en/multiplayer"
              className="rounded-neo border-3 border-neo-black bg-neo-lime px-6 py-3 text-center font-neo-display text-lg font-black uppercase text-neo-navy shadow-hard transition-all hover:-translate-y-0.5 hover:shadow-hard-lg"
            >
              Play free now →
            </Link>
            <Link
              href="/en/best-online-word-games"
              className="rounded-neo border-3 border-neo-black bg-neo-navy-light px-6 py-3 text-center font-neo-display text-lg font-black uppercase text-neo-cyan shadow-hard transition-all hover:bg-neo-cyan/10"
            >
              Compare 9 word games
            </Link>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-4 font-neo-display text-3xl font-black uppercase tracking-tight text-neo-cyan">
            LexiClash vs Scrabble GO at a glance
          </h2>
          <div className="overflow-hidden rounded-neo border-3 border-neo-black shadow-hard">
            <table className="w-full border-collapse text-sm sm:text-base">
              <thead>
                <tr className="bg-neo-pink text-neo-white">
                  <th className="border-b-3 border-r-3 border-neo-black px-3 py-2 text-left font-neo-display font-black uppercase">Feature</th>
                  <th className="border-b-3 border-r-3 border-neo-black px-3 py-2 text-left font-neo-display font-black uppercase">LexiClash</th>
                  <th className="border-b-3 border-neo-black px-3 py-2 text-left font-neo-display font-black uppercase">Scrabble GO</th>
                </tr>
              </thead>
              <tbody>
                {compareRows.map((row, i) => (
                  <tr key={row[0]} className={i % 2 === 0 ? 'bg-neo-navy-light' : 'bg-neo-navy'}>
                    <td className="border-b-2 border-r-2 border-neo-black px-3 py-2 font-bold text-neo-white">{row[0]}</td>
                    <td className="border-b-2 border-r-2 border-neo-black px-3 py-2 text-neo-lime">{row[1]}</td>
                    <td className="border-b-2 border-neo-black px-3 py-2 text-slate-300">{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Comparison reflects publicly available product details as of 2026. LexiClash is an independent word game; Scrabble® is a trademark of Hasbro / Mattel.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="mb-4 font-neo-display text-3xl font-black uppercase tracking-tight text-neo-lime">
            Why play a Scrabble alternative?
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-neo border-3 border-neo-cyan/60 bg-neo-navy-light p-4 shadow-hard">
              <h3 className="font-neo-display text-lg font-black text-neo-cyan">No turn waiting</h3>
              <p className="mt-1 text-sm text-slate-300">Async Scrabble is great for one move per day. Real-time is great for game night. Pick the right tool.</p>
            </div>
            <div className="rounded-neo border-3 border-neo-pink/60 bg-neo-navy-light p-4 shadow-hard">
              <h3 className="font-neo-display text-lg font-black text-neo-pink">Group-scale built in</h3>
              <p className="mt-1 text-sm text-slate-300">Scrabble caps at 4 players. LexiClash goes to 20+ in one room — parties, classrooms, family nights.</p>
            </div>
            <div className="rounded-neo border-3 border-neo-lime/60 bg-neo-navy-light p-4 shadow-hard">
              <h3 className="font-neo-display text-lg font-black text-neo-lime">Browser, not app</h3>
              <p className="mt-1 text-sm text-slate-300">Send a URL. Friends join from any device — phone, laptop, tablet. No app store gate, no IT approval at work.</p>
            </div>
            <div className="rounded-neo border-3 border-neo-purple/60 bg-neo-navy-light p-4 shadow-hard">
              <h3 className="font-neo-display text-lg font-black text-neo-purple">5 languages with full dictionaries</h3>
              <p className="mt-1 text-sm text-slate-300">English, Spanish, Swedish, Japanese, Hebrew (RTL). Each with 10,000+ valid words verified against native dictionaries.</p>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-4 font-neo-display text-3xl font-black uppercase tracking-tight text-neo-pink">
            FAQ
          </h2>
          <div className="space-y-3">
            {faqs.map(f => (
              <details key={f.q} className="rounded-neo border-3 border-neo-black bg-neo-navy-light p-4 shadow-hard">
                <summary className="cursor-pointer font-neo-display font-black text-neo-white">{f.q}</summary>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mb-8 rounded-neo border-3 border-neo-lime bg-neo-navy-light p-6 shadow-hard">
          <h2 className="mb-3 font-neo-display text-2xl font-black uppercase tracking-tight text-neo-lime">
            Ready to play a real-time Scrabble alternative?
          </h2>
          <p className="mb-5 text-slate-300">
            One link, 2-20 friends, 2 minutes per match. Free forever.
          </p>
          <Link
            href="/en/multiplayer"
            className="inline-block rounded-neo border-3 border-neo-black bg-neo-lime px-6 py-3 font-neo-display text-lg font-black uppercase text-neo-navy shadow-hard transition-all hover:-translate-y-0.5 hover:shadow-hard-lg"
          >
            Start a free room →
          </Link>
        </section>

        <nav className="border-t-2 border-neo-black/50 pt-6 text-sm text-slate-400">
          <p className="mb-2 font-neo-display font-bold uppercase tracking-wider text-slate-300">More from LexiClash</p>
          <ul className="flex flex-wrap gap-3">
            <li><Link className="text-neo-cyan hover:underline" href="/en/multiplayer-word-game-online">Multiplayer word game online</Link></li>
            <li><Link className="text-neo-pink hover:underline" href="/en/words-with-friends-alternative">Words With Friends alternative</Link></li>
            <li><Link className="text-neo-lime hover:underline" href="/en/best-online-word-games">9 best word games (compare)</Link></li>
            <li><Link className="text-neo-cyan hover:underline" href="/en/blog/boggle-vs-scrabble">Boggle vs Scrabble</Link></li>
          </ul>
        </nav>
      </div>
    </main>
  );
}
