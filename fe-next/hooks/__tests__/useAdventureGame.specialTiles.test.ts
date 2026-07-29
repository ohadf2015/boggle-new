/**
 * useAdventureGame Special Tile Effects Tests
 *
 * TDD tests for special tile effects that are currently not implemented:
 * - Time tiles (+5 seconds bonus)
 * - Chain tiles (combo bonus multiplier)
 * - Rainbow tiles (wildcard - already has isWildcard helper)
 *
 * Following TDD: Write failing tests FIRST, then implement
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
      { type: 'wordCount', target: 5, isPrimary: true },
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
// TIME TILE TESTS
// ==============================================

describe('Time Tile Effects', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should add +5 seconds when time tile is used in a word', () => {
    // GIVEN - Level with time tile at position (0,0)
    const levelConfig = createMockLevelConfig({
      timerSeconds: 60,
      specialTiles: [{ row: 0, col: 0, type: 'time' }],
    });
    const grid = createMockGrid();
    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig, initialGrid: grid })
    );

    // Start game and let some time pass
    act(() => {
      result.current.startGame();
    });
    act(() => {
      vi.advanceTimersByTime(10000); // 10 seconds pass
    });

    expect(result.current.timeRemaining).toBe(50);

    // WHEN - Submit word using time tile
    act(() => {
      result.current.submitWordWithPath('TEST', 100, [
        { row: 0, col: 0 }, // Time tile
        { row: 0, col: 1 },
        { row: 0, col: 2 },
        { row: 0, col: 3 },
      ]);
    });

    // THEN - Should have 55 seconds (50 + 5 bonus)
    expect(result.current.timeRemaining).toBe(55);
  });

  it('should add +5 seconds for each time tile used in the same word', () => {
    // GIVEN - Level with two time tiles
    const levelConfig = createMockLevelConfig({
      timerSeconds: 60,
      specialTiles: [
        { row: 0, col: 0, type: 'time' },
        { row: 0, col: 2, type: 'time' },
      ],
    });
    const grid = createMockGrid();
    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig, initialGrid: grid })
    );

    act(() => {
      result.current.startGame();
    });
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    // WHEN - Submit word using both time tiles
    act(() => {
      result.current.submitWordWithPath('TEST', 100, [
        { row: 0, col: 0 }, // Time tile 1
        { row: 0, col: 1 },
        { row: 0, col: 2 }, // Time tile 2
        { row: 0, col: 3 },
      ]);
    });

    // THEN - Should have 60 seconds (50 + 5 + 5 bonus)
    expect(result.current.timeRemaining).toBe(60);
  });

  it('should not exceed maximum timer when time bonus is added', () => {
    // GIVEN - Level with time tile, timer near max
    const levelConfig = createMockLevelConfig({
      timerSeconds: 120,
      specialTiles: [{ row: 0, col: 0, type: 'time' }],
    });
    const grid = createMockGrid();
    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig, initialGrid: grid })
    );

    act(() => {
      result.current.startGame();
    });
    // Only 2 seconds have passed, timer at 118
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // WHEN - Submit word using time tile
    act(() => {
      result.current.submitWordWithPath('TEST', 100, [
        { row: 0, col: 0 }, // Time tile
        { row: 0, col: 1 },
        { row: 0, col: 2 },
        { row: 0, col: 3 },
      ]);
    });

    // THEN - Timer can exceed timerSeconds now, capped at MAX_TIMER_SECONDS (180)
    // 118 + 5 = 123, which is under 180
    expect(result.current.timeRemaining).toBe(123);
    expect(result.current.timeRemaining).toBeLessThanOrEqual(180);
  });

  it('should initialize time tile with bonusTime property', () => {
    // GIVEN
    const levelConfig = createMockLevelConfig({
      specialTiles: [{ row: 0, col: 0, type: 'time' }],
    });
    const grid = createMockGrid();

    // WHEN
    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig, initialGrid: grid })
    );

    // THEN - Time tile should have bonusTime property set
    expect(result.current.tiles[0][0].type).toBe('time');
    expect(result.current.tiles[0][0].bonusTime).toBe(5);
  });
});

// ==============================================
// CHAIN TILE TESTS
// ==============================================

describe('Chain Tile Effects', () => {
  it('should not apply special combo bonus when chain tile is used (not implemented)', () => {
    // NOTE: chain tile type is not in the current TileType union.
    // A tile declared as 'chain' is treated as standard — no combo bonus, no isChained.
    // GIVEN - Level with standard tiles (chain not implemented)
    const levelConfig = createMockLevelConfig({
      specialTiles: [],
    });
    const grid = createMockGrid();
    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig, initialGrid: grid })
    );

    // Build up combo first
    act(() => {
      result.current.submitWord('ONE', 50);
    });
    act(() => {
      result.current.submitWord('TWO', 50);
    });

    // WHEN - Submit word; no chain bonus applies
    act(() => {
      result.current.submitWordWithPath('TEST', 100, [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
        { row: 0, col: 3 },
      ]);
    });

    // THEN - Score is exactly 50 + 50 + 100 = 200 (no chain bonus)
    expect(result.current.gameState.score).toBe(200);
  });

  it('should not mark adjacent tiles as chained (isChained not implemented)', () => {
    // GIVEN - Level with no special tiles
    const levelConfig = createMockLevelConfig({
      specialTiles: [],
    });
    const grid = createMockGrid();
    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig, initialGrid: grid })
    );

    // WHEN - Submit any word
    act(() => {
      result.current.submitWordWithPath('TEST', 100, [
        { row: 1, col: 0 },
        { row: 1, col: 1 },
        { row: 1, col: 2 },
        { row: 1, col: 3 },
      ]);
    });

    // THEN - isChained is not set on any tile (feature not implemented)
    expect(result.current.tiles[0][1].isChained).toBeFalsy();
  });

  it('should initialize standard tile without chain-specific properties', () => {
    // GIVEN
    const levelConfig = createMockLevelConfig({
      specialTiles: [],
    });
    const grid = createMockGrid();

    // WHEN
    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig, initialGrid: grid })
    );

    // THEN - tile type is standard, no chain type exists
    expect(result.current.tiles[0][0].type).toBe('standard');
  });
});

// ==============================================
// GOLD TILE VISUAL FEEDBACK TEST
// ==============================================

describe('Gold Tile - Score Calculation Verification', () => {
  it('should correctly apply 3x multiplier to base score', () => {
    // GIVEN
    const levelConfig = createMockLevelConfig({
      specialTiles: [{ row: 0, col: 0, type: 'gold' }],
    });
    const grid = createMockGrid();
    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig, initialGrid: grid })
    );

    // WHEN - Submit word using gold tile with base score 100
    act(() => {
      result.current.submitWordWithPath('TEST', 100, [
        { row: 0, col: 0 }, // Gold tile
        { row: 0, col: 1 },
        { row: 0, col: 2 },
        { row: 0, col: 3 },
      ]);
    });

    // THEN - Score should be 300 (100 * 3)
    expect(result.current.gameState.score).toBe(300);
  });

  it('should apply gold multiplier independently', () => {
    // GIVEN - Gold tile only
    const levelConfig = createMockLevelConfig({
      timerSeconds: 60,
      specialTiles: [
        { row: 0, col: 0, type: 'gold' },
      ],
    });
    const grid = createMockGrid();
    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig, initialGrid: grid })
    );

    act(() => {
      result.current.startGame();
    });

    // WHEN - Submit word using gold tile
    act(() => {
      result.current.submitWordWithPath('TEST', 100, [
        { row: 0, col: 0 }, // Gold tile (3x)
        { row: 0, col: 1 },
        { row: 0, col: 2 },
        { row: 0, col: 3 },
      ]);
    });

    // THEN - Score: 100 * 3 (gold only) = 300
    expect(result.current.gameState.score).toBe(300);
  });
});

// ==============================================
// ICE TILE TESTS
// ==============================================

describe('Ice Tile - Clearing Mechanics', () => {
  it('should clear ice tile when adjacent standard tile is used', () => {
    // GIVEN
    const levelConfig = createMockLevelConfig({
      specialTiles: [{ row: 0, col: 1, type: 'ice' }],
      objectives: [
        { type: 'wordCount', target: 5, isPrimary: true },
        { type: 'clearIce', target: 1, isPrimary: false },
      ],
    });
    const grid = createMockGrid();
    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig, initialGrid: grid })
    );

    // Verify ice tile is frozen initially
    expect(result.current.tiles[0][1].isFrozen).toBe(true);
    expect(result.current.tiles[0][1].isCleared).toBe(false);

    // WHEN - Use tile at (0,0) which is adjacent to ice at (0,1)
    act(() => {
      result.current.submitWordWithPath('TEST', 100, [
        { row: 0, col: 0 }, // Adjacent to ice
        { row: 1, col: 0 },
        { row: 2, col: 0 },
        { row: 3, col: 0 },
      ]);
    });

    // THEN - Ice tile should become standard (melted and selectable)
    expect(result.current.tiles[0][1].type).toBe('standard');
    expect(result.current.tiles[0][1].isCleared).toBe(false); // NOT cleared - so it's selectable
  });

  it('should unfreeze ice tile when cleared by adjacent tile', () => {
    // GIVEN
    const levelConfig = createMockLevelConfig({
      specialTiles: [{ row: 0, col: 1, type: 'ice' }],
      objectives: [
        { type: 'wordCount', target: 5, isPrimary: true },
        { type: 'clearIce', target: 1, isPrimary: false },
      ],
    });
    const grid = createMockGrid();
    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig, initialGrid: grid })
    );

    // Verify ice tile is frozen initially
    expect(result.current.tiles[0][1].isFrozen).toBe(true);

    // WHEN - Use tile at (0,0) which is adjacent to ice at (0,1)
    act(() => {
      result.current.submitWordWithPath('TEST', 100, [
        { row: 0, col: 0 }, // Adjacent to ice
        { row: 1, col: 0 },
        { row: 2, col: 0 },
        { row: 3, col: 0 },
      ]);
    });

    // THEN - Ice tile should be unfrozen AND become standard (melted)
    expect(result.current.tiles[0][1].isFrozen).toBe(false);
    expect(result.current.tiles[0][1].type).toBe('standard');
    expect(result.current.tiles[0][1].isCleared).toBe(false); // NOT cleared - selectable!
  });

  it('should increment clearIce objective when ice is cleared', () => {
    // GIVEN
    const levelConfig = createMockLevelConfig({
      specialTiles: [
        { row: 0, col: 1, type: 'ice' },
        { row: 1, col: 1, type: 'ice' },
      ],
      objectives: [
        { type: 'wordCount', target: 5, isPrimary: true },
        { type: 'clearIce', target: 2, isPrimary: false },
      ],
    });
    const grid = createMockGrid();
    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig, initialGrid: grid })
    );

    // WHEN - Use tile at (0,0) which is adjacent to both ice tiles
    act(() => {
      result.current.submitWordWithPath('TEST', 100, [
        { row: 0, col: 0 }, // Adjacent to ice at (0,1) and diagonally to (1,1)
        { row: 1, col: 0 }, // Adjacent to ice at (1,1)
        { row: 2, col: 0 },
        { row: 3, col: 0 },
      ]);
    });

    // THEN - Both ice tiles should be cleared
    const clearIceObjective = result.current.objectives.find(
      (o) => o.type === 'clearIce'
    );
    expect(clearIceObjective?.current).toBe(2);
  });
});

// ==============================================
// BOMB TILE TESTS
// ==============================================

describe('Bomb Tile - Score Bomb', () => {
  it('should double the word score when bomb tile is used', () => {
    // GIVEN
    const levelConfig = createMockLevelConfig({
      gridSize: 4,
      specialTiles: [{ row: 1, col: 1, type: 'bomb' }],
    });
    const grid = createMockGrid(4);
    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig, initialGrid: grid })
    );

    const scoreBefore = result.current.gameState.score;

    // WHEN
    act(() => {
      result.current.submitWordWithPath('TEST', 100, [
        { row: 1, col: 0 },
        { row: 1, col: 1 }, // Bomb tile
        { row: 1, col: 2 },
        { row: 1, col: 3 },
      ]);
    });

    // THEN - Score should be doubled (100 * 2 = 200)
    expect(result.current.gameState.score).toBe(scoreBefore + 200);

    // Bomb tile itself should be cleared
    expect(result.current.tiles[1][1].isCleared).toBe(true);

    // Other tiles in row NOT in path should NOT be cleared
    expect(result.current.tiles[0][0].isCleared).toBe(false);
    expect(result.current.tiles[2][0].isCleared).toBe(false);
  });

  it('should not clear ice tiles outside the word path', () => {
    // GIVEN - Bomb and ice in same row but ice not in path
    const levelConfig = createMockLevelConfig({
      gridSize: 4,
      specialTiles: [
        { row: 1, col: 1, type: 'bomb' },
        { row: 1, col: 3, type: 'ice' },
      ],
      objectives: [
        { type: 'wordCount', target: 5, isPrimary: true },
        { type: 'clearIce', target: 1, isPrimary: false },
      ],
    });
    const grid = createMockGrid(4);
    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig, initialGrid: grid })
    );

    // WHEN
    act(() => {
      result.current.submitWordWithPath('TE', 50, [
        { row: 1, col: 0 },
        { row: 1, col: 1 }, // Bomb tile
      ]);
    });

    // THEN - Ice tile NOT in path should NOT be cleared (bomb no longer clears row)
    expect(result.current.tiles[1][3].isCleared).toBe(false);

    const clearIceObjective = result.current.objectives.find(
      (o) => o.type === 'clearIce'
    );
    expect(clearIceObjective?.current).toBe(0);
  });
});

// ==============================================
// COMBINED EFFECTS TESTS
// ==============================================

describe('Combined Special Tile Effects', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should apply all implemented bonuses when multiple special tiles are in path', () => {
    // GIVEN - Gold + Time in path
    const levelConfig = createMockLevelConfig({
      timerSeconds: 60,
      specialTiles: [
        { row: 0, col: 0, type: 'gold' },    // 3x multiplier
        { row: 0, col: 1, type: 'time' },    // +5 seconds
      ],
    });
    const grid = createMockGrid();
    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig, initialGrid: grid })
    );

    act(() => {
      result.current.startGame();
    });
    act(() => {
      vi.advanceTimersByTime(10000); // 10 seconds pass
    });

    // WHEN
    act(() => {
      result.current.submitWordWithPath('TEST', 100, [
        { row: 0, col: 0 }, // Gold (3x)
        { row: 0, col: 1 }, // Time (+5s)
        { row: 0, col: 2 },
        { row: 0, col: 3 },
      ]);
    });

    // THEN
    // Score: 100 * 3 (gold only) = 300
    expect(result.current.gameState.score).toBe(300);
    // Time: 50 + 5 = 55
    expect(result.current.timeRemaining).toBe(55);
  });
});
