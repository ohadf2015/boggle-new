/**
 * useAdaptiveDifficulty Hook Tests
 *
 * Tests for React hook that integrates adaptive difficulty system
 * with ProgressionContext and localStorage persistence.
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAdaptiveDifficulty } from '../useAdaptiveDifficulty';

// Mock ProgressionContext
const { mockRecordAttempt } = vi.hoisted(() => {
  const mockRecordAttempt = vi.fn();
  return { mockRecordAttempt };
});
vi.mock('@/contexts/ProgressionContext', () => ({
  useProgression: vi.fn(() => ({
    attempts: [],
    recordAttempt: mockRecordAttempt,
  })),
}));

// Mock tierStorage
vi.mock('@/lib/adaptiveDifficulty/tierStorage', () => ({
  getCurrentTier: vi.fn(() => 'normal'),
  saveTier: vi.fn(),
}));

// Mock levelConfig
vi.mock('@/lib/adventure/levelConfig', () => ({
  getLevelConfig: vi.fn((world: number, level: number) => ({
    world,
    level,
    gridSize: 5 as const,
    timerSeconds: 90,
    objectives: [
      { type: 'scoreTarget' as const, target: 500, isPrimary: true },
    ],
    specialTiles: [],
    difficulty: 'MEDIUM' as const,
    chapterNumber: 1 as const,
    levelInChapter: 1 as const,
    isBossLevel: level === 7,
  })),
}));

describe('useAdaptiveDifficulty', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRecordAttempt.mockResolvedValue(null);
  });

  describe('basic functionality', () => {
    it('should return tier, adjustedConfig, hintData, and recordCompletion', () => {
      const { result } = renderHook(() =>
        useAdaptiveDifficulty({ world: 1, level: 1 })
      );

      expect(result.current.tier).toBeDefined();
      expect(result.current.adjustedConfig).toBeDefined();
      expect(result.current.hintData).toBeDefined();
      expect(result.current.powerUpCooldownMultiplier).toBeDefined();
      expect(typeof result.current.recordCompletion).toBe('function');
    });

    it('should return hint data with level "none" for 0 attempts', () => {
      const { result } = renderHook(() =>
        useAdaptiveDifficulty({ world: 1, level: 1 })
      );

      expect(result.current.hintData.level).toBe('none');
    });
  });

  describe('ProgressionContext wiring', () => {
    it('should call ProgressionContext.recordAttempt with correct parameters', async () => {
      const { result } = renderHook(() =>
        useAdaptiveDifficulty({ world: 1, level: 1 })
      );

      await act(async () => {
        await result.current.recordCompletion({
          isCompletion: true,
          timeRemaining: 30,
          timerSeconds: 90,
          score: 450,
          words: 5,
        });
      });

      expect(mockRecordAttempt).toHaveBeenCalledWith(
        1, // world
        1, // level
        5, // words
        450, // score
        30, // timeRemaining
        {}, // objectiveProgress
        true // isCompletion
      );
    });

    it('should handle completion failures gracefully', async () => {
      mockRecordAttempt.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() =>
        useAdaptiveDifficulty({ world: 1, level: 1 })
      );

      // Should not throw
      await expect(
        act(async () => {
          await result.current.recordCompletion({
            isCompletion: false,
            timeRemaining: 0,
            timerSeconds: 90,
            score: 100,
            words: 2,
          });
        })
      ).resolves.not.toThrow();
    });
  });

  describe('config adjustments', () => {
    it('should return adjusted config for normal tier', () => {
      const { result } = renderHook(() =>
        useAdaptiveDifficulty({ world: 1, level: 1 })
      );

      // Normal tier: no modifications
      expect(result.current.adjustedConfig.timerSeconds).toBe(90);
      expect(result.current.adjustedConfig.objectives[0].target).toBe(500);
    });

    it('should return correct powerUpCooldownMultiplier for normal tier', () => {
      const { result } = renderHook(() =>
        useAdaptiveDifficulty({ world: 1, level: 1 })
      );

      expect(result.current.powerUpCooldownMultiplier).toBe(1.0);
    });
  });
});
