/**
 * AI Director Type Definitions
 *
 * Interfaces for dynamic difficulty tuning system.
 * Tracks performance metrics and manages flow state detection.
 */

// Flow states based on Csikszentmihalyi model
export type FlowState = 'bored' | 'flow' | 'frustrated' | 'learning';

// Performance metrics from sliding window
export interface PerformanceWindow {
  wordsPerMinute: number; // Rolling average (last 10 words)
  successRate: number; // Valid/total ratio (last 20 attempts)
  comboMaintenance: number; // Average combo level maintained
  timeInFlow: number; // Seconds in optimal performance zone
}

// Intensity adjustments (pacing, NOT difficulty)
export interface IntensityAdjustment {
  hintEscalationRate: number; // 0.5-2.0x hint appearance speed
  powerUpSpawnBonus: number; // +0-2 extra power-ups for struggling
  comboGracePeriod: number; // +0-3s before combo expires
  celebrationDuration: number; // +0-1s celebration time for wins
}

// Flow state thresholds
export interface FlowThresholds {
  optimalWPM: { min: number; max: number };
  optimalSuccessRate: { min: number; max: number };
  optimalCombo: { min: number; max: number };
}

// Word attempt record for sliding window
export interface WordAttempt {
  timestamp: number;
  valid: boolean;
  comboLevel: number;
}
