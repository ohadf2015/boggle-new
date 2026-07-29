/**
 * FAQ schemas for programmatic word pages.
 *
 * Generates FAQPage JSON-LD for rich snippet eligibility in Google Search.
 * Each page type gets contextual Q&A that maps to real search intent.
 */

const BASE_URL = 'https://www.lexiclash.live';

interface FaqItem {
  q: string;
  a: string;
}

/**
 * Build a FAQPage JSON-LD schema from question/answer pairs.
 */
function buildFaqSchema(faqs: FaqItem[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: a,
      },
    })),
  };
}

/**
 * FAQ schema for "Words starting with X" pages.
 */
export function getStartingWithFaqs(letter: string, totalWords: number, locale: string): object {
  const upper = letter.toUpperCase();
  const url = `${BASE_URL}/${locale}/singleplayer`;

  return buildFaqSchema([
    {
      q: `How many words start with ${upper} in LexiClash?`,
      a: `There are ${totalWords} valid words starting with ${upper} in the LexiClash dictionary. These range from 3-letter to 8-letter words, each with different point values.`,
    },
    {
      q: `What are the highest-scoring ${upper} words in LexiClash?`,
      a: `Longer words score more points. A ${upper}-word with 8 letters scores significantly more than a 3-letter word. Combo bonuses multiply your score further — chaining consecutive words can double or triple your points.`,
    },
    {
      q: `How do I practice finding ${upper} words?`,
      a: `Start a single-player game at ${url} and focus on spotting ${upper}-words on the grid. With practice, you'll recognize common letter patterns faster and improve your reaction time.`,
    },
    {
      q: `Can I use ${upper} words in multiplayer?`,
      a: `Yes! All words listed here are valid in both single-player and multiplayer modes. In multiplayer, finding unique words that other players miss is key to winning.`,
    },
  ]);
}

/**
 * FAQ schema for "N-letter words" pages.
 */
export function getNLetterWordsFaqs(n: number, totalWords: number, locale: string): object {
  const url = `${BASE_URL}/${locale}/singleplayer`;

  const scoringMap: Record<number, string> = {
    3: '1 point',
    4: '3 points',
    5: '5 points',
    6: '8 points',
    7: '12 points',
    8: '18 points',
  };
  const baseScore = scoringMap[n] ?? `${n * 2} points`;

  return buildFaqSchema([
    {
      q: `How many ${n}-letter words are in LexiClash?`,
      a: `The LexiClash dictionary contains ${totalWords} valid ${n}-letter words. You can browse all of them on this page, grouped by starting letter.`,
    },
    {
      q: `How many points is a ${n}-letter word worth?`,
      a: `A ${n}-letter word is worth ${baseScore} as base score. With combo bonuses, this can multiply significantly — a combo level 5 can more than double your points.`,
    },
    {
      q: `Are ${n}-letter words good for scoring in LexiClash?`,
      a: n <= 4
        ? `${n}-letter words are common and quick to find, making them great for building combos. While each individual word scores less, rapid consecutive finds earn combo multipliers that add up fast.`
        : `${n}-letter words are high-value targets in LexiClash. They score significantly more than shorter words and can swing a multiplayer match in your favor. Try spotting them early in each round.`,
    },
    {
      q: `Where can I practice finding ${n}-letter words?`,
      a: `Play a single-player game at ${url}. You can also try the Word Hunt daily challenge, which often rewards finding words of specific lengths.`,
    },
  ]);
}
