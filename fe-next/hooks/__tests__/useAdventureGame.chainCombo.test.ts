/**
 * useAdventureGame Chain Tile Tests
 *
 * Chain tile type is declared in specialTiles config but is NOT implemented
 * in processSpecialTileEffects. It is treated as a standard tile:
 * - No combo multiplier bonus
 * - No isChained marking on adjacent tiles
 * - No 'link' activationEffect
 * - Score equals base score (no chain multiplier)
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
// CHAIN TILE TREATED AS STANDARD TILE
// ==============================================

describe('Chain Tile 1.5x Combo Multiplier', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should NOT apply 1.5x multiplier when chain tile used during active combo — treated as standard', () => {
    // GIVEN - Level with chain tile (unimplemented), game with active combo
    const levelConfig = createMockLevelConfig({
      specialTiles: [{ row: 1, col: 1, type: 'chain' as any }],
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
      result.current.submitWordWithPath('TEST', 100, [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
        { row: 0, col: 3 },
      ]);
    });

    expect(result.current.gameState.comboCount).toBe(1);

    // WHEN - Use "chain tile" during active combo
    const scoreBeforeChain = result.current.gameState.score;
    act(() => {
      result.current.submitWordWithPath('WORD', 100, [
        { row: 1, col: 0 },
        { row: 1, col: 1 }, // chain tile — treated as standard
        { row: 1, col: 2 },
        { row: 1, col: 3 },
      ]);
    });

    // THEN - No chain bonus. Score gain = 100 (base only, no 1.15 multiplier)
    expect(result.current.gameState.score).toBe(scoreBeforeChain + 100);
  });

  it('should NOT apply multiplier when chain tile used without active combo (comboCount = 0)', () => {
    // GIVEN - Level with chain tile, fresh game (no combo)
    const levelConfig = createMockLevelConfig({
      specialTiles: [{ row: 0, col: 1, type: 'chain' as any }],
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

  it('should NOT apply enhanced bonus scaling with higher combo count — chain is standard tile', () => {
    // GIVEN - Level with chain tile, high combo built
    const levelConfig = createMockLevelConfig({
      specialTiles: [{ row: 2, col: 2, type: 'chain' as any }],
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
      result.current.submitWordWithPath('FIRST', 100, [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
        { row: 0, col: 3 },
      ]);
    });
    act(() => {
      result.current.submitWordWithPath('SECOND', 100, [
        { row: 1, col: 0 },
        { row: 1, col: 1 },
        { row: 1, col: 2 },
        { row: 1, col: 3 },
      ]);
    });
    act(() => {
      result.current.submitWordWithPath('THIRD', 100, [
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
        { row: 2, col: 2 }, // chain tile (standard behavior)
        { row: 2, col: 3 },
      ]);
    });

    // THEN - No chain bonus: 100 (no 1.45 multiplier)
    expect(result.current.gameState.score).toBe(scoreBeforeChain + 100);
  });

  it('should NOT round differently — chain tile is standard, score equals base score', () => {
    // GIVEN - Level with chain tile
    const levelConfig = createMockLevelConfig({
      specialTiles: [{ row: 0, col: 1, type: 'chain' as any }],
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

    // WHEN - Use chain tile with odd score
    const scoreBeforeChain = result.current.gameState.score;
    act(() => {
      result.current.submitWordWithPath('TEST', 97, [
        { row: 0, col: 0 },
        { row: 0, col: 1 }, // Chain tile (standard)
        { row: 0, col: 2 },
        { row: 0, col: 3 },
      ]);
    });

    // THEN - Score = 97 exactly (no chain rounding, chain = standard)
    expect(result.current.gameState.score).toBe(scoreBeforeChain + 97);
  });
});

// ==============================================
// CHAIN TILE ADJACENT LINKING — NOT IMPLEMENTED
// ==============================================

describe('Chain Tile Adjacent Linking', () => {
  it('should NOT mark adjacent tiles as isChained — chain is treated as standard', () => {
    // GIVEN - Level with chain tile at center (1,1)
    const levelConfig = createMockLevelConfig({
      specialTiles: [{ row: 1, col: 1, type: 'chain' as any }],
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
        { row: 1, col: 1 }, // chain tile at center
        { row: 1, col: 2 },
        { row: 1, col: 3 },
      ]);
    });

    // THEN - No adjacent tiles are marked isChained (not implemented)
    const tiles = result.current.tiles;
    expect(tiles[0][0].isChained).toBeFalsy();
    expect(tiles[0][1].isChained).toBeFalsy();
    expect(tiles[0][2].isChained).toBeFalsy();
    expect(tiles[1][0].isChained).toBeFalsy();
    expect(tiles[1][2].isChained).toBeFalsy();
    expect(tiles[2][0].isChained).toBeFalsy();
    expect(tiles[2][1].isChained).toBeFalsy();
    expect(tiles[2][2].isChained).toBeFalsy();
  });

  it('should NOT mark tiles beyond adjacency range', () => {
    // GIVEN - Level with chain tile at (1,1)
    const levelConfig = createMockLevelConfig({
      specialTiles: [{ row: 1, col: 1, type: 'chain' as any }],
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

    // THEN - Tiles at distance 2+ should NOT be chained (they're never chained)
    const tiles = result.current.tiles;
    expect(tiles[3][0].isChained).toBeFalsy();
    expect(tiles[3][1].isChained).toBeFalsy();
    expect(tiles[3][2].isChained).toBeFalsy();
    expect(tiles[3][3].isChained).toBeFalsy();
  });

  it('should handle chain tile at grid corner (0,0) without crash — no isChained set', () => {
    // GIVEN - chain tile at top-left corner
    const levelConfig = createMockLevelConfig({
      specialTiles: [{ row: 0, col: 0, type: 'chain' as any }],
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
        { row: 0, col: 0 }, // chain tile at corner
        { row: 0, col: 1 },
        { row: 0, col: 2 },
        { row: 0, col: 3 },
      ]);
    });

    // THEN - No neighbor tiles are chained (not implemented)
    const tiles = result.current.tiles;
    expect(tiles[0][1].isChained).toBeFalsy();
    expect(tiles[1][0].isChained).toBeFalsy();
    expect(tiles[1][1].isChained).toBeFalsy();
  });

  it('should handle chain tile at grid edge (1,0) without crash — no isChained set', () => {
    // GIVEN - chain tile at left edge
    const levelConfig = createMockLevelConfig({
      specialTiles: [{ row: 1, col: 0, type: 'chain' as any }],
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
        { row: 1, col: 0 }, // chain tile at left edge
        { row: 1, col: 1 },
        { row: 1, col: 2 },
        { row: 1, col: 3 },
      ]);
    });

    // THEN - No adjacent tiles marked isChained
    const tiles = result.current.tiles;
    expect(tiles[0][0].isChained).toBeFalsy();
    expect(tiles[0][1].isChained).toBeFalsy();
    expect(tiles[1][1].isChained).toBeFalsy();
    expect(tiles[2][0].isChained).toBeFalsy();
    expect(tiles[2][1].isChained).toBeFalsy();
  });
});

// ==============================================
// CHAIN TILE ACTIVATION EFFECT — NOT IMPLEMENTED
// ==============================================

describe('Chain Tile Activation Effect', () => {
  it('should NOT set activationEffect on chain tiles — no "link" effect implemented', () => {
    // GIVEN - Level with chain tile
    const levelConfig = createMockLevelConfig({
      specialTiles: [{ row: 1, col: 1, type: 'chain' as any }],
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
        { row: 1, col: 1 }, // chain tile
        { row: 1, col: 2 },
        { row: 1, col: 3 },
      ]);
    });

    // THEN - Chain tile has null activationEffect (treated as standard)
    const chainTile = result.current.tiles[1][1];
    expect(chainTile.activationEffect).toBeNull();
  });

  it('should NOT set activationTimestamp for chain tile (no animation, standard tile behavior)', () => {
    // GIVEN - Level with chain tile
    const levelConfig = createMockLevelConfig({
      specialTiles: [{ row: 0, col: 1, type: 'chain' as any }],
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
        { row: 0, col: 1 }, // chain tile
        { row: 0, col: 2 },
        { row: 0, col: 3 },
      ]);
    });

    // THEN - No activation timestamp set (chain treated as standard)
    const chainTile = result.current.tiles[0][1];
    expect(chainTile.activationEffect).toBeNull();
    expect(chainTile.activationTimestamp).toBeUndefined();
  });

  it('should NOT set activation effect without combo bonus — chain is purely standard', () => {
    // GIVEN - Level with chain tile, no active combo
    const levelConfig = createMockLevelConfig({
      specialTiles: [{ row: 0, col: 1, type: 'chain' as any }],
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
        { row: 0, col: 1 }, // chain tile
        { row: 0, col: 2 },
        { row: 0, col: 3 },
      ]);
    });

    // THEN - No activation effect (no visual feedback for unimplemented chain)
    const chainTile = result.current.tiles[0][1];
    expect(chainTile.activationEffect).toBeNull();
    expect(chainTile.activationTimestamp).toBeUndefined();
  });
});

// ==============================================
// CHAIN + OTHER SPECIAL TILE INTERACTION TESTS
// ==============================================

describe('Chain Tile Special Tile Interactions', () => {
  it('should NOT stack chain bonus with gold tile — gold 3x only, no chain multiplier', () => {
    // GIVEN - Level with both chain and gold tiles
    const levelConfig = createMockLevelConfig({
      specialTiles: [
        { row: 0, col: 1, type: 'chain' as any },
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

    // WHEN - Use word with both chain (standard) and gold tiles
    const scoreBeforeWord = result.current.gameState.score;
    act(() => {
      result.current.submitWordWithPath('TEST', 100, [
        { row: 0, col: 0 },
        { row: 0, col: 1 }, // chain tile (standard — no 1.5x)
        { row: 0, col: 2 }, // gold tile (3x)
        { row: 0, col: 3 },
      ]);
    });

    // THEN - Gold 3x only: 100 * 3 = 300 (no chain 1.15x stacking)
    expect(result.current.gameState.score).toBe(scoreBeforeWord + 300);
  });

  it('should NOT apply chain adjacent linking to ice tiles — isChained stays falsy', () => {
    // GIVEN - Level with chain tile adjacent to ice tile
    const levelConfig = createMockLevelConfig({
      specialTiles: [
        { row: 1, col: 1, type: 'chain' as any },
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

    // WHEN - Use chain tile (no adjacent linking implemented)
    act(() => {
      result.current.submitWordWithPath('TEST', 100, [
        { row: 1, col: 0 },
        { row: 1, col: 1 }, // chain tile
        { row: 1, col: 2 },
        { row: 1, col: 3 },
      ]);
    });

    // THEN - Ice tile is NOT marked isChained (chain linking not implemented)
    expect(result.current.tiles[0][0].isChained).toBeFalsy();
  });

  it('should NOT apply chain bonus before bomb — bomb 2x only, no chain multiplier', () => {
    // GIVEN - Level with chain and bomb tiles
    const levelConfig = createMockLevelConfig({
      specialTiles: [
        { row: 1, col: 1, type: 'chain' as any },
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

    // WHEN - Use word with chain (standard) and bomb
    const scoreBeforeWord = result.current.gameState.score;
    act(() => {
      result.current.submitWordWithPath('TEST', 100, [
        { row: 1, col: 0 },
        { row: 1, col: 1 }, // chain tile (standard)
        { row: 1, col: 2 }, // bomb tile (2x)
        { row: 1, col: 3 },
      ]);
    });

    // THEN - Bomb 2x only: 100 * 2 = 200 (no chain 1.15x)
    expect(result.current.gameState.score).toBe(scoreBeforeWord + 200);

    // Bomb tile cleared
    expect(result.current.tiles[1][2].isCleared).toBe(true);
    expect(result.current.tiles[0][0].isCleared).toBe(false);
  });

  it('should handle multiple chain tiles in the same word — all treated as standard, no link effect', () => {
    // GIVEN - Level with two chain tiles
    const levelConfig = createMockLevelConfig({
      specialTiles: [
        { row: 0, col: 1, type: 'chain' as any },
        { row: 0, col: 2, type: 'chain' as any },
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
        { row: 0, col: 1 }, // chain tile 1 (standard)
        { row: 0, col: 2 }, // chain tile 2 (standard)
        { row: 0, col: 3 },
      ]);
    });

    // THEN - No chain bonus: 100 (base only)
    expect(result.current.gameState.score).toBe(scoreBeforeWord + 100);

    // Neither chain tile has activation effect
    expect(result.current.tiles[0][1].activationEffect).toBeNull();
    expect(result.current.tiles[0][2].activationEffect).toBeNull();

    // No isChained marking on neighbors
    expect(result.current.tiles[0][0].isChained).toBeFalsy();
    expect(result.current.tiles[0][3].isChained).toBeFalsy();
  });
});
