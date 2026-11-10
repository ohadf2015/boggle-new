export type LetterCoverage = 'all' | 'almost' | 'none';

/**
 * Classifies how much of the wheel a found word covers, for celebration gating.
 *
 * - 'all'    → the word uses every distinct wheel letter (a wheel pangram)
 * - 'almost' → uses all-but-one distinct letter, and at least 5 distinct
 *              (so a 6-letter word on a 7-letter wheel celebrates, but ordinary
 *              short words on small wheels never trip it)
 * - 'none'   → anything below the bar
 *
 * Comparison is case-insensitive and ignores repeated letters.
 */
export function classifyLetterCoverage(word: string, allLetters: string[]): LetterCoverage {
  const total = new Set(allLetters.map(l => l.toUpperCase())).size;
  if (total === 0 || !word) return 'none';

  const wheel = new Set(allLetters.map(l => l.toUpperCase()));
  const distinctUsed = new Set(
    word.toUpperCase().split('').filter(c => wheel.has(c)),
  ).size;

  if (distinctUsed >= total) return 'all';
  if (distinctUsed === total - 1 && distinctUsed >= 5) return 'almost';
  return 'none';
}

/**
 * The one wheel letter a word left out, for the "almost all" hint. Null unless exactly
 * one distinct wheel letter is missing, so a hint never names a wrong or vague letter.
 */
export function missingWheelLetter(word: string, allLetters: string[]): string | null {
  if (!word) return null;
  const used = new Set(word.toUpperCase());
  const missing = [...new Set(allLetters.map(l => l.toUpperCase()))].filter(l => !used.has(l));
  return missing.length === 1 ? missing[0] : null;
}
