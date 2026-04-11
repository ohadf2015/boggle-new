/**
 * Word Wheel scoring logic — shared between game and results.
 */

export function scoreWord(word: string): number {
  const len = word.length;
  if (len <= 2) return 0;
  if (len === 3) return 1;
  if (len === 4) return 3;
  if (len === 5) return 5;
  if (len === 6) return 8;
  if (len === 7) return 12;
  if (len === 8) return 18;
  return 25;
}
