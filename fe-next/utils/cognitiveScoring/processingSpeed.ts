/**
 * Processing Speed Domain Calculation
 *
 * Measures how quickly you find words.
 * Based on Words Per Minute (WPM) normalized by grid size.
 */

import { WPM_THRESHOLDS } from '@/shared/types/cognitive';

interface ProcessingSpeedInput {
  wordsFound: number;
  gameDurationSeconds: number;
  gridSize: number;
}

/**
 * Calculate Processing Speed score (0-100)
 *
 * Formula:
 * - WPM = wordsFound / (gameDuration / 60)
 * - Score = (WPM / threshold) * 100, capped at 100
 *
 * Thresholds vary by grid size (bigger grids = more words available)
 */
export function calculateProcessingSpeed(input: ProcessingSpeedInput): number {
  const { wordsFound, gameDurationSeconds, gridSize } = input;

  if (gameDurationSeconds === 0 || wordsFound === 0) {
    return 0;
  }

  // Calculate words per minute
  const gameDurationMinutes = gameDurationSeconds / 60;
  const wpm = wordsFound / gameDurationMinutes;

  // Get threshold for this grid size, default to 5x5 threshold
  const threshold = WPM_THRESHOLDS[gridSize] ?? WPM_THRESHOLDS[25];

  // Calculate score (0-100)
  const rawScore = (wpm / threshold) * 100;

  // Cap at 100 and round to integer
  return Math.min(100, Math.round(rawScore));
}

/**
 * Get WPM from a game
 */
export function calculateWordsPerMinute(wordsFound: number, gameDurationSeconds: number): number {
  if (gameDurationSeconds === 0) return 0;
  const gameDurationMinutes = gameDurationSeconds / 60;
  return Math.round((wordsFound / gameDurationMinutes) * 100) / 100;
}
