import type { Metadata } from 'next';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isTargetLocale = locale === 'en';
  const pageUrl = `${BASE_URL}/${locale}/best-online-word-games`;

  return {
    title: 'Best Online Word Games 2026 — Wordle, Connections, Scrabble GO & More | LexiClash',
    description: 'Honest comparison of every major word game in 2026: Wordle, NYT Connections, Strands, Spelling Bee, Scrabble GO, Semantle, LexiClash, and more. Find the one that fits how you play.',
    keywords: 'best online word games 2026, free word games online, nyt connections, nyt strands, spelling bee game, semantle, wordle alternatives, multiplayer word games, word games with friends, word puzzle games online, word games no download, connections game',
    openGraph: {
      title: 'Best Online Word Games 2026 — Complete Guide',
      description: 'Compare the top word games: Wordle, Scrabble GO, Words With Friends, LexiClash, and more.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'Best Online Word Games 2026' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Best Online Word Games 2026',
      description: 'The definitive comparison of every major word game.',
      images: [`${BASE_URL}/og-image-en.webp`],
    },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': `${BASE_URL}/en/best-online-word-games`,
        en: `${BASE_URL}/en/best-online-word-games`,
        he: `${BASE_URL}/he/hebrew-multiplayer-word-game`,
        sv: `${BASE_URL}/sv/swedish-multiplayer-word-game`,
        ja: `${BASE_URL}/ja/japanese-word-game`,
        es: `${BASE_URL}/es/juego-de-palabras-multijugador`,
      },
    },
  };
}

