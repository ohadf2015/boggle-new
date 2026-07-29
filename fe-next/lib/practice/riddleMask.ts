/**
 * Pure display helpers for the practice riddle card.
 */

const HIDDEN_TOKEN = '•';

/**
 * Returns one display token per letter of `word`: the first `revealedCount`
 * letters show the real letter; the rest show a placeholder. Works for any
 * script (uses spread to respect code points).
 */
export function maskAnswer(word: string, revealedCount: number): string[] {
  const letters = [...word];
  const reveal = Math.max(0, Math.min(letters.length, Math.floor(revealedCount)));
  return letters.map((ch, i) => (i < reveal ? ch : HIDDEN_TOKEN));
}

/**
 * True when the riddle answer appears among the found words (case-insensitive).
 */
export function isRiddleSolved(answer: string, foundWords: string[]): boolean {
  const target = answer.toUpperCase();
  return foundWords.some((w) => w.toUpperCase() === target);
}
