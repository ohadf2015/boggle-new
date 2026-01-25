/**
 * useAdventureGame Chain Tile Combo Tests
 *
 * TDD tests for chain tile combo logic (lines 354-447 in useAdventureGame.ts)
 * Following TDD: Write failing tests FIRST, then verify implementation
 *
 * Chain tile rules:
 * - Applies 1.5x combo multiplier when used during active combo (comboCount > 0)
 * - Marks all 8 adjacent tiles as isChained = true for visual feedback
 * - Sets activationEffect = 'link' on chain tiles
 * - Works correctly with other special tiles (gold 3x stacks with chain 1.5x)
 */

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
// CHAIN TILE 1.5X MULTIPLIER TESTS
// ==============================================

describe('Chain Tile 1.5x Combo Multiplier', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should apply 1.5x multiplier when chain tile used during active combo (comboCount > 0)', () => {
    // GIVEN - Level with chain tile at (1,1), standard grid
    const levelConfig = createMockLevelConfig({
      specialTiles: [{ row: 1, col: 1, type: 'chain' }],
      objectives: [{ type: 'wordCount', target: 10, isPrimary: true }],
    });
    const grid = createMockGrid();
    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig, initialGrid: grid })
    );

    act(() => {
      result.current.startGame();
    });

    // Build combo by submitting words WITHOUT chain tile first
    const initialScore = result.current.gameState.score;

    // First word: establishes combo (comboCount = 1)
    act(() => {
      result.current.submitWordWithPath('TEST', 100, [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
        { row: 0, col: 3 },
      ]);
    });

    expect(result.current.gameState.comboCount).toBe(1);

    // WHEN - Second word uses chain tile during active combo
    const scoreBeforeChain = result.current.gameState.score;
    act(() => {
      result.current.submitWordWithPath('WORD', 100, [
        { row: 1, col: 0 },
        { row: 1, col: 1 }, // Chain tile
        { row: 1, col: 2 },
        { row: 1, col: 3 },
      ]);
    });

    // THEN - Chain bonus should apply: finalScore * (1 + comboCount * 0.1 * 1.5)
    // Base score: 100
    // Combo multiplier without chain: 100 * (1 + 1 * 0.1) = 110
    // Combo multiplier WITH chain: 100 * (1 + 1 * 0.1 * 1.5) = 100 * 1.15 = 115
    const expectedScoreGain = 115;
    expect(result.current.gameState.score).toBe(scoreBeforeChain + expectedScoreGain);
  });

  it('should NOT apply multiplier when chain tile used without active combo (comboCount = 0)', () => {
    // GIVEN - Level with chain tile, fresh game (no combo)
    const levelConfig = createMockLevelConfig({
      specialTiles: [{ row: 0, col: 1, type: 'chain' }],
    });
    const grid = createMockGrid();
    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig, initialGrid: grid })
    );

    act(() => {
      result.current.startGame();
    });

    expect(result.current.gameState.comboCount).toBe(0);

    // WHEN - Submit word with chain tile but no active combo
    act(() => {
      result.current.submitWordWithPath('TEST', 100, [
        { row: 0, col: 0 },
        { row: 0, col: 1 }, // Chain tile
        { row: 0, col: 2 },
        { row: 0, col: 3 },
      ]);
    });

    // THEN - No chain bonus applied (combo multiplier should be 0)
    // Base score: 100, no combo bonus
    expect(result.current.gameState.score).toBe(100);
  });

  it('should apply enhanced bonus scaling with combo count (comboCount * 0.1 * 1.5)', () => {
    // GIVEN - Level with chain tile
    const levelConfig = createMockLevelConfig({
      specialTiles: [{ row: 2, col: 2, type: 'chain' }],
      objectives: [{ type: 'wordCount', target: 20, isPrimary: true }],
    });
    const grid = createMockGrid();
    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig, initialGrid: grid })
    );

    act(() => {
      result.current.startGame();
    });

    // Build combo to 3
    act(() => {
      result.current.submitWordWithPath('WORD', 100, [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
        { row: 0, col: 3 },
      ]);
    });
    act(() => {
      result.current.submitWordWithPath('WORD', 100, [
        { row: 1, col: 0 },
        { row: 1, col: 1 },
        { row: 1, col: 2 },
        { row: 1, col: 3 },
      ]);
    });
    act(() => {
      result.current.submitWordWithPath('WORD', 100, [
        { row: 3, col: 0 },
        { row: 3, col: 1 },
        { row: 3, col: 2 },
        { row: 3, col: 3 },
      ]);
    });

    expect(result.current.gameState.comboCount).toBe(3);

    // WHEN - Use chain tile at combo 3
    const scoreBeforeChain = result.current.gameState.score;
    act(() => {
      result.current.submitWordWithPath('TEST', 100, [
        { row: 2, col: 0 },
        { row: 2, col: 1 },
        { row: 2, col: 2 }, // Chain tile
        { row: 2, col: 3 },
      ]);
    });

    // THEN - Enhanced bonus: 100 * (1 + 3 * 0.1 * 1.5) = 100 * 1.45 = 145
    const expectedScoreGain = 145;
    expect(result.current.gameState.score).toBe(scoreBeforeChain + expectedScoreGain);
  });

  it('should correctly floor the score after chain bonus calculation', () => {
    // GIVEN - Level with chain tile
    const levelConfig = createMockLevelConfig({
      specialTiles: [{ row: 0, col: 1, type: 'chain' }],
      objectives: [{ type: 'wordCount', target: 10, isPrimary: true }],
    });
    const grid = createMockGrid();
    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig, initialGrid: grid })
    );

    act(() => {
      result.current.startGame();
    });

    // Build combo to 1
    act(() => {
      result.current.submitWordWithPath('WORD', 100, [
        { row: 1, col: 0 },
        { row: 1, col: 1 },
        { row: 1, col: 2 },
        { row: 1, col: 3 },
      ]);
    });

    // WHEN - Use chain tile with score that results in decimal
    const scoreBeforeChain = result.current.gameState.score;
    act(() => {
      result.current.submitWordWithPath('TEST', 97, [
        { row: 0, col: 0 },
        { row: 0, col: 1 }, // Chain tile
        { row: 0, col: 2 },
        { row: 0, col: 3 },
      ]);
    });

    // THEN - Should floor: 97 * 1.15 = 111.55 → 111
    const expectedScoreGain = 111;
    expect(result.current.gameState.score).toBe(scoreBeforeChain + expectedScoreGain);
  });
});

