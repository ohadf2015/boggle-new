/**
 * Cognitive Flexibility Domain Calculation
 *
 * Measures ability to switch between different tasks and patterns.
 * Based on variety in word lengths found.
 *
 * Finding words of many different lengths shows mental adaptability.
 * Players who only find 3-letter words show less flexibility.
 */

interface FlexibilityInput {
  wordLengths: number[];
}

/**
 * Calculate Cognitive Flexibility score (0-100)
 *
 * Formula:
 * - uniqueLengths = count of distinct word lengths
 * - Score = (uniqueLengths / 8) * 100, capped at 100
 *
 * Tuned so that:
 * - 4 unique lengths = 50 points
 * - 6 unique lengths = 75 points
 * - 8+ unique lengths = 100 points (perfect)
 *
 * Typical games have word lengths from 3-10+, so 8 is achievable
 * but requires intentional variety.
 */
export function calculateFlexibility(input: FlexibilityInput): number {
  const { wordLengths } = input;

  if (wordLengths.length === 0) {
    return 0;
  }

  // Count unique word lengths
  const uniqueLengths = new Set(wordLengths).size;

  // Calculate score (8 unique lengths = perfect score)
  const rawScore = (uniqueLengths / 8) * 100;

  // Cap at 100 and round
  return Math.min(100, Math.round(rawScore));
}

/**
 * Count unique word lengths
 */
export function countUniqueWordLengths(wordLengths: number[]): number {
  return new Set(wordLengths).size;
}

/**
 * Get word length distribution for UI display
 */
export function getWordLengthDistribution(wordLengths: number[]): Map<number, number> {
  const distribution = new Map<number, number>();
  for (const len of wordLengths) {
    distribution.set(len, (distribution.get(len) ?? 0) + 1);
  }
  return distribution;
}