// Static FAQ data — all values are hardcoded string literals, safe for JSON-LD serialization
const faqs = [
  {
    q: 'What is the best free word game online in 2026?',
    a: 'It depends on what you want. If you love competing against real people in real time, LexiClash is hard to beat — unlimited games, no pay-to-win, and genuinely fun modes. If you prefer a quick daily ritual, Wordle nails that perfectly. For async games with a friend across the country, Words With Friends still does the job.',
  },
  {
    q: 'What word games can I play with friends online?',
    a: 'LexiClash lets you play with 2-20+ people simultaneously in real time, right in your browser. Words With Friends and Scrabble GO are both solid for turn-based play with one friend, but they need an app download. LexiClash is the only option where you can just send a link and start playing together instantly.',
  },
  {
    q: 'Which word games respect your time?',
    a: 'Wordle has zero ads (it lives behind the NYT paywall). LexiClash keeps ads minimal — a small banner and optional rewarded videos for bonuses, never interstitial pop-ups mid-game. Scrabble GO and Wordscapes hit you with full-screen ads constantly, sometimes every 30 seconds.',
  },
  {
    q: 'What word games work in the browser without downloading?',
    a: 'LexiClash and Wordle both work straight from the browser. That&apos;s honestly about it for quality options — Scrabble GO, Words With Friends, and Wordscapes all require app downloads.',
  },
  {
    q: 'What word games have daily challenges?',
    a: 'Wordle gives you one puzzle per day. LexiClash has a daily word wheel and a daily word hunt, both with global leaderboards and streak tracking. Scrabble GO runs occasional daily events but nothing consistent. If you want a meaty daily challenge with rankings, LexiClash has the most to offer here.',
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

const games = [
  {
    name: 'LexiClash',
    verdict: 'Our Pick',
    tagline: 'The one we keep coming back to',
    blurb: 'LexiClash scratches an itch that other word games don&apos;t. The real-time multiplayer is genuinely thrilling — finding words while racing against actual humans feels completely different from taking turns. The adventure mode with boss battles is surprisingly addictive, and the brain training drills are a nice bonus when you want solo practice.',
    pros: ['Unlimited free play, no catches', 'Real-time multiplayer with up to 20+ players', 'Works in the browser — just share a link', 'Adventure mode gives you actual progression', '5 languages including Hebrew and Japanese'],
    cons: ['Smaller player base than the big names (growing fast though)', 'No turn-based mode if that&apos;s your thing'],
    type: 'Grid word-finding',
    multiplayer: 'Real-time, 2-20+ players',
    free: 'Fully free',
    ads: 'Optional rewarded only',
    download: 'No (browser)',
    languages: '5',
    daily: 'Yes + global leaderboard',
    color: 'neo-lime',
  },
  {
    name: 'Wordle',
    verdict: null,
    tagline: 'The five-letter puzzle that took over the world',
    blurb: 'There&apos;s a reason Wordle became a cultural phenomenon. One puzzle a day, six guesses, no fluff. It respects your time in a way most games don&apos;t. The shareable emoji grids are brilliant social design. The downside? Once you solve it (or fail), you&apos;re done until tomorrow. No multiplayer, no progression — just pure, elegant simplicity.',
    pros: ['Zero ads, clean experience', 'Perfect 2-minute daily ritual', 'Shareable results without spoilers', 'Accessible to literally anyone'],
    cons: ['One puzzle per day, that&apos;s it', 'No multiplayer at all', 'Now behind the NYT paywall ecosystem', 'English only'],
    type: '5-letter word guessing',
    multiplayer: 'None',
    free: 'Yes (part of NYT bundle)',
    ads: 'None',
    download: 'No (browser)',
    languages: '1 (English)',
    daily: 'Yes (1 puzzle/day)',
    color: 'neo-cyan',
  },
  {
    name: 'Scrabble GO',
    verdict: null,
    tagline: 'The classic board game, now with way too many ads',
    blurb: 'If you grew up playing Scrabble, this is the real deal — official rules, proper scoring, tournament mode. The strategy of tile placement on a board is genuinely deep. But Scopely buried a great game under aggressive monetization. Expect ads every 30 seconds and constant nudges to buy things. The core game is still Scrabble though, and that counts for a lot.',
    pros: ['Official Scrabble rules and dictionary', 'Deep tile-placement strategy', 'Tournament and ranked modes', 'Huge player base'],
    cons: ['Ads are relentless — every 30 seconds', 'Heavy push toward in-app purchases', 'App download required', 'Lots of bot opponents disguised as players'],
    type: 'Tile placement on board',
    multiplayer: 'Turn-based, 2 players',
    free: 'Free (heavy ads + IAP)',
    ads: 'Mandatory, frequent',
    download: 'Yes (app required)',
    languages: '1',
    daily: 'Limited events',
    color: 'neo-pink',
  },
  {
    name: 'Words With Friends',
    verdict: null,
    tagline: 'Still the go-to for playing with one friend',
    blurb: 'Words With Friends carved out its own space as the social word game. It&apos;s perfect for keeping a running game with a friend or family member across the country — take your turn whenever, no pressure. The chat feature makes it feel personal. It&apos;s not trying to be flashy, and that&apos;s fine. The ads between games are annoying but tolerable.',
    pros: ['Great for async play with specific people', 'Massive existing player base', 'In-game chat makes it social', 'Simple, familiar format'],
    cons: ['Turn-based only — no real-time option', 'Interstitial ads between games', 'App download required', 'Hasn&apos;t innovated much in years'],
    type: 'Tile placement on board',
    multiplayer: 'Turn-based, 2 players',
    free: 'Free (ads + IAP)',
    ads: 'Interstitials between games',
    download: 'Yes (app required)',
    languages: '1',
    daily: 'No',
    color: 'neo-purple',
  },
  {
    name: 'Wordscapes',
    verdict: null,
    tagline: 'The word game you play to unwind',
    blurb: 'Wordscapes isn&apos;t trying to challenge you — it&apos;s trying to relax you. The crossword-meets-anagram format is satisfying in a low-stakes way, and the nature backgrounds are genuinely pretty. With 6000+ levels, there&apos;s no shortage of content. It&apos;s the word game equivalent of a warm bath. Just be ready for a lot of ads between levels.',
    pros: ['Genuinely relaxing gameplay', 'Beautiful nature-themed backgrounds', '6000+ levels of content', 'Easy to pick up and put down'],
    cons: ['No multiplayer whatsoever', 'Frequent interstitial ads', 'Gets repetitive after a while', 'App download required'],
    type: 'Crossword fill-in',
    multiplayer: 'None',
    free: 'Free (heavy ads)',
    ads: 'Frequent interstitials',
    download: 'Yes (app required)',
    languages: '1',
    daily: 'Yes',
    color: 'neo-cyan',
  },
  {
    name: 'NYT Connections',
    verdict: null,
    tagline: 'Group 16 words into 4 categories — harder than it sounds',
    blurb: 'Connections became the second-biggest NYT game almost overnight. You get 16 words, four hidden categories, and four guesses before you&apos;re out. The trick is that the categories are deliberately misleading — words that seem related often aren&apos;t, and the purple group is designed to make you sweat. At 3.3 billion plays in 2025, it&apos;s not just a Wordle sideshow anymore.',
    pros: ['Addictive "aha moment" gameplay', 'Great at the dinner table — everyone argues', 'Clean design, no clutter', 'Free daily puzzle'],
    cons: ['One puzzle per day', 'No multiplayer', 'Can feel arbitrary when categories are too obscure', 'English only, NYT ecosystem'],
    type: 'Category grouping',
    multiplayer: 'None',
    free: 'Yes (part of NYT bundle)',
    ads: 'None',
    download: 'No (browser)',
    languages: '1 (English)',
    daily: 'Yes (1 puzzle/day)',
    color: 'neo-pink',
  },
  {
    name: 'NYT Strands',
    verdict: null,
    tagline: 'A themed word search that actually makes you think',
    blurb: 'Strands took the word search format and made it smart. Every puzzle has a theme, and all the hidden words connect to it. Find the "spangram" that spans the whole board and you&apos;re golden. It&apos;s more satisfying than a regular word search because the theme gives you a foothold — you&apos;re not just pattern-matching, you&apos;re thinking. 1.3 billion plays and an archive added in late 2025.',
    pros: ['Themes make each puzzle feel unique', 'Satisfying spangram mechanic', 'Hint system is well-designed', 'Free with full archive'],
    cons: ['One puzzle per day', 'No multiplayer', 'Some themes are too easy', 'English only'],
    type: 'Themed word search',
    multiplayer: 'None',
    free: 'Yes (part of NYT bundle)',
    ads: 'None',
    download: 'No (browser)',
    languages: '1 (English)',
    daily: 'Yes (1 puzzle/day)',
    color: 'neo-cyan',
  },
  {
    name: 'NYT Spelling Bee',
    verdict: null,
    tagline: 'Seven letters, one rule: use the center letter',
    blurb: 'Spelling Bee gives you seven letters in a honeycomb and asks you to make as many words as possible using the center letter. Finding a pangram (using all seven) is the high you keep chasing. The ranking system from Beginner to Genius to Queen Bee is oddly motivating. Fair warning: it went behind the NYT paywall in 2025, so the full experience now costs money.',
    pros: ['Simple rules, deep gameplay', 'Pangram hunting is genuinely thrilling', 'Progress ranks keep you coming back', 'Clean, focused design'],
    cons: ['Paywalled past "Good" level since 2025', 'Can be frustrating when obvious words aren&apos;t accepted', 'No multiplayer', 'English only'],
    type: 'Letter arrangement',
    multiplayer: 'None',
    free: 'Freemium (paywall after "Good")',
    ads: 'None',
    download: 'No (browser)',
    languages: '1 (English)',
    daily: 'Yes (1 puzzle/day)',
    color: 'neo-lime',
  },
  {
    name: 'Semantle / Contexto',
    verdict: null,
    tagline: 'Guess the word using meaning, not letters — powered by AI',
    blurb: 'This is the weird one on the list, and that&apos;s a compliment. Instead of letter clues, you get told how semantically close your guess is to the secret word. "Dog" might be rated 85/100 if the answer is "cat." It uses actual AI word embeddings, which means your intuition about language gets tested in ways no other game does. Semantle is the harder original; Contexto is the polished mobile version. Both have cult followings.',
    pros: ['Completely unique mechanic — nothing else like it', 'Tests vocabulary depth, not just spelling', 'Free, daily puzzle, no ads', 'Makes you think about language differently'],
    cons: ['Brutally hard — some puzzles take 100+ guesses', 'Can feel random when the AI similarity model disagrees with your brain', 'No multiplayer', 'Niche audience'],
    type: 'AI semantic guessing',
    multiplayer: 'None',
    free: 'Yes',
    ads: 'None (Semantle) / Light (Contexto)',
    download: 'No (browser) / App (Contexto)',
    languages: 'Multiple (Contexto)',
    daily: 'Yes (1 puzzle/day)',
    color: 'neo-purple',
  },
];

export default async function BestOnlineWordGamesPage({ params }: PageProps) {
  const { locale } = await params;

  return (
    <main className="min-h-screen bg-neo-navy text-neo-white">
      {/* Static JSON-LD for FAQ rich results — hardcoded content only, no user input */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: faqJsonLd }}
      />

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="mb-6 font-neo-display text-4xl font-bold leading-tight sm:text-5xl">
          We Played Every Major Word Game So You Don&apos;t Have To
        </h1>

        <p className="mb-4 text-lg leading-relaxed text-neo-gray-200">
          We&apos;re word game people. The kind who play Wordle at midnight, keep three Words With Friends
          games running at once, and have strong opinions about double-letter tiles.
        </p>
        <p className="mb-8 text-lg leading-relaxed text-neo-gray-200">
          So we spent weeks playing every major word game out there in 2026 — the classics, the newcomers,
          the ones your aunt won&apos;t stop recommending. Here&apos;s what&apos;s actually worth your time,
          and what&apos;s coasting on name recognition.
        </p>

        {/* Quick Picks */}
        <section className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-neo border-3 border-neo-lime bg-neo-lime/10 p-4 shadow-hard">
            <h3 className="font-bold text-neo-lime">Best for Playing With Friends</h3>
            <p className="text-sm text-neo-gray-200">LexiClash — send a link, everyone joins, chaos ensues</p>
          </div>
          <div className="rounded-neo border-3 border-neo-cyan bg-neo-cyan/10 p-4 shadow-hard">
            <h3 className="font-bold text-neo-cyan">Best 2-Minute Break</h3>
            <p className="text-sm text-neo-gray-200">Wordle — one clean puzzle, no strings attached</p>
          </div>
          <div className="rounded-neo border-3 border-neo-pink bg-neo-pink/10 p-4 shadow-hard">
            <h3 className="font-bold text-neo-pink">Best Group Activity</h3>
            <p className="text-sm text-neo-gray-200">NYT Connections — everyone argues, nobody agrees</p>
          </div>
          <div className="rounded-neo border-3 border-neo-purple bg-neo-purple/10 p-4 shadow-hard">
            <h3 className="font-bold text-neo-purple">Most Unique Mechanic</h3>
            <p className="text-sm text-neo-gray-200">Semantle — guess by meaning, not letters. Wild.</p>
          </div>
          <div className="rounded-neo border-3 border-neo-lime bg-neo-lime/10 p-4 shadow-hard">
            <h3 className="font-bold text-neo-lime">Best for Getting Hooked</h3>
            <p className="text-sm text-neo-gray-200">LexiClash — adventure mode will eat your evening</p>
          </div>
          <div className="rounded-neo border-3 border-neo-cyan bg-neo-cyan/10 p-4 shadow-hard">
            <h3 className="font-bold text-neo-cyan">Best for Zero Interruptions</h3>
            <p className="text-sm text-neo-gray-200">Wordle + LexiClash — the only two with no forced ads</p>
          </div>
        </section>

        {/* Game Cards */}
        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">The Honest Breakdown</h2>
          <div className="space-y-6">
            {games.map((game, idx) => (
              <div key={idx} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-5 shadow-hard">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-neo-display text-xl font-bold text-neo-white">{game.name}</h3>
                  {game.verdict && (
                    <span className="rounded-neo border-2 border-neo-lime bg-neo-lime/20 px-2 py-0.5 text-xs font-bold text-neo-lime">
                      {game.verdict}
                    </span>
                  )}
                </div>
                <p className="mb-3 text-sm italic text-neo-gray-200">{game.tagline}</p>
                <p className="mb-4 text-sm leading-relaxed text-neo-gray-200">{game.blurb}</p>

                <div className="mb-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-neo-lime/80">What it does well</h4>
                    <ul className="space-y-1 text-sm text-neo-gray-200">
                      {game.pros.map((pro, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="mt-1 text-neo-lime">+</span>
                          <span>{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-neo-pink/80">Where it falls short</h4>
                    <ul className="space-y-1 text-sm text-neo-gray-200">
                      {game.cons.map((con, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="mt-1 text-neo-pink">-</span>
                          <span>{con}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="grid gap-2 border-t border-neo-gray-400/20 pt-3 text-sm sm:grid-cols-2">
                  <div><span className="text-neo-white/50">Type:</span> {game.type}</div>
                  <div><span className="text-neo-white/50">Multiplayer:</span> {game.multiplayer}</div>
                  <div><span className="text-neo-white/50">Free:</span> {game.free}</div>
                  <div><span className="text-neo-white/50">Ads:</span> {game.ads}</div>
                  <div><span className="text-neo-white/50">Download:</span> {game.download}</div>
                  <div><span className="text-neo-white/50">Languages:</span> {game.languages}</div>
                  <div><span className="text-neo-white/50">Daily challenge:</span> {game.daily}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <details key={idx} className="group rounded-neo border-3 border-neo-gray-400 bg-neo-navy/50 shadow-hard">
                <summary className="flex cursor-pointer items-center justify-between px-6 py-4 font-bold">
                  <span>{faq.q}</span>
                  <span className="text-neo-lime transition-transform group-open:rotate-180">▼</span>
                </summary>
                <div className="border-t border-neo-gray-400 px-6 py-4 text-neo-gray-200">{faq.a}</div>
              </details>
            ))}
          </div>
        </section>

        {/* Detailed Comparisons — keep exactly as-is */}
        <section className="mb-12">
          <h2 className="mb-4 font-neo-display text-2xl font-bold sm:text-3xl">Detailed Comparisons</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Link href={`/${locale}/lexiclash-vs-wordle`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-lime/40">
              <h3 className="font-bold text-neo-cyan">LexiClash vs Wordle</h3>
              <p className="mt-1 text-xs text-neo-gray-200">Unlimited play vs 1 puzzle/day</p>
            </Link>
            <Link href={`/${locale}/lexiclash-vs-scrabble`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-lime/40">
              <h3 className="font-bold text-neo-cyan">LexiClash vs Scrabble GO</h3>
              <p className="mt-1 text-xs text-neo-gray-200">No pay-to-win, no bots, real players</p>
            </Link>
            <Link href={`/${locale}/play-boggle-online-free`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-lime/40">
              <h3 className="font-bold text-neo-cyan">Play Boggle Online Free</h3>
              <p className="mt-1 text-xs text-neo-gray-200">No download, instant play</p>
            </Link>
          </div>
        </section>

        {/* CTA */}
        <section className="mb-12">
          <h2 className="font-neo-display text-2xl font-bold sm:text-3xl">Want to See What the Fuss Is About?</h2>
          <p className="mt-4 text-neo-gray-200">
            Look, every game on this list is good at something. Wordle is perfect for what it is.
            Words With Friends is a classic for a reason. But if you want a word game that gives you
            multiplayer, solo modes, daily challenges, and an actual adventure — all free, all in your
            browser — give LexiClash a shot. Worst case, you waste five fun minutes.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Link href={`/${locale}/singleplayer`} className="inline-block rounded-neo border-4 border-neo-lime bg-neo-lime px-8 py-4 text-center font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg">
              Play LexiClash Free
            </Link>
            <Link href={`/${locale}/daily`} className="inline-block rounded-neo border-4 border-neo-cyan bg-transparent px-8 py-4 text-center font-bold text-neo-cyan shadow-hard transition-all hover:bg-neo-cyan/10">
              Try the Daily Challenge
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