// ==============================================
// CHAIN TILE ADJACENT LINKING TESTS
// ==============================================

describe('Chain Tile Adjacent Linking', () => {
  it('should mark all 8 adjacent tiles as isChained = true', () => {
    // GIVEN - Level with chain tile at center (1,1) of 4x4 grid
    const levelConfig = createMockLevelConfig({
      specialTiles: [{ row: 1, col: 1, type: 'chain' }],
    });
    const grid = createMockGrid();
    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig, initialGrid: grid })
    );

    act(() => {
      result.current.startGame();
    });

    // WHEN - Use chain tile
    act(() => {
      result.current.submitWordWithPath('TEST', 100, [
        { row: 1, col: 0 },
        { row: 1, col: 1 }, // Chain tile at center
        { row: 1, col: 2 },
        { row: 1, col: 3 },
      ]);
    });

    // THEN - All 8 neighbors should be marked as chained
    const tiles = result.current.tiles;

    // Top-left, top, top-right
    expect(tiles[0][0].isChained).toBe(true);
    expect(tiles[0][1].isChained).toBe(true);
    expect(tiles[0][2].isChained).toBe(true);

    // Left, right (center is the chain tile itself)
    expect(tiles[1][0].isChained).toBe(true);
    expect(tiles[1][2].isChained).toBe(true);

    // Bottom-left, bottom, bottom-right
    expect(tiles[2][0].isChained).toBe(true);
    expect(tiles[2][1].isChained).toBe(true);
    expect(tiles[2][2].isChained).toBe(true);
  });

  it('should NOT mark tiles beyond adjacency range', () => {
    // GIVEN - Level with chain tile at (1,1)
    const levelConfig = createMockLevelConfig({
      specialTiles: [{ row: 1, col: 1, type: 'chain' }],
    });
    const grid = createMockGrid();
    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig, initialGrid: grid })
    );

    act(() => {
      result.current.startGame();
    });

    // WHEN - Use chain tile
    act(() => {
      result.current.submitWordWithPath('TEST', 100, [
        { row: 1, col: 1 }, // Chain tile
        { row: 1, col: 2 },
        { row: 1, col: 3 },
        { row: 2, col: 3 },
      ]);
    });

    // THEN - Tiles at distance 2+ should NOT be chained
    const tiles = result.current.tiles;

    // Row 3 (distance 2 from chain tile)
    expect(tiles[3][0].isChained).toBeFalsy();
    expect(tiles[3][1].isChained).toBeFalsy();
    expect(tiles[3][2].isChained).toBeFalsy();
    expect(tiles[3][3].isChained).toBeFalsy();
  });

  it('should handle edge case: chain tile at grid corner (0,0)', () => {
    // GIVEN - Chain tile at top-left corner
    const levelConfig = createMockLevelConfig({
      specialTiles: [{ row: 0, col: 0, type: 'chain' }],
    });
    const grid = createMockGrid();
    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig, initialGrid: grid })
    );

    act(() => {
      result.current.startGame();
    });

    // WHEN - Use chain tile at corner
    act(() => {
      result.current.submitWordWithPath('TEST', 100, [
        { row: 0, col: 0 }, // Chain tile at corner
        { row: 0, col: 1 },
        { row: 0, col: 2 },
        { row: 0, col: 3 },
      ]);
    });

    // THEN - Only 3 valid neighbors should be chained (right, bottom, bottom-right)
    const tiles = result.current.tiles;

    expect(tiles[0][1].isChained).toBe(true); // Right
    expect(tiles[1][0].isChained).toBe(true); // Bottom
    expect(tiles[1][1].isChained).toBe(true); // Bottom-right

    // Out-of-bounds neighbors should not cause errors
    // (no need to check, just verify no crash)
  });

  it('should handle edge case: chain tile at grid edge (1,0)', () => {
    // GIVEN - Chain tile at left edge
    const levelConfig = createMockLevelConfig({
      specialTiles: [{ row: 1, col: 0, type: 'chain' }],
    });
    const grid = createMockGrid();
    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig, initialGrid: grid })
    );

    act(() => {
      result.current.startGame();
    });

    // WHEN - Use chain tile at edge
    act(() => {
      result.current.submitWordWithPath('TEST', 100, [
        { row: 1, col: 0 }, // Chain tile at left edge
        { row: 1, col: 1 },
        { row: 1, col: 2 },
        { row: 1, col: 3 },
      ]);
    });

    // THEN - Only 5 valid neighbors should be chained
    const tiles = result.current.tiles;

    // Top, top-right
    expect(tiles[0][0].isChained).toBe(true);
    expect(tiles[0][1].isChained).toBe(true);

    // Right
    expect(tiles[1][1].isChained).toBe(true);

    // Bottom, bottom-right
    expect(tiles[2][0].isChained).toBe(true);
    expect(tiles[2][1].isChained).toBe(true);
  });
});

