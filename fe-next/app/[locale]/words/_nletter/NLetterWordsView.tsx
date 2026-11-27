import type { Metadata } from 'next';
import { defaultOgImages } from '@/lib/seo/defaultOgImage';
import Link from 'next/link';
import { InlineBannerAd } from '@/components/ads';
import {
  getWordsByLength,
  groupByFirstLetter,
  getWordScore,
  VALID_LENGTHS,
  VALID_LETTERS,
  type WordLength,
} from '../_utils/wordListData';
import { getNLetterWordsFaqs } from '../_utils/wordPageFaqSchema';
import { enOnlyAlternates } from '@/lib/seo/enOnlyAlternates';
import { jsonLdGraph } from '@/lib/seo/jsonLdGraph';
import { PressGroup } from '../_components/PressGroup';
import { HeroBand } from '../_components/HeroBand';
import { PRIMARY_CTA, CHIP, SECTION_LABEL } from '../_components/wordStyles';

// Private module (folder is `_nletter`, not a route). The /words/{n}-letter-words URLs
// are served by the sibling [word] dynamic route, which delegates here. This used to be
// its own `[n]-letter-words` route, but two dynamic siblings under /words/ ([word] +
// [n]-letter-words) created a routing conflict that 404'd BOTH. See
// docs/2026-06-17-adsense-thin-page-noindex-spec.md.
const BASE_URL = 'https://www.lexiclash.live';

