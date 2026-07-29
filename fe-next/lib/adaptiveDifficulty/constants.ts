/**
 * Adaptive Difficulty System Constants
 *
 * Tunable weights, thresholds, and configuration for adaptive difficulty.
 * These values control tier assignment and performance evaluation.
 */

// ==============================================
// PERFORMANCE SCORING WEIGHTS
// ==============================================

/**
 * Weights for combined score calculation
 * Total must sum to 1.0 for normalized 0-1 output
 *
 * Philosophy:
 * - completion (0.5): Highest weight - actually finishing is most important
 * - time (0.3): Moderate weight - efficiency matters but not critical
 * - accuracy (0.2): Lower weight - quality is nice but volume drives progression
 */
export const COMBINED_SCORE_WEIGHTS = {
  completion: 0.5,
  time: 0.3,
  accuracy: 0.2,
} as const;

// ==============================================
// ROLLING WINDOW CONFIGURATION
// ==============================================

/**
 * Number of recent attempts to consider for tier assignment
 * 3 attempts provides stable trend without being too slow to adapt
 */
export const ROLLING_WINDOW_SIZE = 3;

// ==============================================
// TIER THRESHOLDS
// ==============================================

/**
 * Threshold for considering a score "high performance"
 * Scores >= 0.8 indicate player is excelling and ready for harder challenges
 */
export const HIGH_SCORE_THRESHOLD = 0.8;

/**
 * Threshold for considering a score "low performance"
 * Scores < 0.5 indicate player is struggling and needs easier challenges
 */
export const LOW_SCORE_THRESHOLD = 0.5;

/**
 * Number of failures in rolling window to trigger tier downgrade
 * >= 2 failures in last 3 attempts indicates player needs easier tier
 */
export const FAILURE_THRESHOLD = 2;
