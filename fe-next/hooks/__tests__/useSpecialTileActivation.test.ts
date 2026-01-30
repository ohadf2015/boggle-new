/**
 * TDD Tests for useSpecialTileActivation Hook
 *
 * Tests special tile mechanics: frozen thaw, locked unlock, and multiplier boost
 */

import { renderHook } from '@testing-library/react';
import type { TileState } from '@/types/adventure';
import {
  getAdjacentIndices,
  checkFrozenThaw,
  checkLockedUnlock,
  applyMultiplier,
  useSpecialTileActivation,
} from '../useSpecialTileActivation';

// ==============================================
// HELPER FUNCTIONS
// ==============================================

function createTile(
  letter: string,
  overrides?: Partial<TileState>
): TileState {
  return {
    letter,
    type: 'standard',
    isCleared: false,
    ...overrides,
  };
}

function createGrid(size: number): TileState[][] {
  const grid: TileState[][] = [];
  for (let row = 0; row < size; row++) {
    grid[row] = [];
    for (let col = 0; col < size; col++) {
      grid[row][col] = createTile('A');
    }
  }
  return grid;
}

// ==============================================
// PURE FUNCTION TESTS
// ==============================================

describe('getAdjacentIndices', () => {
  it('should return 8 adjacent indices for center tile', () => {
    // GIVEN: 5x5 grid, center tile at index 12
    const gridSize = 5;
    const tileIndex = 12; // row 2, col 2

    // WHEN
    const adjacent = getAdjacentIndices(tileIndex, gridSize);

    // THEN: Should have 8 neighbors (order: top-left, top, top-right, left, right, bottom-left, bottom, bottom-right)
    expect(adjacent).toHaveLength(8);
    expect(adjacent).toEqual([6, 7, 8, 11, 13, 16, 17, 18]);
  });

  it('should return 3 adjacent indices for corner tile', () => {
    // GIVEN: 5x5 grid, top-left corner at index 0
    const gridSize = 5;
    const tileIndex = 0;

    // WHEN
    const adjacent = getAdjacentIndices(tileIndex, gridSize);

    // THEN: Should have 3 neighbors (right, below, diagonal)
    expect(adjacent).toHaveLength(3);
    expect(adjacent).toEqual([1, 5, 6]);
  });

  it('should return 5 adjacent indices for edge tile', () => {
    // GIVEN: 5x5 grid, top edge at index 2
    const gridSize = 5;
    const tileIndex = 2;

    // WHEN
    const adjacent = getAdjacentIndices(tileIndex, gridSize);

    // THEN: Should have 5 neighbors
    expect(adjacent).toHaveLength(5);
    expect(adjacent).toEqual([1, 3, 6, 7, 8]);
  });
});

describe('checkFrozenThaw', () => {
  it('should thaw frozen tile when adjacent tile is in word', () => {
    // GIVEN: Frozen tile at index 12, adjacent tile at index 13 is used in word
    const frozenTile = createTile('A', { type: 'ice', isFrozen: true });
    const adjacentIndices = [7, 8, 11, 13, 16, 17, 6, 18];
    const wordTileIndices = [13, 14, 15];

    // WHEN
    const shouldThaw = checkFrozenThaw(frozenTile, adjacentIndices, wordTileIndices);

    // THEN
    expect(shouldThaw).toBe(true);
  });

  it('should NOT thaw frozen tile when no adjacent tile in word', () => {
    // GIVEN: Frozen tile at index 12, word uses distant tiles
    const frozenTile = createTile('A', { type: 'ice', isFrozen: true });
    const adjacentIndices = [7, 8, 11, 13, 16, 17, 6, 18];
    const wordTileIndices = [0, 1, 2]; // Far away

    // WHEN
    const shouldThaw = checkFrozenThaw(frozenTile, adjacentIndices, wordTileIndices);

    // THEN
    expect(shouldThaw).toBe(false);
  });

  it('should NOT thaw already-thawed tile', () => {
    // GIVEN: Tile that is NOT frozen
    const normalTile = createTile('A', { type: 'ice', isFrozen: false });
    const adjacentIndices = [7, 8, 11, 13];
    const wordTileIndices = [13, 14];

    // WHEN
    const shouldThaw = checkFrozenThaw(normalTile, adjacentIndices, wordTileIndices);

    // THEN
    expect(shouldThaw).toBe(false);
  });
});

