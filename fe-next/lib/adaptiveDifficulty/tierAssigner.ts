/**
 * Tier Assignment Logic for Adaptive Difficulty System
 *
 * Determines player difficulty tier based on rolling window of recent attempts.
 * Pure function with no side effects.
 */

import {
  FAILURE_THRESHOLD,
  HIGH_SCORE_THRESHOLD,
  ROLLING_WINDOW_SIZE,
} from './constants';
import type { DifficultyTier, LevelAttemptWithScore } from '@/types/difficulty';

// Re-export type for consumers importing from this module
export type { DifficultyTier, LevelAttemptWithScore };

export type TierDecision = {
  tier: DifficultyTier;
  reason: string;
};

/**
 * Determines difficulty tier based on recent level attempt history.
 *
 * Logic priority:
 * 1. Insufficient data (< 3 attempts) → normal
 * 2. High failure rate (>= 2 failures) → easy
 * 3. Consistent mastery (3 wins with scores > 0.8) → hard
 * 4. Default → normal
 *
 * @param recentAttempts - Array of recent level attempts with completion status and scores
 * @returns TierDecision with assigned tier and reason
 */
export function determineTier(
  recentAttempts: LevelAttemptWithScore[]
): TierDecision {
  // 1. Check for insufficient data
  if (recentAttempts.length < ROLLING_WINDOW_SIZE) {
    return {
      tier: 'normal',
      reason: 'insufficient_data'
    };
  }

  // 2. Count failures in the window
  const failureCount = recentAttempts.filter(
    attempt => !attempt.isCompletion
  ).length;

  if (failureCount >= FAILURE_THRESHOLD) {
    return {
      tier: 'easy',
      reason: 'high_failure_rate'
    };
  }

  // 3. Check for consistent mastery
  // All 3 must be completions AND all 3 must have scores > 0.8
  const allCompleted = recentAttempts.every(attempt => attempt.isCompletion);
  const allHighScores = recentAttempts.every(
    attempt => attempt.combinedScore > HIGH_SCORE_THRESHOLD
  );

  if (allCompleted && allHighScores) {
    return {
      tier: 'hard',
      reason: 'consistent_mastery'
    };
  }

  // 4. Default to balanced performance
  return {
    tier: 'normal',
    reason: 'balanced_performance'
  };
}
