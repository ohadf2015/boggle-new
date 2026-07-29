/**
 * Performance Monitor Tests
 *
 * Tests sliding window tracking, EMA smoothing, and metric calculation.
 * TDD: Write tests first, then implement to make them pass.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  SlidingWindowTracker,
  ExponentialMovingAverage,
  createPerformanceMonitor,
} from '../performanceMonitor';
import type { WordAttempt } from '@/types/aiDirector';

describe('ExponentialMovingAverage', () => {
  describe('initialization', () => {
    it('should initialize with provided alpha and initial value', () => {
      const ema = new ExponentialMovingAverage(0.3, 5);
      expect(ema.getValue()).toBe(5);
    });

    it('should default to 0 initial value', () => {
      const ema = new ExponentialMovingAverage(0.3);
      expect(ema.getValue()).toBe(0);
    });
  });

  describe('update', () => {
    it('should apply EMA formula: new = alpha * value + (1 - alpha) * old', () => {
      const ema = new ExponentialMovingAverage(0.3, 10);
      const result = ema.update(20);
      // Expected: 0.3 * 20 + 0.7 * 10 = 6 + 7 = 13
      expect(result).toBeCloseTo(13);
    });

    it('should gradually approach new values over multiple updates', () => {
      const ema = new ExponentialMovingAverage(0.3, 0);
      ema.update(10);
      ema.update(10);
      ema.update(10);
      // Should approach 10 but not quite reach it
      expect(ema.getValue()).toBeGreaterThan(5);
      expect(ema.getValue()).toBeLessThan(10);
    });

    it('should return current value after update', () => {
      const ema = new ExponentialMovingAverage(0.3, 0);
      const result = ema.update(10);
      expect(result).toBe(ema.getValue());
    });
  });

  describe('reset', () => {
    it('should reset to initial value', () => {
      const ema = new ExponentialMovingAverage(0.3, 5);
      ema.update(100);
      ema.reset();
      expect(ema.getValue()).toBe(5);
    });
  });
});

describe('SlidingWindowTracker', () => {
  let tracker: SlidingWindowTracker;

  beforeEach(() => {
    tracker = new SlidingWindowTracker();
  });

  describe('addWord', () => {
    it('should add word attempt to window', () => {
      tracker.addWord({ timestamp: 1000, valid: true, comboLevel: 1 });
      expect(tracker.getWindowSize()).toBe(1);
    });

    it('should maintain maximum window size of 10', () => {
      for (let i = 0; i < 15; i++) {
        tracker.addWord({ timestamp: i * 1000, valid: true, comboLevel: 1 });
      }
      expect(tracker.getWindowSize()).toBe(10);
    });

    it('should remove oldest entries when exceeding window size', () => {
      for (let i = 0; i < 12; i++) {
        tracker.addWord({ timestamp: i * 1000, valid: i > 1, comboLevel: 1 });
      }
      // First two entries (i=0, i=1 where valid=false) should be removed
      const rate = tracker.getSuccessRate();
      expect(rate).toBe(1); // All remaining are valid
    });
  });

  describe('getWordsPerMinute', () => {
    it('should return 0 for empty window', () => {
      expect(tracker.getWordsPerMinute()).toBe(0);
    });

    it('should return 0 for single word (need 2+ for time span)', () => {
      tracker.addWord({ timestamp: 1000, valid: true, comboLevel: 1 });
      expect(tracker.getWordsPerMinute()).toBe(0);
    });

    it('should calculate words per minute from time span', () => {
      // 6 words over 30 seconds = 12 WPM
      tracker.addWord({ timestamp: 0, valid: true, comboLevel: 1 });
      tracker.addWord({ timestamp: 5000, valid: true, comboLevel: 1 });
      tracker.addWord({ timestamp: 10000, valid: true, comboLevel: 1 });
      tracker.addWord({ timestamp: 15000, valid: true, comboLevel: 1 });
      tracker.addWord({ timestamp: 20000, valid: true, comboLevel: 1 });
      tracker.addWord({ timestamp: 30000, valid: true, comboLevel: 1 });

      const wpm = tracker.getWordsPerMinute();
      expect(wpm).toBeCloseTo(12, 1); // 6 words / 0.5 minutes
    });
  });

  describe('getSuccessRate', () => {
    it('should return 1.0 for empty window (default to good)', () => {
      expect(tracker.getSuccessRate()).toBe(1.0);
    });

    it('should calculate valid/total ratio', () => {
      tracker.addWord({ timestamp: 0, valid: true, comboLevel: 1 });
      tracker.addWord({ timestamp: 1000, valid: true, comboLevel: 1 });
      tracker.addWord({ timestamp: 2000, valid: false, comboLevel: 0 });
      tracker.addWord({ timestamp: 3000, valid: true, comboLevel: 1 });

      expect(tracker.getSuccessRate()).toBe(0.75); // 3/4
    });
  });

  describe('getAverageComboLevel', () => {
    it('should return 0 for empty window', () => {
      expect(tracker.getAverageComboLevel()).toBe(0);
    });

    it('should calculate average combo level', () => {
      tracker.addWord({ timestamp: 0, valid: true, comboLevel: 1 });
      tracker.addWord({ timestamp: 1000, valid: true, comboLevel: 2 });
      tracker.addWord({ timestamp: 2000, valid: true, comboLevel: 3 });
      tracker.addWord({ timestamp: 3000, valid: true, comboLevel: 4 });

      expect(tracker.getAverageComboLevel()).toBe(2.5);
    });
  });

  describe('reset', () => {
    it('should clear all entries', () => {
      tracker.addWord({ timestamp: 0, valid: true, comboLevel: 1 });
      tracker.addWord({ timestamp: 1000, valid: true, comboLevel: 2 });
      tracker.reset();
      expect(tracker.getWindowSize()).toBe(0);
    });
  });
});

describe('createPerformanceMonitor', () => {
  it('should create monitor with default settings', () => {
    const monitor = createPerformanceMonitor();
    expect(monitor).toBeDefined();
    expect(monitor.getMetrics()).toBeDefined();
  });

  describe('recordWord', () => {
    it('should update metrics after recording word', () => {
      const monitor = createPerformanceMonitor();
      monitor.recordWord(true, 1);
      // Metrics should be updated (exact values depend on EMA)
      const metrics = monitor.getMetrics();
      expect(metrics.successRate).toBe(1.0);
    });
  });

  describe('getMetrics', () => {
    it('should return PerformanceWindow with all required fields', () => {
      const monitor = createPerformanceMonitor();
      const metrics = monitor.getMetrics();

      expect(metrics).toHaveProperty('wordsPerMinute');
      expect(metrics).toHaveProperty('successRate');
      expect(metrics).toHaveProperty('comboMaintenance');
      expect(metrics).toHaveProperty('timeInFlow');
    });
  });

  describe('isWarmedUp', () => {
    it('should return false before warm-up period', () => {
      const monitor = createPerformanceMonitor();
      expect(monitor.isWarmedUp()).toBe(false);
    });

    it('should return false without minimum sample size', () => {
      const monitor = createPerformanceMonitor();
      for (let i = 0; i < 5; i++) {
        monitor.recordWord(true, 1);
      }
      expect(monitor.isWarmedUp()).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset all tracking state', () => {
      const monitor = createPerformanceMonitor();
      monitor.recordWord(true, 1);
      monitor.recordWord(true, 2);
      monitor.reset();

      const metrics = monitor.getMetrics();
      expect(metrics.wordsPerMinute).toBe(0);
    });
  });
});