describe('checkLockedUnlock', () => {
  it('should unlock locked tile when word contains same letter', () => {
    // GIVEN: Locked tile with letter 'A', word contains tile with 'A'
    const lockedTile = createTile('A', { type: 'locked' });
    const grid = createGrid(5);
    grid[0][0] = createTile('A'); // Same letter in word
    grid[0][1] = createTile('B');
    grid[0][2] = createTile('C');

    const wordTileIndices = [0, 1, 2]; // Indices 0, 1, 2

    // WHEN
    const shouldUnlock = checkLockedUnlock(lockedTile, grid, wordTileIndices);

    // THEN
    expect(shouldUnlock).toBe(true);
  });

  it('should NOT unlock locked tile when word has different letters', () => {
    // GIVEN: Locked tile with letter 'A', word contains only B, C, D
    const lockedTile = createTile('A', { type: 'locked' });
    const grid = createGrid(5);
    grid[0][0] = createTile('B');
    grid[0][1] = createTile('C');
    grid[0][2] = createTile('D');

    const wordTileIndices = [0, 1, 2];

    // WHEN
    const shouldUnlock = checkLockedUnlock(lockedTile, grid, wordTileIndices);

    // THEN
    expect(shouldUnlock).toBe(false);
  });

  it('should handle empty word gracefully', () => {
    // GIVEN: Locked tile, empty word
    const lockedTile = createTile('A', { type: 'locked' });
    const grid = createGrid(5);
    const wordTileIndices: number[] = [];

    // WHEN
    const shouldUnlock = checkLockedUnlock(lockedTile, grid, wordTileIndices);

    // THEN
    expect(shouldUnlock).toBe(false);
  });
});

describe('applyMultiplier', () => {
  it('should apply 2x multiplier when word contains multiplier tile', () => {
    // GIVEN: Word with score 100, contains one multiplier tile
    const wordScore = 100;
    const wordTiles = [
      createTile('A'),
      createTile('B', { type: 'multiplier' }),
      createTile('C'),
    ];

    // WHEN
    const result = applyMultiplier(wordScore, wordTiles);

    // THEN
    expect(result.finalScore).toBe(200);
    expect(result.multiplierUsed).toBe(true);
  });

  it('should stack multiple multipliers (2x * 2x = 4x)', () => {
    // GIVEN: Word with score 100, contains two multiplier tiles
    const wordScore = 100;
    const wordTiles = [
      createTile('A', { type: 'multiplier' }),
      createTile('B', { type: 'multiplier' }),
      createTile('C'),
    ];

    // WHEN
    const result = applyMultiplier(wordScore, wordTiles);

    // THEN
    expect(result.finalScore).toBe(400); // 100 * 2 * 2
    expect(result.multiplierUsed).toBe(true);
  });

  it('should stack with gold tiles (gold 3x + multiplier 2x = 6x)', () => {
    // GIVEN: Word with score 100, contains gold (3x) and multiplier (2x)
    // Note: Base score already includes gold 3x, multiplier adds on top
    const baseScoreWithGold = 300; // Already 3x from gold
    const wordTiles = [
      createTile('A', { type: 'gold' }),
      createTile('B', { type: 'multiplier' }),
    ];

    // WHEN
    const result = applyMultiplier(baseScoreWithGold, wordTiles);

    // THEN
    expect(result.finalScore).toBe(600); // 300 * 2
    expect(result.multiplierUsed).toBe(true);
  });

  it('should NOT multiply when no multiplier tiles in word', () => {
    // GIVEN: Word with score 100, no multiplier tiles
    const wordScore = 100;
    const wordTiles = [
      createTile('A'),
      createTile('B'),
      createTile('C'),
    ];

    // WHEN
    const result = applyMultiplier(wordScore, wordTiles);

    // THEN
    expect(result.finalScore).toBe(100);
    expect(result.multiplierUsed).toBe(false);
  });
});

// ==============================================
// HOOK INTEGRATION TESTS
// ==============================================