const WORD_LENGTH_CONTENT: Record<number, { strategy: string; funFact: string; difficulty: string }> = {
  3: {
    strategy:
      'Three-letter words are the foundation of every great Boggle run. Master them first — they let you chain combos faster than any other length because they\'re so quick to spot on the grid. Words like QI, XI, and ZA use high-value letters in minimal space, turning a corner tile into serious points. Look for vowel clusters (AIO, OAE) to immediately spot multiple short words radiating from the same position.',
    funFact:
      'The most common 3-letter word in English text is "the," but in Boggle dictionaries the most valuable is ZAX (a tool for cutting roofing slates) — worth 12 points thanks to that Z. There are over 1,000 valid 3-letter words in competitive play, many of them obscure two-vowel gems that catch opponents completely off guard.',
    difficulty: 'Beginner-friendly — these are the words you learn first and never stop using. Even at expert level, 3-letter finds account for roughly 40% of all words played in a typical game.',
  },
  4: {
    strategy:
      'Four-letter words hit the sweet spot between speed and payoff: fast enough to find under pressure, substantial enough to actually move the scoreboard. Focus on high-frequency endings like -ING, -ATE, -EST, and -ERY — once you see the suffix on the grid, your brain can automatically scan for valid roots in any direction. Plurals and past-tense forms of 3-letter words are an easy upgrade; train your eye to add that S or D automatically.',
    funFact:
      'QUIZ is the highest-scoring common 4-letter word you\'re likely to find on a standard grid, and JINX isn\'t far behind. Statistically, words ending in -TION appear rarely in Boggle because a grid would need T-I-O-N adjacently arranged — a layout that\'s rarer than players expect.',
    difficulty: 'Intermediate — beginners find the obvious ones (CATS, DOOR, FIRE), but strong players mine the unusual four-letter vocabulary (DOJO, FUZE, QOPH) that most opponents never consider.',
  },
  5: {
    strategy:
      'Five letters is the Wordle length — and those years of daily puzzles make most players surprisingly good at spotting 5-letter patterns. In Boggle, the key shift is thinking in prefixes: UN-, RE-, OUT-, OVER- all extend naturally from common shorter words already on your radar. Once you lock in a prefix on the grid, scan outward to see if a valid root continues. The center of the board is your best friend at this length — central tiles connect to more neighbors.',
    funFact:
      'QUARTZ, SPHINX, and JUMPY are famous "high-value 5-letter words" in word games, but they\'re nearly impossible on a standard Boggle grid because their rare letters rarely land adjacent. The practical champion is FOXES (high F+X value, common adjacency) — study which high-point letters actually cluster on real grids.',
    difficulty: 'Intermediate to advanced — vocabulary depth matters more here than at shorter lengths. Players who read broadly (fiction, science, crosswords) have a measurable advantage.',
  },
  6: {
    strategy:
      'Six-letter words are where serious points accumulate and where casual players start to fall behind. Compound-word thinking is your sharpest tool: split the word mentally into two 3-letter halves (OUT+RAN, SEA+BED, SUN+LIT) and scan the grid for each half touching. Prefixes with more reach — UNDER-, INTER-, COUNTER- — become findable at this length too. Also hunt for -TION and -NESS endings, which signal standard English derivations that are almost always valid.',
    funFact:
      'English has more 6-letter words than any other length — linguists estimate around 22,000 common ones. In competitive Boggle, QUARTZ-based 6-letter formations like QUARTZ don\'t exist, but FIZGIG (a type of firework) is a real word worth a massive 19 points if Q, Z, or rare letters are available on your board.',
    difficulty: 'Advanced — finding 6-letter words consistently separates competitive players from recreational ones. Aim for at least two per game as a skill benchmark.',
  },
  7: {
    strategy:
      'Seven-letter words are advanced vocabulary territory, and the players who find them reliably all share one habit: they know Latin and Greek roots. TELE- (far), MICRO- (small), GRAPH- (write), -OLOGY (study of) — these roots appear everywhere in 7-letter English words. When you spot a root on the grid, your mind immediately narrows the possibilities before you\'ve even consciously looked. Also look for -MENT, -NESS, -ATION, and -ANCE endings which attach to many 5- and 6-letter bases.',
    funFact:
      'PIZZAZZ has 7 letters and would theoretically score 47 points in standard Boggle — but no standard 4×4 grid could ever contain it. The more practical trophy is QUICKLY (26 pts) or ZEPHYRS (25 pts), both achievable on a lucky grid draw. Only about 3% of players consistently find 7-letter words in timed play.',
    difficulty: 'Expert — these are the words that win tournaments. Building a mental database of obscure but valid 7-letter words (ZYMBALS, QUETZAL) is the hallmark of a true word game competitor.',
  },
  8: {
    strategy:
      'Eight-letter words are trophy words — game-changing scores that can flip the entire match in one find. They require a 4×4 grid path that rarely falls into place, so your strategy isn\'t to hunt for them directly but to stay alert while scanning shorter words. If you notice four tiles forming a strong cluster mid-scan, extend outward to test all 8-tile paths before moving on. Strong 8-letter finders also exploit -TION + PREFIX combinations: PRE+CAUTION, IN+VENTION, RE+SOLUTION appear more on real grids than most players realize.',
    funFact:
      'STRENGTH is only 8 letters but contains 8 consonants in a row — nearly impossible to form on a grid. More Boggle-realistic is BACKFIRE, LAMPPOST, or HANDBOOK: two distinct 4-letter chunks that sometimes land adjacent. Statistically, finding even one 8-letter word in a timed game puts you in the top 1% of plays recorded on LexiClash.',
    difficulty: 'Elite — most players go entire sessions without finding one. When you do, it\'s worth announcing. These words are the reason the highest LexiClash score multipliers exist.',
  },
};

export async function nLetterWordsMetadata(locale: string, n: WordLength): Promise<Metadata> {
  const title = `All ${n}-Letter Words | LexiClash Word Game`;
  const description = `Browse all ${n}-letter words in the LexiClash dictionary. See every valid ${n}-letter word with its score and play it in a real-time word game.`;
  const url = `${BASE_URL}/${locale}/words/${n}-letter-words`;

  return {
    title,
    description,
    openGraph: { images: defaultOgImages(locale), type: 'website', url, title, description, siteName: 'LexiClash' },
    // English word list, index:locale==='en'. Self-referencing EN hreflang.
    alternates: enOnlyAlternates(`/words/${n}-letter-words`),
    // NOINDEX 2026-08-09: auto-generated word lists are the canonical "low value
    // content" trigger, and AdSense rejected this domain twice on that ground — which
    // is what keeps the whole web ad line at zero revenue. Sitemap listing was retired
    // in the same change (app/sitemap.ts). ZERO pageviews in 60d, so no traffic cost.
    // follow:true keeps existing link equity flowing to the /words hub.
    robots: { index: false, follow: true },
  };
}