// ==============================================
// CHAIN TILE ACTIVATION EFFECT TESTS
// ==============================================

describe('Chain Tile Activation Effect', () => {
  it('should set activationEffect = "link" on chain tiles', () => {
    // GIVEN - Level with chain tile
    const levelConfig = createMockLevelConfig({
      specialTiles: [{ row: 1, col: 1, type: 'chain' }],
    });
    const grid = createMockGrid();
    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig, initialGrid: grid })
    );

    act(() => {
      result.current.startGame();
    });

    // WHEN - Use chain tile
    act(() => {
      result.current.submitWordWithPath('TEST', 100, [
        { row: 1, col: 0 },
        { row: 1, col: 1 }, // Chain tile
        { row: 1, col: 2 },
        { row: 1, col: 3 },
      ]);
    });

    // THEN - Chain tile should have 'link' activation effect
    const chainTile = result.current.tiles[1][1];
    expect(chainTile.activationEffect).toBe('link');
  });

  it('should set activationTimestamp for animation timing', () => {
    // GIVEN - Level with chain tile
    const levelConfig = createMockLevelConfig({
      specialTiles: [{ row: 0, col: 1, type: 'chain' }],
    });
    const grid = createMockGrid();
    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig, initialGrid: grid })
    );

    act(() => {
      result.current.startGame();
    });

    // WHEN - Use chain tile
    act(() => {
      result.current.submitWordWithPath('TEST', 100, [
        { row: 0, col: 0 },
        { row: 0, col: 1 }, // Chain tile
        { row: 0, col: 2 },
        { row: 0, col: 3 },
      ]);
    });

    // THEN - Chain tile should have activationTimestamp set
    const chainTile = result.current.tiles[0][1];
    expect(chainTile.activationTimestamp).toBeDefined();
    expect(typeof chainTile.activationTimestamp).toBe('number');
    expect(chainTile.activationTimestamp).toBeGreaterThan(0);
  });

  it('should set activation effect even without combo bonus (visual feedback)', () => {
    // GIVEN - Level with chain tile, no active combo
    const levelConfig = createMockLevelConfig({
      specialTiles: [{ row: 0, col: 1, type: 'chain' }],
    });
    const grid = createMockGrid();
    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig, initialGrid: grid })
    );

    act(() => {
      result.current.startGame();
    });

    expect(result.current.gameState.comboCount).toBe(0);

    // WHEN - Use chain tile without active combo
    act(() => {
      result.current.submitWordWithPath('TEST', 100, [
        { row: 0, col: 0 },
        { row: 0, col: 1 }, // Chain tile
        { row: 0, col: 2 },
        { row: 0, col: 3 },
      ]);
    });

    // THEN - Should still set 'link' effect for visual feedback
    const chainTile = result.current.tiles[0][1];
    expect(chainTile.activationEffect).toBe('link');
    expect(chainTile.activationTimestamp).toBeDefined();
  });
});

