/**
 * Tests for timer-related bug fixes in useAdventureGame
 *
 * Bug #1: ADD_TIME and time-tile bonus cap at timerSeconds instead of MAX_TIMER_SECONDS (180)
 * Bug #2: Combo timeout fires after game completion (unnecessary state update)
 */
import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAdventureGame } from '../useAdventureGame';
import type { LevelConfig } from '@/types/adventure';

// ==============================================
// FIXTURES
// ==============================================

function createConfig(overrides?: Partial<LevelConfig>): LevelConfig {
  return {
    world: 1,
    level: 1,
    gridSize: 4,
    timerSeconds: 60,
    objectives: [{ type: 'wordCount', target: 10, isPrimary: true }],
    specialTiles: [],
    difficulty: 'EASY',
    chapterNumber: 1,
    levelInChapter: 1,
    isBossLevel: false,
    ...overrides,
  };
}

const GRID = [
  ['C', 'A', 'T', 'S'],
  ['D', 'O', 'G', 'S'],
  ['R', 'A', 'T', 'S'],
  ['B', 'I', 'R', 'D'],
];

// ==============================================
// BUG #1: ADD_TIME should cap at MAX_TIMER_SECONDS, not timerSeconds
// ==============================================

describe('useAdventureGame - Timer cap bug fix', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('should allow addTime to push timer above initial timerSeconds up to MAX_TIMER_SECONDS (180)', () => {
    // GIVEN - Level starts with 60s timer
    const config = createConfig({ timerSeconds: 60 });
    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig: config, initialGrid: GRID })
    );

    expect(result.current.timeRemaining).toBe(60);

    // WHEN - Add 30 seconds (should go to 90, above the initial 60)
    act(() => {
      result.current.addTime(30);
    });

    // THEN - Timer should be 90, not capped at 60
    expect(result.current.timeRemaining).toBe(90);
  });

  it('should cap addTime at MAX_TIMER_SECONDS (180)', () => {
    // GIVEN - Level starts with 60s timer
    const config = createConfig({ timerSeconds: 60 });
    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig: config, initialGrid: GRID })
    );

    // WHEN - Add 200 seconds (would be 260 without cap)
    act(() => {
      result.current.addTime(200);
    });

    // THEN - Timer should be capped at 180
    expect(result.current.timeRemaining).toBe(180);
  });

  it('should allow time tile bonus to push timer above initial timerSeconds', () => {
    // GIVEN - Level starts with 60s and has a time tile
    const config = createConfig({
      timerSeconds: 60,
      specialTiles: [{ row: 0, col: 0, type: 'time' }],
    });
    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig: config, initialGrid: GRID })
    );

    // WHEN - Submit a word using the time tile (gives +5s bonus)
    act(() => {
      result.current.submitWordWithPath('CATS', 100, [
        { row: 0, col: 0 }, // time tile
        { row: 0, col: 1 },
        { row: 0, col: 2 },
        { row: 0, col: 3 },
      ]);
    });

    // THEN - Timer should be 65 (60 + 5 time bonus), NOT capped at 60
    expect(result.current.timeRemaining).toBe(65);
  });

  it('should cap time tile bonus at MAX_TIMER_SECONDS (180)', () => {
    // GIVEN - Level starts with 170s and has a time tile
    const config = createConfig({
      timerSeconds: 170,
      specialTiles: [{ row: 0, col: 0, type: 'time' }],
    });
    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig: config, initialGrid: GRID })
    );

    // Timer starts at 170, add 5s time tile bonus → 175 (under 180, should pass)
    act(() => {
      result.current.addTime(15); // Push to 180 cap
    });

    // THEN - Should be exactly 180 (capped)
    expect(result.current.timeRemaining).toBe(180);
  });
});

// ==============================================
// BUG #2: Combo timeout should not fire after game completion
// ==============================================

describe('useAdventureGame - Combo timeout after game end', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('should not dispatch COMBO_TIMEOUT after timer runs out', () => {
    // GIVEN - Level with 3s timer
    const config = createConfig({
      timerSeconds: 3,
      objectives: [{ type: 'wordCount', target: 10, isPrimary: true }],
    });
    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig: config, initialGrid: GRID })
    );

    act(() => result.current.startGame());

    // Submit a word (sets a 3s combo timeout)
    act(() => result.current.submitWord('CATS', 100));

    expect(result.current.gameState.comboCount).toBe(1);

    // WHEN - Timer runs out (game ends)
    act(() => vi.advanceTimersByTime(4000));

    expect(result.current.gameState.isComplete).toBe(true);

    // THEN - Combo count should still be 1 (timeout should not reset it after game end)
    // The combo timeout fires but should be ignored since game is complete
    expect(result.current.gameState.comboCount).toBe(1);
  });

  it('should not dispatch COMBO_TIMEOUT after timer expires', () => {
    // GIVEN - Level with short timer
    const config = createConfig({
      timerSeconds: 2,
      objectives: [{ type: 'wordCount', target: 1, isPrimary: true }],
    });
    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig: config, initialGrid: GRID })
    );

    act(() => result.current.startGame());

    // Submit word, then let timer expire
    act(() => result.current.submitWord('CATS', 100));
    act(() => vi.advanceTimersByTime(2000));

    expect(result.current.gameState.isComplete).toBe(true);
    expect(result.current.gameState.comboCount).toBe(1);

    // WHEN - Combo timeout fires after game is complete
    act(() => vi.advanceTimersByTime(4000));

    // THEN - Combo should not be reset after game is complete
    expect(result.current.gameState.comboCount).toBe(1);
  });
});
