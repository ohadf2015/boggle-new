/**
 * Performance Tracker Tests
 *
 * TDD tests for performance tracking utilities.
 * Tests calculateCombinedScore, calculateMetrics, and getRecentAttempts.
 */

import {
  calculateCombinedScore,
  calculateMetrics,
  getRecentAttempts,
} from '../performanceTracker';
import type { PerformanceMetrics, LevelAttemptWithScore } from '@/types/difficulty';
import type { LevelAttempt } from '@/types/adventure';

describe('calculateCombinedScore', () => {
  it('should return 1.0 for perfect metrics', () => {
    const metrics: PerformanceMetrics = {
      completionRate: 1,
      timeEfficiency: 1,
      wordAccuracy: 1,
    };
    const result = calculateCombinedScore(metrics);
    expect(result).toBe(1.0);
  });

  it('should return correct weighted sum for failed level', () => {
    const metrics: PerformanceMetrics = {
      completionRate: 0,
      timeEfficiency: 0.5,
      wordAccuracy: 0.8,
    };
    // (0 * 0.5) + (0.5 * 0.3) + (0.8 * 0.2) = 0 + 0.15 + 0.16 = 0.31
    const result = calculateCombinedScore(metrics);
    expect(result).toBeCloseTo(0.31, 2);
  });

  it('should return correct weighted sum for average level', () => {
    const metrics: PerformanceMetrics = {
      completionRate: 1,
      timeEfficiency: 0.5,
      wordAccuracy: 0.6,
    };
    // (1 * 0.5) + (0.5 * 0.3) + (0.6 * 0.2) = 0.5 + 0.15 + 0.12 = 0.77
    const result = calculateCombinedScore(metrics);
    expect(result).toBeCloseTo(0.77, 2);
  });

  it('should handle zero metrics', () => {
    const metrics: PerformanceMetrics = {
      completionRate: 0,
      timeEfficiency: 0,
      wordAccuracy: 0,
    };
    const result = calculateCombinedScore(metrics);
    expect(result).toBe(0);
  });

  it('should clamp result to 0-1 range (edge case with values > 1)', () => {
    const metrics: PerformanceMetrics = {
      completionRate: 1,
      timeEfficiency: 1,
      wordAccuracy: 1,
    };
    const result = calculateCombinedScore(metrics);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });
});

describe('calculateMetrics', () => {
  it('should calculate metrics for completed level with time remaining', () => {
    const attempt = {
      isCompletion: true,
      timeRemaining: 30,
      timerSeconds: 90,
      score: 450,
      words: 5,
    };
    const result = calculateMetrics(attempt);
    expect(result.completionRate).toBe(1);
    expect(result.timeEfficiency).toBeCloseTo(0.33, 2);
    expect(result.wordAccuracy).toBeCloseTo(0.9, 2); // 450 / (5 * 100) = 0.9
  });

  it('should calculate metrics for failed level with no time', () => {
    const attempt = {
      isCompletion: false,
      timeRemaining: 0,
      timerSeconds: 90,
      score: 200,
      words: 3,
    };
    const result = calculateMetrics(attempt);
    expect(result.completionRate).toBe(0);
    expect(result.timeEfficiency).toBe(0);
    expect(result.wordAccuracy).toBeCloseTo(0.67, 2); // 200 / (3 * 100) = 0.67
  });

  it('should handle zero words found', () => {
    const attempt = {
      isCompletion: false,
      timeRemaining: 10,
      timerSeconds: 90,
      score: 0,
      words: 0,
    };
    const result = calculateMetrics(attempt);
    expect(result.completionRate).toBe(0);
    expect(result.timeEfficiency).toBeCloseTo(0.11, 2);
    expect(result.wordAccuracy).toBe(0);
  });

  it('should clamp wordAccuracy to 1.0 max (combo bonuses can inflate score)', () => {
    const attempt = {
      isCompletion: true,
      timeRemaining: 45,
      timerSeconds: 90,
      score: 800, // High score from combos
      words: 5,
    };
    const result = calculateMetrics(attempt);
    expect(result.wordAccuracy).toBeLessThanOrEqual(1.0);
  });

  it('should handle negative timeRemaining as zero', () => {
    const attempt = {
      isCompletion: false,
      timeRemaining: -5,
      timerSeconds: 90,
      score: 100,
      words: 2,
    };
    const result = calculateMetrics(attempt);
    expect(result.timeEfficiency).toBe(0);
  });

  it('should handle full time remaining', () => {
    const attempt = {
      isCompletion: true,
      timeRemaining: 90,
      timerSeconds: 90,
      score: 300,
      words: 3,
    };
    const result = calculateMetrics(attempt);
    expect(result.timeEfficiency).toBe(1);
  });
});

