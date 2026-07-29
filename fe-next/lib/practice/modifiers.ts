/**
 * Practice-mode modifier roulette.
 *
 * Each session pulls one daily modifier (deterministic by UTC date) that
 * grants a bonus multiplier on words matching its rule. Adds replayable
 * novelty without new content. Never affects competitive modes.
 *
 * Adding a modifier: append to PRACTICE_MODIFIERS, add labelKey to all 5
 * locales under `practice.modifier.<id>` and `practice.modifier.<id>Desc`.
 */

export interface PracticeModifier {
  /** Stable id used in analytics + i18n keys. kebab-case. */
  id: string;
  /** i18n key for the chip label. */
  labelKey: string;
  /** i18n key for one-line description shown in the modifier banner. */
  descKey: string;
  /** Multiplier applied to score when a word matches. Always > 1. */
  bonusMultiplier: number;
  /** Predicate run on each scored word. */
  matches: (word: string) => boolean;
}

const VOWEL_RE = /^[AEIOU]+$/i;
const HAS_DOUBLE_RE = /(.)\1/;

export const PRACTICE_MODIFIERS: PracticeModifier[] = [
  {
    id: 'vowel-only',
    labelKey: 'practice.modifier.vowelOnly',
    descKey: 'practice.modifier.vowelOnlyDesc',
    bonusMultiplier: 2.5,
    matches: (word) => word.length > 0 && VOWEL_RE.test(word),
  },
  {
    id: 'double-letter',
    labelKey: 'practice.modifier.doubleLetter',
    descKey: 'practice.modifier.doubleLetterDesc',
    bonusMultiplier: 1.5,
    matches: (word) => HAS_DOUBLE_RE.test(word),
  },
  {
    id: 's-words',
    labelKey: 'practice.modifier.sWords',
    descKey: 'practice.modifier.sWordsDesc',
    bonusMultiplier: 1.5,
    matches: (word) => word.length > 0 && (word[0] === 'S' || word[0] === 's'),
  },
];

/**
 * Picks one modifier per UTC day. Uses a small hash of the date so the
 * sequence isn't trivially predictable but is reproducible for tests.
 */
export function pickDailyModifier(date: Date = new Date()): PracticeModifier {
  const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  const idx = hash % PRACTICE_MODIFIERS.length;
  // PRACTICE_MODIFIERS is non-empty by construction; non-null assertion
  // keeps the return type narrow without an "unknown modifier" branch.
  return PRACTICE_MODIFIERS[idx]!;
}

/**
 * Convenience for word-scoring code: 1 if the word doesn't match, the
 * modifier's bonusMultiplier if it does.
 */
export function scoreMultiplierFor(modifier: PracticeModifier, word: string): number {
  return modifier.matches(word) ? modifier.bonusMultiplier : 1;
}
