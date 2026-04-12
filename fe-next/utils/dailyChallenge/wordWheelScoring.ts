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
