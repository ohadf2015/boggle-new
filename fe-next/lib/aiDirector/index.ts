/**
 * AI Director Module Barrel Exports
 *
 * Centralized exports for the AI Director system.
 * Provides clean import paths for consumers.
 */

// Performance monitoring
export {
  SlidingWindowTracker,
  ExponentialMovingAverage,
  createPerformanceMonitor,
} from './performanceMonitor';

// Flow state detection
export {
  detectFlowState,
  isInFlowChannel,
  calculateFlowScore,
} from './flowStateDetector';

// Intensity control
export type { IntensityController } from './intensityController';
export {
  createIntensityController,
  getAdjustmentsAtTransition,
} from './intensityController';

// Constants
export {
  FLOW_THRESHOLDS,
  EMA_ALPHA,
  WARM_UP_PERIOD_MS,
  MIN_SAMPLE_SIZE,
  WORD_WINDOW_SIZE,
  ATTEMPT_WINDOW_SIZE,
  DEFAULT_INTENSITY,
  ADJUSTMENT_RATE,
} from './constants';

// Analytics logging
export {
  logDDAEvent,
  createDDAEvent,
  createDDAAnalyticsPayload,
  aggregateDDAEffectiveness,
} from './analyticsLogger';
export type {
  DDAAnalyticsEvent,
  DDAAnalyticsPayload,
  DDAEffectivenessMetrics,
  AdjustmentTrigger,
} from './analyticsLogger';

// Types (re-export for convenience)
export type {
  FlowState,
  PerformanceWindow,
  IntensityAdjustment,
  FlowThresholds,
  WordAttempt,
} from '@/types/aiDirector';
