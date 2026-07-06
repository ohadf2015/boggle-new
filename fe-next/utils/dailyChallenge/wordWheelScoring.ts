/**
 * Word Wheel scoring logic — shared between game and results.
 */

export function scoreWord(word: string): number {
  const len = word.length;
  if (len <= 2) return 0;
  if (len === 3) return 12;
  if (len === 4) return 30;
  if (len === 5) return 60;
  if (len === 6) return 96;
  if (len === 7) return 144;
  if (len === 8) return 210;
  return 300;
}

/**
 * Score multiplier for re-submitting a word already found this round. Re-typing
 * a found word used to score nothing (rejected outright) — a dead end that felt
 * punishing. It now still pays out, just at a fraction of the base value.
 */
export const WORD_WHEEL_REPEAT_SCORE_FACTOR = 0.25;

/** Reduced score for a word the player already found. Always at least 1 point. */
export function scoreRepeatWord(word: string): number {
  return Math.max(1, Math.round(scoreWord(word) * WORD_WHEEL_REPEAT_SCORE_FACTOR));
}
