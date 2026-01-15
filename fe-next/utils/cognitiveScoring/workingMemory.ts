/**
 * Working Memory Domain Calculation
 *
 * Measures ability to hold and manipulate information.
 * Based on average word length and grid complexity.
 *
 * Longer words require holding more letters in mind.
 * Larger grids require tracking more potential paths.
 */

import { GRID_NORMALIZERS } from '@/shared/types/cognitive';

interface WorkingMemoryInput {
  wordLengths: number[];
  gridSize: number;
}

/**
 * Calculate Working Memory score (0-100)
 *
 * Formula:
 * - avgLength = sum(wordLengths) / count
 * - gridBonus = sqrt(gridSize) / 5 (normalizer: 1.0 for 5x5, up to 1.3 for 7x7)
 * - Score = avgLength * gridBonus * 12, capped at 100
 *
 * The multiplier (12) is tuned so that:
 * - Average word length of 4 on 5x5 = ~48 points
 * - Average word length of 6 on 7x7 = ~94 points
 */
export function calculateWorkingMemory(input: WorkingMemoryInput): number {
  const { wordLengths, gridSize } = input;

  if (wordLengths.length === 0) {
    return 0;
  }

  // Calculate average word length
  const totalLength = wordLengths.reduce((sum, len) => sum + len, 0);
  const avgLength = totalLength / wordLengths.length;

  // Get grid normalizer, default to 5x5
  const gridNormalizer = GRID_NORMALIZERS[gridSize] ?? GRID_NORMALIZERS[25];

  // Calculate score with tuned multiplier
  const rawScore = avgLength * gridNormalizer * 12;

  // Cap at 100 and round
  return Math.min(100, Math.round(rawScore));
}

/**
 * Calculate average word length
 */
export function calculateAverageWordLength(wordLengths: number[]): number {
  if (wordLengths.length === 0) return 0;
  const total = wordLengths.reduce((sum, len) => sum + len, 0);
  return Math.round((total / wordLengths.length) * 100) / 100;
}
