/**
 * Adaptive Difficulty Module Barrel Exports
 *
 * Centralized exports for the adaptive difficulty system.
 * Provides clean import paths for consumers.
 */

// Performance tracking
export {
  calculateCombinedScore,
  calculateMetrics,
  getRecentAttempts,
} from './performanceTracker';
export type { PerformanceMetrics } from '@/types/difficulty';

// Tier assignment
export { determineTier } from './tierAssigner';
export type { TierDecision, LevelAttemptWithScore, DifficultyTier } from './tierAssigner';

// Hint escalation
export {
  getHintLevel,
  generateHint,
} from './hintEscalation';
export type { HintLevel, HintData } from './hintEscalation';

// Config adjustment
export {
  applyTierAdjustments,
  getTierAdjustments,
} from './configAdjuster';
export type { TierAdjustments } from '@/types/difficulty';

// Tier storage
export {
  getCurrentTier,
  saveTier,
  clearTierStorage,
} from './tierStorage';
export type { TierState } from './tierStorage';

// Constants
export {
  COMBINED_SCORE_WEIGHTS,
  ROLLING_WINDOW_SIZE,
  HIGH_SCORE_THRESHOLD,
  FAILURE_THRESHOLD,
} from './constants';