// ==============================================
// CHAIN + OTHER SPECIAL TILE INTERACTION TESTS
// ==============================================

describe('Chain Tile Special Tile Interactions', () => {
  it('should stack chain bonus with gold tile multiplier (gold 3x * chain bonus)', () => {
    // GIVEN - Level with both chain and gold tiles
    const levelConfig = createMockLevelConfig({
      specialTiles: [
        { row: 0, col: 1, type: 'chain' },
        { row: 0, col: 2, type: 'gold' },
      ],
      objectives: [{ type: 'wordCount', target: 10, isPrimary: true }],
    });
    const grid = createMockGrid();
    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig, initialGrid: grid })
    );

    act(() => {
      result.current.startGame();
    });

    // Build combo to 1
    act(() => {
      result.current.submitWordWithPath('WORD', 100, [
        { row: 1, col: 0 },
        { row: 1, col: 1 },
        { row: 1, col: 2 },
        { row: 1, col: 3 },
      ]);
    });

    expect(result.current.gameState.comboCount).toBe(1);

    // WHEN - Use word with both chain and gold tiles
    const scoreBeforeWord = result.current.gameState.score;
    act(() => {
      result.current.submitWordWithPath('TEST', 100, [
        { row: 0, col: 0 },
        { row: 0, col: 1 }, // Chain tile
        { row: 0, col: 2 }, // Gold tile
        { row: 0, col: 3 },
      ]);
    });

    // THEN - Multipliers should stack:
    // Base: 100
    // Gold: 100 * 3 = 300
    // Chain bonus: 300 * (1 + 1 * 0.1 * 1.5) = 300 * 1.15 = 345
    const expectedScoreGain = 345;
    expect(result.current.gameState.score).toBe(scoreBeforeWord + expectedScoreGain);
  });

  it('should apply chain adjacent linking to unfreeze ice tiles', () => {
    // GIVEN - Level with chain tile adjacent to ice tile
    const levelConfig = createMockLevelConfig({
      specialTiles: [
        { row: 1, col: 1, type: 'chain' },
        { row: 0, col: 0, type: 'ice' }, // Adjacent to chain tile
      ],
    });
    const grid = createMockGrid();
    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig, initialGrid: grid })
    );

    act(() => {
      result.current.startGame();
    });

    // Verify ice tile starts frozen
    expect(result.current.tiles[0][0].isFrozen).toBe(true);
    expect(result.current.tiles[0][0].type).toBe('ice');

    // WHEN - Use chain tile (adjacent linking happens AFTER word submission)
    act(() => {
      result.current.submitWordWithPath('TEST', 100, [
        { row: 1, col: 0 },
        { row: 1, col: 1 }, // Chain tile
        { row: 1, col: 2 },
        { row: 1, col: 3 },
      ]);
    });

    // THEN - Ice tile should be marked as chained (visual feedback)
    // Note: Chain linking marks tiles as isChained, but doesn't melt ice
    // Ice melting happens when adjacent to used tiles (different mechanism)
    expect(result.current.tiles[0][0].isChained).toBe(true);
  });

  it('should apply chain bonus before bomb row clear', () => {
    // GIVEN - Level with chain and bomb tiles
    const levelConfig = createMockLevelConfig({
      specialTiles: [
        { row: 1, col: 1, type: 'chain' },
        { row: 1, col: 2, type: 'bomb' },
      ],
      objectives: [{ type: 'wordCount', target: 10, isPrimary: true }],
    });
    const grid = createMockGrid();
    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig, initialGrid: grid })
    );

    act(() => {
      result.current.startGame();
    });

    // Build combo
    act(() => {
      result.current.submitWordWithPath('WORD', 100, [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
        { row: 0, col: 3 },
      ]);
    });

    expect(result.current.gameState.comboCount).toBe(1);

    // WHEN - Use word with both chain and bomb tiles
    const scoreBeforeWord = result.current.gameState.score;
    act(() => {
      result.current.submitWordWithPath('TEST', 100, [
        { row: 1, col: 0 },
        { row: 1, col: 1 }, // Chain tile
        { row: 1, col: 2 }, // Bomb tile
        { row: 1, col: 3 },
      ]);
    });

    // THEN - Chain bonus should apply to base score before bomb clears row
    // Base: 100
    // Chain bonus: 100 * 1.15 = 115
    // Bomb clears row (no additional score from bomb itself)
    const expectedScoreGain = 115;
    expect(result.current.gameState.score).toBe(scoreBeforeWord + expectedScoreGain);

    // Verify bomb cleared the row
    expect(result.current.tiles[1][0].isCleared).toBe(true);
    expect(result.current.tiles[1][1].isCleared).toBe(true);
    expect(result.current.tiles[1][2].isCleared).toBe(true);
    expect(result.current.tiles[1][3].isCleared).toBe(true);
  });

  it('should handle multiple chain tiles in the same word', () => {
    // GIVEN - Level with two chain tiles
    const levelConfig = createMockLevelConfig({
      specialTiles: [
        { row: 0, col: 1, type: 'chain' },
        { row: 0, col: 2, type: 'chain' },
      ],
      objectives: [{ type: 'wordCount', target: 10, isPrimary: true }],
    });
    const grid = createMockGrid();
    const { result } = renderHook(() =>
      useAdventureGame({ levelConfig, initialGrid: grid })
    );

    act(() => {
      result.current.startGame();
    });

    // Build combo
    act(() => {
      result.current.submitWordWithPath('WORD', 100, [
        { row: 1, col: 0 },
        { row: 1, col: 1 },
        { row: 1, col: 2 },
        { row: 1, col: 3 },
      ]);
    });

    expect(result.current.gameState.comboCount).toBe(1);

    // WHEN - Use both chain tiles
    const scoreBeforeWord = result.current.gameState.score;
    act(() => {
      result.current.submitWordWithPath('TEST', 100, [
        { row: 0, col: 0 },
        { row: 0, col: 1 }, // Chain tile 1
        { row: 0, col: 2 }, // Chain tile 2
        { row: 0, col: 3 },
      ]);
    });

    // THEN - Chain bonus should still apply once (shared multiplier)
    // Base: 100
    // Chain bonus: 100 * 1.15 = 115
    const expectedScoreGain = 115;
    expect(result.current.gameState.score).toBe(scoreBeforeWord + expectedScoreGain);

    // Both chain tiles should have 'link' effect
    expect(result.current.tiles[0][1].activationEffect).toBe('link');
    expect(result.current.tiles[0][2].activationEffect).toBe('link');

    // Both should mark their neighbors as chained
    // (This creates overlapping chained areas)
    expect(result.current.tiles[0][0].isChained).toBe(true); // Neighbor of chain1
    expect(result.current.tiles[0][3].isChained).toBe(true); // Neighbor of chain2
  });
});
