/**
 * Performance Monitor
 *
 * Tracks player performance using sliding window algorithm with EMA smoothing.
 * Provides real-time metrics for flow state detection.
 *
 * DDA-01: System tracks performance metrics (words per minute, success rate, combo length)
 */

import type { PerformanceWindow, WordAttempt } from '@/types/aiDirector';
import {
  EMA_ALPHA,
  WORD_WINDOW_SIZE,
  WARM_UP_PERIOD_MS,
  MIN_SAMPLE_SIZE,
} from './constants';

// ==============================================
// EXPONENTIAL MOVING AVERAGE
// ==============================================

/**
 * Exponential Moving Average for smooth metric transitions
 * Formula: EMA_t = alpha * value_t + (1 - alpha) * EMA_(t-1)
 */
export class ExponentialMovingAverage {
  private alpha: number;
  private currentValue: number;
  private initialValue: number;

  constructor(alpha: number = EMA_ALPHA, initialValue: number = 0) {
    this.alpha = alpha;
    this.currentValue = initialValue;
    this.initialValue = initialValue;
  }

  /**
   * Update EMA with new value
   * @returns Updated EMA value
   */
  update(newValue: number): number {
    this.currentValue =
      this.alpha * newValue + (1 - this.alpha) * this.currentValue;
    return this.currentValue;
  }

  /**
   * Get current EMA value
   */
  getValue(): number {
    return this.currentValue;
  }

  /**
   * Reset to initial value
   */
  reset(): void {
    this.currentValue = this.initialValue;
  }
}

// ==============================================
// SLIDING WINDOW TRACKER
// ==============================================

/**
 * Sliding Window Tracker for performance metrics
 * Maintains last N word attempts for metric calculation
 */
export class SlidingWindowTracker {
  private words: WordAttempt[] = [];
  private windowSize: number;

  constructor(windowSize: number = WORD_WINDOW_SIZE) {
    this.windowSize = windowSize;
  }

  /**
   * Add word attempt to the window
   */
  addWord(attempt: WordAttempt): void {
    this.words.push(attempt);

    // Maintain window size
    if (this.words.length > this.windowSize) {
      this.words.shift();
    }
  }

  /**
   * Get current window size
   */
  getWindowSize(): number {
    return this.words.length;
  }

  /**
   * Calculate words per minute from time span
   * @returns WPM or 0 if insufficient data
   */
  getWordsPerMinute(): number {
    if (this.words.length < 2) return 0;

    const firstTimestamp = this.words[0].timestamp;
    const lastTimestamp = this.words[this.words.length - 1].timestamp;
    const timeSpanMs = lastTimestamp - firstTimestamp;

    if (timeSpanMs <= 0) return 0;

    const minutes = timeSpanMs / 60000;
    return this.words.length / minutes;
  }

  /**
   * Calculate success rate (valid/total)
   * @returns Success rate 0-1, defaults to 1.0 for empty window
   */
  getSuccessRate(): number {
    if (this.words.length === 0) return 1.0;

    const validCount = this.words.filter((w) => w.valid).length;
    return validCount / this.words.length;
  }

  /**
   * Calculate average combo level maintained
   * @returns Average combo or 0 for empty window
   */
  getAverageComboLevel(): number {
    if (this.words.length === 0) return 0;

    const sum = this.words.reduce((acc, w) => acc + w.comboLevel, 0);
    return sum / this.words.length;
  }

  /**
   * Clear all entries
   */
  reset(): void {
    this.words = [];
  }
}

// ==============================================
// PERFORMANCE MONITOR
// ==============================================

interface PerformanceMonitor {
  recordWord: (valid: boolean, comboLevel: number) => void;
  getMetrics: () => PerformanceWindow;
  isWarmedUp: () => boolean;
  reset: () => void;
}

/**
 * Create a performance monitor for tracking player metrics
 * Combines sliding window with EMA smoothing for stable readings
 */
export function createPerformanceMonitor(): PerformanceMonitor {
  const tracker = new SlidingWindowTracker(WORD_WINDOW_SIZE);
  const wpmEMA = new ExponentialMovingAverage(EMA_ALPHA, 0);
  const successRateEMA = new ExponentialMovingAverage(EMA_ALPHA, 1.0);
  const comboEMA = new ExponentialMovingAverage(EMA_ALPHA, 0);

  let startTime = Date.now();
  let wordCount = 0;
  let timeInFlow = 0;

  return {
    /**
     * Record a word attempt
     */
    recordWord(valid: boolean, comboLevel: number): void {
      const attempt: WordAttempt = {
        timestamp: Date.now(),
        valid,
        comboLevel,
      };

      tracker.addWord(attempt);
      wordCount++;

      // Update EMA values
      wpmEMA.update(tracker.getWordsPerMinute());
      successRateEMA.update(tracker.getSuccessRate());
      comboEMA.update(tracker.getAverageComboLevel());
    },

    /**
     * Get current performance metrics
     */
    getMetrics(): PerformanceWindow {
      return {
        wordsPerMinute: wpmEMA.getValue(),
        successRate: successRateEMA.getValue(),
        comboMaintenance: comboEMA.getValue(),
        timeInFlow,
      };
    },

    /**
     * Check if warm-up period has passed and sufficient samples collected
     */
    isWarmedUp(): boolean {
      const elapsed = Date.now() - startTime;
      return elapsed >= WARM_UP_PERIOD_MS && wordCount >= MIN_SAMPLE_SIZE;
    },

    /**
     * Reset all tracking state
     */
    reset(): void {
      tracker.reset();
      wpmEMA.reset();
      successRateEMA.reset();
      comboEMA.reset();
      startTime = Date.now();
      wordCount = 0;
      timeInFlow = 0;
    },
  };
}
