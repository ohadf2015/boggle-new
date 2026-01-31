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
  /** Combined performance score (0-1) calculated from weighted metrics */
  combinedScore: number;
}
