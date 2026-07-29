/**
 * useAdventureGame Level Completion Tests
 *
 * Levels should NOT auto-complete when primary objectives are met.
 * Instead, they run until timer expires so players can earn secondary
 * objectives for 2-3 stars.
 *
 * Level ends only when:
 * 1. Timer runs out
 * 2. Boss kills the player (boss levels)
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

describe('useAdventureGame - Level does NOT auto-complete on primary objective', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should keep playing after primary objective is met', () => {
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

    // Submit word that meets primary objective
    act(() => {
      result.current.submitWord('CAT', 50);
    });

    // Game should NOT be complete — timer still running
    expect(result.current.gameState.isComplete).toBe(false);
  });

  it('should allow earning secondary objectives after primary is met', () => {
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

    // Submit short word — meets primary only
    act(() => {
      result.current.submitWord('CAT', 50);
    });

    expect(result.current.gameState.isComplete).toBe(false);

    // Submit long word — meets secondary objectives
    act(() => {
      result.current.submitWord('TESTS', 150);
    });

    // Still playing — level ends on timer only
    expect(result.current.gameState.isComplete).toBe(false);
  });

  it('should complete with correct stars when timer expires', () => {
    const levelConfig = createMockLevelConfig({
      timerSeconds: 5,
      objectives: [
        { type: 'wordCount', target: 1, isPrimary: true },
        { type: 'scoreTarget', target: 500, isPrimary: false },
      ],
    });
    const grid = createMockGrid();
    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig, initialGrid: grid })
    );

    act(() => {
      result.current.startGame();
    });

    // Submit word that meets primary
    act(() => {
      result.current.submitWord('CAT', 50);
    });

    expect(result.current.gameState.isComplete).toBe(false);

    // Run timer to zero
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Now complete with 1 star (primary met, secondary not)
    expect(result.current.gameState.isComplete).toBe(true);
    expect(result.current.gameState.stars).toBe(1);
  });

  it('should get 3 stars when all objectives met at timer expiry', () => {
    const levelConfig = createMockLevelConfig({
      timerSeconds: 5,
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

    act(() => {
      result.current.startGame();
    });

    // Submit long word that meets all objectives
    act(() => {
      result.current.submitWord('TESTS', 150);
    });

    expect(result.current.gameState.isComplete).toBe(false);

    // Timer expires
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.gameState.isComplete).toBe(true);
    expect(result.current.gameState.stars).toBe(3);
  });
});
