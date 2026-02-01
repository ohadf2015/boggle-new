/**
 * AI Director Constants
 *
 * Tunable thresholds for flow detection and adjustment rates.
 * Based on Csikszentmihalyi flow model adapted for word games.
 */

import type { FlowThresholds, IntensityAdjustment } from '@/types/aiDirector';

// Flow state detection thresholds (calibrated for word games)
export const FLOW_THRESHOLDS: FlowThresholds = {
  optimalWPM: { min: 3, max: 7 }, // 3-7 words per minute
  optimalSuccessRate: { min: 0.7, max: 0.9 }, // 70-90% success rate
  optimalCombo: { min: 2, max: 4 }, // Combo level 2-4
};

// EMA smoothing factor (0.3 = moderate smoothing)
export const EMA_ALPHA = 0.3;

// Warm-up period before making adjustments (ms)
export const WARM_UP_PERIOD_MS = 60000; // 60 seconds

// Minimum sample size before flow detection
export const MIN_SAMPLE_SIZE = 10;

// Sliding window sizes
export const WORD_WINDOW_SIZE = 10;
export const ATTEMPT_WINDOW_SIZE = 20;

// Default intensity (neutral - no adjustments)
export const DEFAULT_INTENSITY: IntensityAdjustment = {
  hintEscalationRate: 1.0,
  powerUpSpawnBonus: 0,
  comboGracePeriod: 0,
  celebrationDuration: 0,
};

// Adjustment rate per transition (10% = gradual)
export const ADJUSTMENT_RATE = 0.1;