describe('useSpecialTileActivation', () => {
  it('should process word submission with frozen tile thawing', () => {
    // GIVEN: Hook initialized
    const { result } = renderHook(() => useSpecialTileActivation());
    const grid = createGrid(5);
    grid[2][2] = createTile('X', { type: 'ice', isFrozen: true }); // Index 12
    grid[2][3] = createTile('A'); // Index 13 (adjacent)

    // WHEN: Submit word that uses adjacent tile
    const wordTileIndices = [13, 14, 15];
    const processed = result.current.processWordSubmission(
      grid,
      wordTileIndices,
      100
    );

    // THEN: Frozen tile should thaw
    expect(processed.activatedTiles.has(12)).toBe(true);
    expect(processed.updatedGrid[2][2].isFrozen).toBe(false);
    expect(processed.updatedGrid[2][2].activationEffect).toBe('melt');
  });

  it('should process word submission with locked tile unlocking', () => {
    // GIVEN: Hook initialized
    const { result } = renderHook(() => useSpecialTileActivation());
    const grid = createGrid(5);
    grid[1][1] = createTile('A', { type: 'locked' }); // Index 6
    grid[0][0] = createTile('A'); // Index 0 (same letter)

    // WHEN: Submit word that contains same letter
    const wordTileIndices = [0, 1, 2];
    const processed = result.current.processWordSubmission(
      grid,
      wordTileIndices,
      100
    );

    // THEN: Locked tile should unlock
    expect(processed.activatedTiles.has(6)).toBe(true);
    expect(processed.updatedGrid[1][1].type).toBe('standard');
    expect(processed.updatedGrid[1][1].activationEffect).toBe('unlock');
  });

  it('should process word submission with multiplier tile', () => {
    // GIVEN: Hook initialized
    const { result } = renderHook(() => useSpecialTileActivation());
    const grid = createGrid(5);
    grid[0][0] = createTile('A');
    grid[0][1] = createTile('B', { type: 'multiplier' }); // Index 1
    grid[0][2] = createTile('C');

    // WHEN: Submit word with multiplier
    const wordTileIndices = [0, 1, 2];
    const processed = result.current.processWordSubmission(
      grid,
      wordTileIndices,
      100
    );

    // THEN: Score should double
    expect(processed.finalScore).toBe(200);
    expect(processed.multiplierBonus).toBe(2);
    expect(processed.activatedTiles.has(1)).toBe(true);
    expect(processed.updatedGrid[0][1].activationEffect).toBe('multiply');
  });

  it('should handle multiple special tile activations in one word', () => {
    // GIVEN: Grid with frozen tile adjacent to word AND multiplier in word
    const { result } = renderHook(() => useSpecialTileActivation());
    const grid = createGrid(5);
    grid[2][2] = createTile('X', { type: 'ice', isFrozen: true }); // Index 12
    grid[2][3] = createTile('A', { type: 'multiplier' }); // Index 13 (adjacent, in word)
    grid[2][4] = createTile('B'); // Index 14

    // WHEN: Submit word
    const wordTileIndices = [13, 14];
    const processed = result.current.processWordSubmission(
      grid,
      wordTileIndices,
      100
    );

    // THEN: Both activations should occur
    expect(processed.activatedTiles.has(12)).toBe(true); // Frozen thawed
    expect(processed.activatedTiles.has(13)).toBe(true); // Multiplier used
    expect(processed.finalScore).toBe(200); // Multiplied
    expect(processed.updatedGrid[2][2].isFrozen).toBe(false);
    expect(processed.updatedGrid[2][3].activationEffect).toBe('multiply');
  });

  it('should return empty activations when no special tiles affected', () => {
    // GIVEN: Grid with only normal tiles
    const { result } = renderHook(() => useSpecialTileActivation());
    const grid = createGrid(5);

    // WHEN: Submit word
    const wordTileIndices = [0, 1, 2];
    const processed = result.current.processWordSubmission(
      grid,
      wordTileIndices,
      100
    );

    // THEN: No activations
    expect(processed.activatedTiles.size).toBe(0);
    expect(processed.finalScore).toBe(100);
    expect(processed.multiplierBonus).toBe(1);
  });
});