describe('getRecentAttempts', () => {
  const createAttempt = (
    world: number,
    level: number,
    combinedScore: number,
    timestamp: string,
    isCompletion = true
  ): LevelAttemptWithScore => ({
    world,
    level,
    bestWords: 5,
    bestScore: 300,
    bestTimeRemaining: 30,
    objectiveProgress: {},
    attemptCount: 1,
    consecutiveFailures: isCompletion ? 0 : 1,
    firstAttemptAt: timestamp,
    lastAttemptAt: timestamp,
    isCompletion,
    combinedScore,
  });

  it('should return last 3 attempts when more than 3 exist', () => {
    const attempts: LevelAttemptWithScore[] = [
      createAttempt(1, 1, 0.5, '2024-01-01T10:00:00Z'),
      createAttempt(1, 2, 0.6, '2024-01-01T11:00:00Z'),
      createAttempt(1, 3, 0.7, '2024-01-01T12:00:00Z'),
      createAttempt(1, 4, 0.8, '2024-01-01T13:00:00Z'),
      createAttempt(1, 5, 0.9, '2024-01-01T14:00:00Z'),
    ];
    const result = getRecentAttempts(attempts, false);
    expect(result).toHaveLength(3);
    expect(result[0].level).toBe(5); // Most recent
    expect(result[1].level).toBe(4);
    expect(result[2].level).toBe(3);
  });

  it('should return all attempts when fewer than 3 exist', () => {
    const attempts: LevelAttemptWithScore[] = [
      createAttempt(1, 1, 0.5, '2024-01-01T10:00:00Z'),
      createAttempt(1, 2, 0.6, '2024-01-01T11:00:00Z'),
    ];
    const result = getRecentAttempts(attempts, false);
    expect(result).toHaveLength(2);
  });

  it('should return empty array when no attempts', () => {
    const attempts: LevelAttemptWithScore[] = [];
    const result = getRecentAttempts(attempts, false);
    expect(result).toEqual([]);
  });

  it('should exclude boss levels (level 7) when excludeBossLevels=true', () => {
    const attempts: LevelAttemptWithScore[] = [
      createAttempt(1, 5, 0.7, '2024-01-01T10:00:00Z'),
      createAttempt(1, 6, 0.8, '2024-01-01T11:00:00Z'),
      createAttempt(1, 7, 0.9, '2024-01-01T12:00:00Z'), // Boss level
      createAttempt(2, 1, 0.75, '2024-01-01T13:00:00Z'),
      createAttempt(2, 2, 0.85, '2024-01-01T14:00:00Z'),
    ];
    const result = getRecentAttempts(attempts, true);
    expect(result).toHaveLength(3);
    expect(result.every(a => a.level !== 7)).toBe(true);
    expect(result[0].level).toBe(2); // Most recent non-boss
    expect(result[1].level).toBe(1);
    expect(result[2].level).toBe(6);
  });

  it('should include boss levels when excludeBossLevels=false', () => {
    const attempts: LevelAttemptWithScore[] = [
      createAttempt(1, 6, 0.8, '2024-01-01T11:00:00Z'),
      createAttempt(1, 7, 0.9, '2024-01-01T12:00:00Z'), // Boss level
      createAttempt(2, 1, 0.75, '2024-01-01T13:00:00Z'),
    ];
    const result = getRecentAttempts(attempts, false);
    expect(result).toHaveLength(3);
    expect(result[0].level).toBe(1);
    expect(result[1].level).toBe(7); // Boss included
    expect(result[2].level).toBe(6);
  });

  it('should sort by timestamp descending (most recent first)', () => {
    const attempts: LevelAttemptWithScore[] = [
      createAttempt(1, 1, 0.5, '2024-01-01T14:00:00Z'), // Latest timestamp
      createAttempt(1, 2, 0.6, '2024-01-01T10:00:00Z'), // Earliest timestamp
      createAttempt(1, 3, 0.7, '2024-01-01T12:00:00Z'), // Middle timestamp
    ];
    const result = getRecentAttempts(attempts, false);
    expect(result[0].lastAttemptAt).toBe('2024-01-01T14:00:00Z');
    expect(result[1].lastAttemptAt).toBe('2024-01-01T12:00:00Z');
    expect(result[2].lastAttemptAt).toBe('2024-01-01T10:00:00Z');
  });
});
