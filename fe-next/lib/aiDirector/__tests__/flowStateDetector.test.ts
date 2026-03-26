/**
 * Flow State Detector Tests
 *
 * Tests Csikszentmihalyi-based flow detection for word games.
 * TDD: Write tests first, then implement to make them pass.
 */

import { describe, it, expect } from 'vitest';
import {
  detectFlowState,
  isInFlowChannel,
  calculateFlowScore,
} from '../flowStateDetector';
import type { PerformanceWindow, FlowThresholds } from '@/types/aiDirector';

// Helper to create performance window with defaults
function createMetrics(overrides: Partial<PerformanceWindow> = {}): PerformanceWindow {
  return {
    wordsPerMinute: 5,
    successRate: 0.8,
    comboMaintenance: 3,
    timeInFlow: 0,
    ...overrides,
  };
}

describe('detectFlowState', () => {
  describe('flow state detection', () => {
    it('should return "flow" when all metrics are in optimal range', () => {
      const metrics = createMetrics({
        wordsPerMinute: 5,    // Within 3-7
        successRate: 0.8,     // Within 0.7-0.9
        comboMaintenance: 3,  // Within 2-4
      });

      expect(detectFlowState(metrics)).toBe('flow');
    });

    it('should return "flow" at lower bounds of optimal range', () => {
      const metrics = createMetrics({
        wordsPerMinute: 3,
        successRate: 0.7,
        comboMaintenance: 2,
      });

      expect(detectFlowState(metrics)).toBe('flow');
    });

    it('should return "flow" at upper bounds of optimal range', () => {
      const metrics = createMetrics({
        wordsPerMinute: 7,
        successRate: 0.9,
        comboMaintenance: 4,
      });

      expect(detectFlowState(metrics)).toBe('flow');
    });
  });

  describe('bored state detection', () => {
    it('should return "bored" when success rate is too high with high combo', () => {
      const metrics = createMetrics({
        wordsPerMinute: 8,     // Above optimal
        successRate: 0.95,     // Above 0.9
        comboMaintenance: 5,   // Above 4
      });

      expect(detectFlowState(metrics)).toBe('bored');
    });

    it('should return "bored" when consistently exceeding all thresholds', () => {
      const metrics = createMetrics({
        wordsPerMinute: 10,
        successRate: 0.98,
        comboMaintenance: 6,
      });

      expect(detectFlowState(metrics)).toBe('bored');
    });
  });

  describe('frustrated state detection', () => {
    it('should return "frustrated" when success rate is too low with low combo', () => {
      const metrics = createMetrics({
        wordsPerMinute: 2,     // Below optimal
        successRate: 0.5,      // Below 0.7
        comboMaintenance: 1,   // Below 2
      });

      expect(detectFlowState(metrics)).toBe('frustrated');
    });

    it('should return "frustrated" when failing consistently', () => {
      const metrics = createMetrics({
        wordsPerMinute: 1,
        successRate: 0.3,
        comboMaintenance: 0,
      });

      expect(detectFlowState(metrics)).toBe('frustrated');
    });
  });

  describe('learning state detection', () => {
    it('should return "learning" when metrics are mixed (improving)', () => {
      const metrics = createMetrics({
        wordsPerMinute: 4,     // In range
        successRate: 0.65,     // Just below optimal
        comboMaintenance: 2,   // At lower bound
      });

      expect(detectFlowState(metrics)).toBe('learning');
    });

    it('should return "learning" when WPM is low but success rate is good', () => {
      const metrics = createMetrics({
        wordsPerMinute: 2,     // Below optimal (slow but accurate)
        successRate: 0.85,     // Good
        comboMaintenance: 3,   // Good
      });

      expect(detectFlowState(metrics)).toBe('learning');
    });
  });

  describe('custom thresholds', () => {
    it('should accept custom flow thresholds', () => {
      const customThresholds: FlowThresholds = {
        optimalWPM: { min: 10, max: 15 },
        optimalSuccessRate: { min: 0.9, max: 1.0 },
        optimalCombo: { min: 5, max: 8 },
      };

      const metrics = createMetrics({
        wordsPerMinute: 12,
        successRate: 0.95,
        comboMaintenance: 6,
      });

      expect(detectFlowState(metrics, customThresholds)).toBe('flow');
    });
  });
});

describe('isInFlowChannel', () => {
  it('should return true when in flow state', () => {
    const metrics = createMetrics({
      wordsPerMinute: 5,
      successRate: 0.8,
      comboMaintenance: 3,
    });

    expect(isInFlowChannel(metrics)).toBe(true);
  });

  it('should return false when not in flow state', () => {
    const metrics = createMetrics({
      wordsPerMinute: 1,
      successRate: 0.3,
      comboMaintenance: 0,
    });

    expect(isInFlowChannel(metrics)).toBe(false);
  });
});

describe('calculateFlowScore', () => {
  it('should return 1.0 for perfect flow state', () => {
    const metrics = createMetrics({
      wordsPerMinute: 5,    // Middle of 3-7
      successRate: 0.8,     // Middle of 0.7-0.9
      comboMaintenance: 3,  // Middle of 2-4
    });

    const score = calculateFlowScore(metrics);
    expect(score).toBeGreaterThan(0.9);
  });

  it('should return value between 0 and 1', () => {
    const metrics = createMetrics({
      wordsPerMinute: 10,
      successRate: 0.5,
      comboMaintenance: 1,
    });

    const score = calculateFlowScore(metrics);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('should return lower score when far from optimal', () => {
    const farMetrics = createMetrics({
      wordsPerMinute: 15,
      successRate: 0.2,
      comboMaintenance: 0,
    });

    const closeMetrics = createMetrics({
      wordsPerMinute: 5,
      successRate: 0.8,
      comboMaintenance: 3,
    });

    expect(calculateFlowScore(farMetrics)).toBeLessThan(calculateFlowScore(closeMetrics));
  });
});
