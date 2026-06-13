/**
 * useAdventureGame Level Completion Tests
 *
 * Contract (updated 2026-06-13): a level ends the moment there is nothing
 * left to do — i.e. when EVERY objective (primary AND secondary) is complete.
 * Players no longer wait out the timer once all quests are done.
 *
 * While objectives remain (primary met but a secondary still open), the level
 * keeps running so players can chase the remaining stars.
 *
 * Level ends when:
 * 1. All objectives complete (auto-end — no timer wait)
 * 2. Timer runs out (awards whatever stars were earned)
 * 3. Boss kills the player (boss levels)
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

describe('useAdventureGame - Level auto-ends when all quests are done', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps playing when only the primary is met and a secondary is still open', () => {
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

    act(() => {
      result.current.startGame();
    });

    // Meets primary (wordCount) but not the 500-point secondary
    act(() => {
      result.current.submitWord('CAT', 50);
    });

    // Still playing — a star is still on the table
    expect(result.current.gameState.isComplete).toBe(false);
  });

  it('auto-ends immediately when ALL objectives are complete (no timer wait)', () => {
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

    act(() => {
      result.current.startGame();
    });

    // A single long word clears all three objectives at once
    act(() => {
      result.current.submitWord('TESTS', 150);
    });

    // Nothing left to do → level ends now, with full stars
    expect(result.current.gameState.isComplete).toBe(true);
    expect(result.current.gameState.stars).toBe(3);
    expect(result.current.isPlaying).toBe(false);
  });

  it('auto-ends a single-objective level the instant it is met', () => {
    const levelConfig = createMockLevelConfig({
      objectives: [{ type: 'wordCount', target: 1, isPrimary: true }],
    });
    const grid = createMockGrid();
    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig, initialGrid: grid })
    );

    act(() => {
      result.current.startGame();
    });

    act(() => {
      result.current.submitWord('CAT', 50);
    });

    expect(result.current.gameState.isComplete).toBe(true);
    expect(result.current.gameState.stars).toBe(1);
  });

  it('completes with the earned stars when the timer expires before all quests are done', () => {
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

    // Primary met, secondary (500) still open → keeps running
    act(() => {
      result.current.submitWord('CAT', 50);
    });

    expect(result.current.gameState.isComplete).toBe(false);

    // Timer drains to zero
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Completes with 1 star (primary met, secondary not)
    expect(result.current.gameState.isComplete).toBe(true);
    expect(result.current.gameState.stars).toBe(1);
  });
});
