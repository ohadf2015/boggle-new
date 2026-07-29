/**
 * Performance Tracker Utilities
 *
 * Pure functions for calculating performance metrics and managing rolling window.
 * Foundation for adaptive difficulty tier assignment.
 */

import type { PerformanceMetrics, LevelAttemptWithScore } from '@/types/difficulty';
import { COMBINED_SCORE_WEIGHTS, ROLLING_WINDOW_SIZE } from './constants';

// ==============================================
// METRIC CALCULATION
// ==============================================

/**
 * Calculate combined performance score from individual metrics
 * Uses weighted sum to produce single 0-1 value
 *
 * @param metrics - Individual performance metrics (all 0-1 range)
 * @returns Combined score (0-1 range)
 *
 * @example
 * calculateCombinedScore({ completionRate: 1, timeEfficiency: 0.5, wordAccuracy: 0.6 })
 * // Returns 0.77 (0.5 + 0.15 + 0.12)
 */
export function calculateCombinedScore(metrics: PerformanceMetrics): number {
  const { completionRate, timeEfficiency, wordAccuracy } = metrics;
  const { completion, time, accuracy } = COMBINED_SCORE_WEIGHTS;

  const score =
    completionRate * completion +
    timeEfficiency * time +
    wordAccuracy * accuracy;

  // Clamp to 0-1 range (defensive)
  return Math.max(0, Math.min(1, score));
}

/**
 * Calculate performance metrics from a level attempt
 * Derives all three metrics (completion, time, accuracy) from raw data
 *
 * @param attempt - Raw attempt data
 * @returns Normalized performance metrics (all 0-1 range)
 *
 * @example
 * calculateMetrics({
 *   isCompletion: true,
 *   timeRemaining: 30,
 *   timerSeconds: 90,
 *   score: 450,
 *   words: 5
 * })
 * // Returns { completionRate: 1, timeEfficiency: 0.33, wordAccuracy: 0.9 }
 */
export function calculateMetrics(attempt: {
  isCompletion: boolean;
  timeRemaining: number;
  timerSeconds: number;
  score: number;
  words: number;
}): PerformanceMetrics {
  const { isCompletion, timeRemaining, timerSeconds, score, words } = attempt;

  // Completion: Binary 0 or 1
  const completionRate = isCompletion ? 1 : 0;

  // Time efficiency: Percentage of time remaining (clamped 0-1)
  const timeEfficiency = Math.max(0, Math.min(1, timeRemaining / timerSeconds));

  // Word accuracy: Score per word normalized (assume 100 points per word perfect)
  // Clamp to 1.0 max because combos can inflate score beyond base 100/word
  const wordAccuracy = words > 0 ? Math.min(score / (words * 100), 1) : 0;

  return {
    completionRate,
    timeEfficiency,
    wordAccuracy,
  };
}

// ==============================================
// ROLLING WINDOW
// ==============================================

/**
 * Get recent attempts for tier decision
 * Returns last N attempts sorted by timestamp (most recent first)
 *
 * @param attempts - All level attempts with combined scores
 * @param excludeBossLevels - If true, filters out level 7 (boss levels)
 * @returns Last ROLLING_WINDOW_SIZE attempts (most recent first)
 *
 * @example
 * getRecentAttempts(allAttempts, true)
 * // Returns last 3 non-boss attempts
 */
export function getRecentAttempts(
  attempts: LevelAttemptWithScore[],
  excludeBossLevels: boolean
): LevelAttemptWithScore[] {
  // Filter boss levels if requested
  const filteredAttempts = excludeBossLevels
    ? attempts.filter((a) => a.level !== 7)
    : attempts;

  // Sort by timestamp descending (most recent first)
  const sorted = [...filteredAttempts].sort((a, b) => {
    const timeA = new Date(a.lastAttemptAt).getTime();
    const timeB = new Date(b.lastAttemptAt).getTime();
    return timeB - timeA; // Descending
  });

  // Return last N attempts
  return sorted.slice(0, ROLLING_WINDOW_SIZE);
}
