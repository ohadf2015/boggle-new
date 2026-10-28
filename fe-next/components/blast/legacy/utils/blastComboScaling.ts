/**
 * Returns a word-length scaling factor for area-of-effect radii.
 * 3-4 letters = 1.0 (base), 5-6 letters = 1.5 (larger), 7+ letters = 2.0 (largest).
 * This factor applies ONLY to area/radius parameters — NOT to score multipliers.
 */
export function getWordLengthScaleFactor(wordLength: number): number {
  if (wordLength >= 7) return 2.0;
  if (wordLength >= 5) return 1.5;
  return 1.0;
}

/**
 * Scales a base radius by the word-length factor, rounding up (ceil).
 * Example: scaledRadius(1, 1.5) = 2 (ceil of 1.5)
 */
export function scaledRadius(base: number, scale: number): number {
  return Math.ceil(base * scale);
}
