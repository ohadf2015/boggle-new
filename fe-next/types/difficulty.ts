/**
 * Adaptive Difficulty System Type Definitions
 *
 * TypeScript interfaces and types for the adaptive difficulty system.
 * These types support performance tracking, tier assignment, and dynamic difficulty adjustments.
 */

import type { LevelAttempt } from './adventure';

// ==============================================
// PERFORMANCE METRICS
// ==============================================

/**
 * Performance metrics derived from a level attempt
 * All values are normalized to 0-1 range for consistent weighting
 */
export interface PerformanceMetrics {
  /** Whether the level was completed (1) or failed (0) */
  completionRate: number;
  /** Time efficiency as percentage of time remaining (0-1) */
  timeEfficiency: number;
  /** Word accuracy as score per word normalized (0-1) */
  wordAccuracy: number;
}

// ==============================================
// DIFFICULTY TIERS
// ==============================================

/**
 * Difficulty tier assigned based on player performance
 * - easy: Player struggling, reduce challenge
 * - normal: Player performing average, maintain challenge
 * - hard: Player excelling, increase challenge
 */
export type DifficultyTier = 'easy' | 'normal' | 'hard';

// ==============================================
// LEVEL ATTEMPTS WITH SCORE
// ==============================================

/**
 * Extended level attempt with calculated combined performance score
 * Combines completionRate, timeEfficiency, and wordAccuracy into single metric
 */
export interface LevelAttemptWithScore extends LevelAttempt {
  /** Whether the level was completed (true) or failed (false) */
  isCompletion: boolean;
  /** Combined performance score (0-1) calculated from weighted metrics */
  combinedScore: number;
}

// ==============================================
// TIER ADJUSTMENTS
// ==============================================

/**
 * Tier-based adjustments to level configuration
 * Applied to make levels easier (easy tier) or harder (hard tier)
 */
export interface TierAdjustments {
  /** Timer multiplier (1.2 for easy, 1.0 for normal, 0.85 for hard) */
  timerMultiplier: number;
  /** Score target multiplier (0.8 for easy, 1.0 for normal, 1.0 for hard) */
  scoreTargetMultiplier: number;
  /** Power-up cooldown multiplier (1.0 for easy/normal, 1.5 for hard) */
  powerUpCooldownMultiplier: number;
}
