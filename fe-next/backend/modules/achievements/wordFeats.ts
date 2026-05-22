/**
 * Pure predicates for rare "word feat" achievements — clever properties of a
 * single word, independent of game state. Kept pure so they're trivially
 * testable and reusable from checkLiveAchievements / awardFinalAchievements.
 *
 * Vowels are a/e/i/o/u only; 'y' is treated as a consonant (so vocalic-y words
 * like "rhythm"/"glyph" qualify as vowelless — that's the fun of it).
 */

const VOWELS = ['a', 'e', 'i', 'o', 'u'] as const;

/** Min length for the "Leviathan" achievement (a genuinely huge word). */
export const LEVIATHAN_MIN_LENGTH = 12;

/** Min length for the "No Repeats" isogram achievement. */
export const ISOGRAM_MIN_LENGTH = 8;

/** Lower-bound length for the vowelless feat — excludes trivial 2–3 letter junk. */
const NO_VOWELS_MIN_LENGTH = 4;

/** True if the word (>= 4 letters) contains none of a/e/i/o/u. */
export function hasNoVowels(word: string): boolean {
  const w = word.toLowerCase();
  if (w.length < NO_VOWELS_MIN_LENGTH) return false;
  return !VOWELS.some(v => w.includes(v));
}

/** True if the word contains every vowel a, e, i, o and u at least once. */
export function hasAllVowels(word: string): boolean {
  const w = word.toLowerCase();
  return VOWELS.every(v => w.includes(v));
}

/** True if the word contains 'q' but no 'u'. */
export function isQWithoutU(word: string): boolean {
  const w = word.toLowerCase();
  return w.includes('q') && !w.includes('u');
}

/** True if the word is >= ISOGRAM_MIN_LENGTH and every letter is distinct. */
export function isLongIsogram(word: string): boolean {
  const w = word.toLowerCase();
  if (w.length < ISOGRAM_MIN_LENGTH) return false;
  return new Set(w.split('')).size === w.length;
}