function buildSchemaJson(n: number, locale: string, words: string[]): string {
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'LexiClash', item: `${BASE_URL}/${locale}` },
      { '@type': 'ListItem', position: 2, name: 'Words', item: `${BASE_URL}/${locale}/words` },
      { '@type': 'ListItem', position: 3, name: `${n}-Letter Words`, item: `${BASE_URL}/${locale}/words/${n}-letter-words` },
    ],
  };
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `All ${n}-Letter Words in LexiClash`,
    description: `Complete list of ${n}-letter words playable in LexiClash word game.`,
    numberOfItems: words.length,
    itemListElement: words.map((word, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: word.toUpperCase(),
      url: `${BASE_URL}/${locale}/words/${word}`,
    })),
  };
  const faqSchema = getNLetterWordsFaqs(n, words.length, locale);
  return JSON.stringify(jsonLdGraph([breadcrumb, itemList, faqSchema]));
}

export async function NLetterWordsView({ locale, n }: { locale: string; n: WordLength }) {
  const words = getWordsByLength(n);
  const grouped = groupByFirstLetter(words);
  const sortedLetters = Object.keys(grouped).sort();
  const totalWords = words.length;
  const schemaJson = buildSchemaJson(n, locale, words);
  const baseScore = getWordScore('x'.repeat(n));

  return (
    <>
      {/* JSON-LD is static server data — no user input involved */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schemaJson }} />

      <PressGroup className="min-h-screen bg-neo-navy text-neo-white">
        <HeroBand className="max-w-4xl">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm text-neo-cream/60 flex items-center gap-2">
            <Link href={`/${locale}`} className="hover:text-neo-cyan transition-colors">Home</Link>
            <span aria-hidden="true">/</span>
            <Link href={`/${locale}/words`} className="hover:text-neo-cyan transition-colors">Words</Link>
            <span aria-hidden="true">/</span>
            <span className="text-neo-white" aria-current="page">{n}-Letter Words</span>
          </nav>

          <h1 className="text-4xl sm:text-5xl font-neo-display font-black text-neo-lime mb-3">
            All {n}-Letter Words
          </h1>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-neo-cream/70">
            <span><strong className="text-neo-cyan text-lg">{totalWords}</strong> words</span>
            <span><strong className="text-neo-lime text-lg">{baseScore}</strong> base pts each</span>
            <span><strong className="text-neo-pink text-lg">{baseScore * 2}</strong> fire round pts</span>
          </p>

          <div className="mt-6">
            <Link href={`/${locale}/quick-play`} data-press data-primary-cta className={PRIMARY_CTA}>
              Play Now →
            </Link>
            <p className="text-neo-cream/60 text-sm mt-3 max-w-md">
              Put your vocabulary to the test — find these words on the grid under time pressure!
            </p>
          </div>
        </HeroBand>

        <div className="max-w-4xl mx-auto px-4 pb-10">
          {/* Word list by letter group */}
          <div className="space-y-8">
            {sortedLetters.map((letter, letterIdx) => (
              <section key={letter}>
                <h2 className="text-2xl font-neo-display font-black text-neo-cyan mb-3">
                  {letter}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {(grouped[letter] ?? []).map(word => (
                    <Link
                      key={word}
                      href={`/${locale}/words/${word}`}
                      data-press
                      className={`${CHIP} flex items-center justify-between px-3 py-2`}
                    >
                      <span className="font-bold text-sm uppercase tracking-wide">
                        {word}
                      </span>
                      <span className="text-xs font-bold text-neo-cyan ms-1 shrink-0">
                        {getWordScore(word)}pt
                      </span>
                    </Link>
                  ))}
                </div>
                {(letterIdx === 0 || letterIdx === 3) && <InlineBannerAd webZone="content-page" className="mt-6" />}
              </section>
            ))}
          </div>

          <p className="mt-12 text-neo-cream/80 text-lg leading-relaxed max-w-2xl">
            Explore all {totalWords} valid {n}-letter words in the LexiClash dictionary.
            Each word shows its base score — longer words earn more points in the game.
            Click any word to see its full scoring breakdown and letter analysis.
          </p>

          {WORD_LENGTH_CONTENT[n] && (
            <section className="mt-10 space-y-4 max-w-2xl">
              <h2 className="text-xl font-neo-display font-black text-neo-cyan">
                Strategy for {n}-Letter Words
              </h2>
              <p className="text-neo-cream/85 text-sm leading-relaxed">
                {WORD_LENGTH_CONTENT[n].strategy}
              </p>
              <div className="border-s-4 border-neo-lime ps-4">
                <p className="text-xs font-bold text-neo-lime uppercase tracking-wider mb-1">Fun Fact</p>
                <p className="text-neo-cream/80 text-sm leading-relaxed">
                  {WORD_LENGTH_CONTENT[n].funFact}
                </p>
              </div>
              <div className="border-s-4 border-neo-pink ps-4">
                <p className="text-xs font-bold text-neo-pink uppercase tracking-wider mb-1">Difficulty</p>
                <p className="text-neo-cream/80 text-sm leading-relaxed">
                  {WORD_LENGTH_CONTENT[n].difficulty}
                </p>
              </div>
            </section>
          )}

          <section className="mt-10 max-w-2xl">
            <h2 className="text-xl font-neo-display font-black text-neo-cyan mb-3">
              Frequently Asked Questions
            </h2>
            <div className="divide-y divide-neo-cream/15">
              <details className="group py-3" open>
                <summary className="cursor-pointer font-bold text-neo-white text-sm group-open:text-neo-lime transition-colors">
                  How many {n}-letter words are in LexiClash?
                </summary>
                <p className="mt-2 text-neo-cream/80 text-sm leading-relaxed ps-4">
                  The LexiClash dictionary contains {totalWords} valid {n}-letter words.
                  You can browse all of them on this page, grouped by starting letter.
                </p>
              </details>
              <details className="group py-3">
                <summary className="cursor-pointer font-bold text-neo-white text-sm group-open:text-neo-lime transition-colors">
                  How many points is a {n}-letter word worth?
                </summary>
                <p className="mt-2 text-neo-cream/80 text-sm leading-relaxed ps-4">
                  A {n}-letter word earns {baseScore} base points. With combo bonuses,
                  this can multiply significantly — a combo level 5 can more than double your points.
                </p>
              </details>
              <details className="group py-3">
                <summary className="cursor-pointer font-bold text-neo-white text-sm group-open:text-neo-lime transition-colors">
                  Are {n}-letter words good for scoring?
                </summary>
                <p className="mt-2 text-neo-cream/80 text-sm leading-relaxed ps-4">
                  {n <= 4
                    ? `${n}-letter words are common and quick to find, making them great for building combos. While each word scores less individually, rapid consecutive finds earn combo multipliers that add up fast.`
                    : `${n}-letter words are high-value targets in LexiClash. They score significantly more than shorter words and can swing a multiplayer match in your favor.`}
                </p>
              </details>
              <details className="group py-3">
                <summary className="cursor-pointer font-bold text-neo-white text-sm group-open:text-neo-lime transition-colors">
                  Where can I practice finding {n}-letter words?
                </summary>
                <p className="mt-2 text-neo-cream/80 text-sm leading-relaxed ps-4">
                  Play a <Link href={`/${locale}/quick-play`} className="text-neo-cyan hover:underline">single-player game</Link> or
                  try the <Link href={`/${locale}/daily/word-hunt`} className="text-neo-cyan hover:underline">Word Hunt daily challenge</Link>,
                  which often rewards finding words of specific lengths.
                </p>
              </details>
            </div>
          </section>

          <div className="mt-12 pt-8 border-t-2 border-neo-cream/15">
            <h2 className={`${SECTION_LABEL} mb-4`}>Explore Other Lengths</h2>
            <div className="flex flex-wrap gap-2">
              {VALID_LENGTHS.filter(l => l !== n).map(l => (
                <Link
                  key={l}
                  href={`/${locale}/words/${l}-letter-words`}
                  data-press
                  className={`${CHIP} text-sm px-3 py-1.5`}
                >
                  {l}-letter words
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <h2 className={`${SECTION_LABEL} mb-4`}>Browse by Starting Letter</h2>
            <div className="flex flex-wrap gap-1.5">
              {VALID_LETTERS.map(letter => (
                <Link
                  key={letter}
                  href={`/${locale}/words/starting-with/${letter}`}
                  data-press
                  className={`${CHIP} w-9 h-9 flex items-center justify-center text-sm font-bold uppercase`}
                >
                  {letter}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </PressGroup>
    </>
  );
}
