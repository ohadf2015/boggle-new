/**
 * useAdventureGame Auto-Complete Tests
 *
 * Bug: When completing a level by meeting primary objectives,
 * stars are not properly calculated/passed through.
 *
 * This test specifically verifies the auto-complete flow:
 * 1. User submits word that meets primary objective
 * 2. Game auto-completes
 * 3. Stars are correctly set in gameState
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAdventureGame } from '../useAdventureGame';
import type { LevelConfig } from '@/types/adventure';

// ==============================================
// TEST FIXTURES
// ==============================================

function createMockLevelConfig(overrides?: Partial<LevelConfig>): LevelConfig {
  return {
    world: 1,
    level: 1,
    gridSize: 4,
    timerSeconds: 120,
    objectives: [
      { type: 'wordCount', target: 1, isPrimary: true },
      { type: 'scoreTarget', target: 200, isPrimary: false },
    ],
    specialTiles: [],
    difficulty: 'EASY',
    chapterNumber: 1,
    levelInChapter: 1,
    isBossLevel: false,
    ...overrides,
  };
}

function createMockGrid(size: number = 4): string[][] {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const grid: string[][] = [];

  for (let i = 0; i < size; i++) {
    const row: string[] = [];
    for (let j = 0; j < size; j++) {
      row.push(letters[(i * size + j) % letters.length]);
    }
    grid.push(row);
  }

  return grid;
}

// ==============================================
// TESTS
// ==============================================

describe('useAdventureGame - Auto-Complete Star Calculation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Bug: Stars should be calculated when game auto-completes on word submission', () => {
    it('should set stars to 1 when primary objective is met but no secondary', () => {
      // GIVEN - Level with wordCount=1 (primary) and scoreTarget=500 (secondary)
      const levelConfig = createMockLevelConfig({
        objectives: [
          { type: 'wordCount', target: 1, isPrimary: true },
          { type: 'scoreTarget', target: 500, isPrimary: false },
        ],
      });
      const grid = createMockGrid();
      const { result } = renderHook(() =>
        useAdventureGame({ levelConfig, initialGrid: grid })
      );

      // WHEN - Submit word that meets primary objective but NOT secondary
      act(() => {
        result.current.submitWord('CAT', 50); // Only 50 points, not 500
      });

      // THEN - Game should be complete with 1 star
      expect(result.current.gameState.isComplete).toBe(true);
      expect(result.current.gameState.stars).toBe(1);
    });

    it('should set stars to 2 when primary + some secondary objectives are met', () => {
      // GIVEN - Level with wordCount=1 (primary), scoreTarget=100 (secondary), longWords=1 (secondary)
      const levelConfig = createMockLevelConfig({
        objectives: [
          { type: 'wordCount', target: 1, isPrimary: true },
          { type: 'scoreTarget', target: 100, isPrimary: false },
          { type: 'longWords', target: 2, isPrimary: false },
        ],
      });
      const grid = createMockGrid();
      const { result } = renderHook(() =>
        useAdventureGame({ levelConfig, initialGrid: grid })
      );

      // WHEN - Submit word that meets primary + scoreTarget but NOT longWords
      act(() => {
        result.current.submitWord('CAT', 150); // Meets wordCount and scoreTarget
      });

      // THEN - Game should be complete with 2 stars
      expect(result.current.gameState.isComplete).toBe(true);
      expect(result.current.gameState.stars).toBe(2);
    });

    it('should set stars to 3 when all objectives are met', () => {
      // GIVEN - Level with 3+ achievable objectives (need 3 completed for 3 stars)
      const levelConfig = createMockLevelConfig({
        objectives: [
          { type: 'wordCount', target: 1, isPrimary: true },
          { type: 'scoreTarget', target: 100, isPrimary: false },
          { type: 'longWords', target: 1, isPrimary: false },
        ],
      });
      const grid = createMockGrid();
      const { result } = renderHook(() =>
        useAdventureGame({ levelConfig, initialGrid: grid })
      );

      // WHEN - Submit long word that meets ALL objectives (5+ letters for longWords)
      act(() => {
        result.current.submitWord('TESTS', 150); // Meets wordCount, scoreTarget, and longWords
      });

      // THEN - Game should be complete with 3 stars
      expect(result.current.gameState.isComplete).toBe(true);
      expect(result.current.gameState.stars).toBe(3);
    });

    it('should properly calculate stars with time bonus objective', () => {
      // GIVEN - Level with time bonus objective
      const levelConfig = createMockLevelConfig({
        timerSeconds: 120,
        objectives: [
          { type: 'wordCount', target: 1, isPrimary: true },
          { type: 'scoreTarget', target: 30, isPrimary: false }, // Met with score 50
          { type: 'timeBonus', target: 60, isPrimary: false }, // Need 60+ seconds remaining
        ],
      });
      const grid = createMockGrid();
      const { result } = renderHook(() =>
        useAdventureGame({ levelConfig, initialGrid: grid })
      );

      // Start the game
      act(() => {
        result.current.startGame();
      });

      // Let 30 seconds pass (still have 90 seconds left)
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      // WHEN - Submit word with 90 seconds remaining (> 60 target)
      act(() => {
        result.current.submitWord('CAT', 50);
      });

      // THEN - Game should have 3 stars (primary + timeBonus met)
      expect(result.current.gameState.isComplete).toBe(true);
      expect(result.current.timeRemaining).toBe(90);
      expect(result.current.gameState.stars).toBe(3);
    });

    it('should set stars to 1 when time bonus is NOT met', () => {
      // GIVEN - Level with time bonus objective
      const levelConfig = createMockLevelConfig({
        timerSeconds: 120,
        objectives: [
          { type: 'wordCount', target: 1, isPrimary: true },
          { type: 'timeBonus', target: 100, isPrimary: false }, // Need 100+ seconds remaining
        ],
      });
      const grid = createMockGrid();
      const { result } = renderHook(() =>
        useAdventureGame({ levelConfig, initialGrid: grid })
      );

      // Start the game
      act(() => {
        result.current.startGame();
      });

      // Let 50 seconds pass (only 70 seconds left, below 100 target)
      act(() => {
        vi.advanceTimersByTime(50000);
      });

      // WHEN - Submit word with 70 seconds remaining (< 100 target)
      act(() => {
        result.current.submitWord('CAT', 50);
      });

      // THEN - Game should have 1 star (only primary met)
      expect(result.current.gameState.isComplete).toBe(true);
      expect(result.current.timeRemaining).toBe(70);
      expect(result.current.gameState.stars).toBe(1);
    });
  });

  describe('Stars should be immediately available after auto-complete', () => {
    it('gameState.stars should be > 0 immediately after word submission triggers completion', () => {
      // GIVEN - Level with primary + secondary objectives
      // (with only primary, meeting it = ALL met = 3 stars, which is correct behavior)
      const levelConfig = createMockLevelConfig({
        objectives: [
          { type: 'wordCount', target: 1, isPrimary: true },
          { type: 'scoreTarget', target: 500, isPrimary: false }, // Won't be met
        ],
      });
      const grid = createMockGrid();
      const { result } = renderHook(() =>
        useAdventureGame({ levelConfig, initialGrid: grid })
      );

      // WHEN - Submit word that completes primary objective but NOT secondary
      act(() => {
        result.current.submitWord('CAT', 50); // Only 50 points, not 500
      });

      // THEN - Stars should be immediately set (not 0) - should be 1 star
      expect(result.current.gameState.stars).toBeGreaterThan(0);
      expect(result.current.gameState.stars).toBe(1);
    });
  });
});
