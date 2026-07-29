/**
 * Flow State Detector
 *
 * Determines player flow state using Csikszentmihalyi model.
 * Classifies player as: flow, bored, frustrated, or learning.
 *
 * DDA-02: AI Director adjusts intensity based on player flow state
 *
 * Flow Theory (Csikszentmihalyi):
 * - Flow occurs when skill matches challenge
 * - Too easy = boredom
 * - Too hard = frustration
 * - Improving = learning (good state, don't adjust)
 */

import type { FlowState, PerformanceWindow, FlowThresholds } from '@/types/aiDirector';
import { FLOW_THRESHOLDS } from './constants';

// ==============================================
// FLOW STATE DETECTION
// ==============================================

/**
 * Detect current flow state based on performance metrics
 *
 * @param metrics - Current performance window
 * @param thresholds - Optional custom thresholds (defaults to FLOW_THRESHOLDS)
 * @returns Flow state: 'flow' | 'bored' | 'frustrated' | 'learning'
 */
export function detectFlowState(
  metrics: PerformanceWindow,
  thresholds: FlowThresholds = FLOW_THRESHOLDS
): FlowState {
  const { wordsPerMinute, successRate, comboMaintenance } = metrics;
  const { optimalWPM, optimalSuccessRate, optimalCombo } = thresholds;

  // Check if in optimal flow channel
  const wpmInRange = wordsPerMinute >= optimalWPM.min && wordsPerMinute <= optimalWPM.max;
  const successInRange = successRate >= optimalSuccessRate.min && successRate <= optimalSuccessRate.max;
  const comboInRange = comboMaintenance >= optimalCombo.min && comboMaintenance <= optimalCombo.max;

  // All metrics in optimal range = flow state
  if (wpmInRange && successInRange && comboInRange) {
    return 'flow';
  }

  // High performance across the board = bored (too easy)
  const successHigh = successRate > optimalSuccessRate.max;
  const comboHigh = comboMaintenance > optimalCombo.max;

  if (successHigh && comboHigh) {
    return 'bored';
  }

  // Low performance across the board = frustrated (too hard)
  const successLow = successRate < optimalSuccessRate.min;
  const comboLow = comboMaintenance < optimalCombo.min;

  if (successLow && comboLow) {
    return 'frustrated';
  }

  // Mixed metrics or improving = learning (good state, don't adjust)
  // This catches:
  // - Slow but accurate players (learning)
  // - Players improving toward flow
  // - Edge cases that don't clearly indicate bored/frustrated
  return 'learning';
}

// ==============================================
// HELPER FUNCTIONS
// ==============================================

/**
 * Check if player is currently in the flow channel
 *
 * @param metrics - Current performance window
 * @param thresholds - Optional custom thresholds
 * @returns true if in flow state
 */
export function isInFlowChannel(
  metrics: PerformanceWindow,
  thresholds: FlowThresholds = FLOW_THRESHOLDS
): boolean {
  return detectFlowState(metrics, thresholds) === 'flow';
}

/**
 * Calculate a flow score (0-1) representing how close to optimal flow
 *
 * Score is based on distance from optimal midpoints:
 * - 1.0 = perfect flow (all metrics at midpoint)
 * - 0.0 = maximum deviation from flow
 *
 * @param metrics - Current performance window
 * @param thresholds - Optional custom thresholds
 * @returns Flow score 0-1
 */
export function calculateFlowScore(
  metrics: PerformanceWindow,
  thresholds: FlowThresholds = FLOW_THRESHOLDS
): number {
  const { wordsPerMinute, successRate, comboMaintenance } = metrics;
  const { optimalWPM, optimalSuccessRate, optimalCombo } = thresholds;

  // Calculate midpoints
  const wpmMid = (optimalWPM.min + optimalWPM.max) / 2;
  const successMid = (optimalSuccessRate.min + optimalSuccessRate.max) / 2;
  const comboMid = (optimalCombo.min + optimalCombo.max) / 2;

  // Calculate ranges
  const wpmRange = optimalWPM.max - optimalWPM.min;
  const successRange = optimalSuccessRate.max - optimalSuccessRate.min;
  const comboRange = optimalCombo.max - optimalCombo.min;

  // Calculate normalized distances from midpoint (0 = at midpoint, 1 = at edge or beyond)
  const wpmDist = Math.min(1, Math.abs(wordsPerMinute - wpmMid) / (wpmRange / 2 + wpmMid));
  const successDist = Math.min(1, Math.abs(successRate - successMid) / (successRange / 2 + successMid));
  const comboDist = Math.min(1, Math.abs(comboMaintenance - comboMid) / (comboRange / 2 + comboMid));

  // Average distance (inverted so 1 = perfect)
  const avgDist = (wpmDist + successDist + comboDist) / 3;

  return Math.max(0, 1 - avgDist);
}
