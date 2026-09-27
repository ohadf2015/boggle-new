/**
 * blastGravity - Pure function tests for gravity computation.
 *
 * Tests column-based gravity, tile fall distances, and new tile generation.
 */

import type { BlastTileState, BlastTileType } from '../types';
import { computeGravityResult, countCleared } from '../utils/blastGravity';

// Mock letter generator for deterministic tests
vi.mock('../utils/blastLetterGenerator', () => ({
  generateBlastLetter: vi.fn(() => 'X'),
  rollSpecialType: vi.fn(() => 'standard' as const),
}));

function makeTileStates(
  gridSize: number,
  cleared: Array<{ row: number; col: number }> = []
): BlastTileState[][] {
  const states: BlastTileState[][] = [];
  for (let r = 0; r < gridSize; r++) {
    states[r] = [];
    for (let c = 0; c < gridSize; c++) {
      states[r][c] = {
        row: r,
        col: c,
        type: 'standard' as BlastTileType,
        isCleared: cleared.some(p => p.row === r && p.col === c),
        activationEffect: null,
        hitsRemaining: 0,
      };
    }
  }
  return states;
}

describe('computeGravityResult', () => {
  it('should not change grid when no tiles are cleared', () => {
    const grid = [
      ['A', 'B'],
      ['C', 'D'],
    ];
    const states = makeTileStates(2);

    const result = computeGravityResult(grid, states, 2, 'en', 0);

    expect(result.newGrid).toEqual([
      ['A', 'B'],
      ['C', 'D'],
    ]);
    expect(result.fallingTiles).toHaveLength(0);
    expect(result.newTiles).toHaveLength(0);
  });

  it('should drop tiles down to fill cleared bottom row', () => {
    // Grid:  A B     After gravity:  X X  (new)
    //        C D  →                  A B  (fell 1 row)
    // Bottom row cleared
    const grid = [
      ['A', 'B'],
      ['C', 'D'],
    ];
    const states = makeTileStates(2, [
      { row: 1, col: 0 },
      { row: 1, col: 1 },
    ]);

    const result = computeGravityResult(grid, states, 2, 'en', 0);

    // A and B should fall to row 1
    expect(result.newGrid[1][0]).toBe('A');
    expect(result.newGrid[1][1]).toBe('B');
    // New tiles fill row 0
    expect(result.newGrid[0][0]).toBe('X');
    expect(result.newGrid[0][1]).toBe('X');
    expect(result.fallingTiles).toHaveLength(2);
    expect(result.newTiles).toHaveLength(2);
  });

  it('should compute correct fall distances', () => {
    // 3x1 grid, middle tile cleared:
    // A       A (no fall)
    // _  →    X (new)
    // C       C (no fall, was at bottom)
    // Wait — bottom to top: C stays at row 2, A falls from 0 to 1
    const grid = [['A'], ['B'], ['C']];
    const states = makeTileStates(3);
    // Clear the middle tile
    states[1][0].isCleared = true;

    const result = computeGravityResult(grid, states, 3, 'en', 0);

    // C stays at row 2, A falls to row 1
    expect(result.newGrid[2][0]).toBe('C');
    expect(result.newGrid[1][0]).toBe('A');
    expect(result.newGrid[0][0]).toBe('X'); // new tile

    // A fell from row 0 to row 1 = distance 1
    const aFall = result.fallingTiles.find(t => t.letter === 'A');
    expect(aFall).toBeDefined();
    expect(aFall!.fallDistance).toBe(1);
  });

  it('should handle clearing all tiles in a column', () => {
    const grid = [['A'], ['B'], ['C']];
    const states = makeTileStates(3);
    states[0][0].isCleared = true;
    states[1][0].isCleared = true;
    states[2][0].isCleared = true;

    const result = computeGravityResult(grid, states, 3, 'en', 0);

    // All new tiles
    expect(result.newGrid[0][0]).toBe('X');
    expect(result.newGrid[1][0]).toBe('X');
    expect(result.newGrid[2][0]).toBe('X');
    expect(result.fallingTiles).toHaveLength(0);
    expect(result.newTiles).toHaveLength(3);
  });

  it('should preserve tile types for non-cleared tiles', () => {
    const grid = [['A'], ['B']];
    const states = makeTileStates(2);
    states[0][0].type = 'gold';
    states[1][0].isCleared = true;

    const result = computeGravityResult(grid, states, 2, 'en', 0);

    // Gold tile A falls to bottom
    expect(result.newTileStates[1][0].type).toBe('gold');
  });

  it('should generate new tiles with spawnOffset for animation', () => {
    const grid = [['A'], ['B'], ['C']];
    const states = makeTileStates(3);
    states[0][0].isCleared = true;
    states[1][0].isCleared = true;

    const result = computeGravityResult(grid, states, 3, 'en', 0);

    // 2 new tiles in rows 0 and 1
    expect(result.newTiles).toHaveLength(2);
    // Check spawn offsets are positive
    result.newTiles.forEach(t => {
      expect(t.spawnOffset).toBeGreaterThan(0);
    });
  });

  it('should return clearedTiles with correct positions and letters', () => {
    const grid = [
      ['A', 'B'],
      ['C', 'D'],
    ];
    const states = makeTileStates(2, [
      { row: 0, col: 0 },
      { row: 1, col: 1 },
    ]);
    states[0][0].type = 'gold';

    const result = computeGravityResult(grid, states, 2, 'en', 0);

    expect(result.clearedTiles).toHaveLength(2);
    expect(result.clearedTiles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ row: 0, col: 0, letter: 'A', type: 'gold' }),
        expect.objectContaining({ row: 1, col: 1, letter: 'D', type: 'standard' }),
      ])
    );
  });

  it('should return empty clearedTiles when no tiles cleared', () => {
    const grid = [['A', 'B'], ['C', 'D']];
    const states = makeTileStates(2);

    const result = computeGravityResult(grid, states, 2, 'en', 0);

    expect(result.clearedTiles).toHaveLength(0);
  });

  it('should only affect the column where tiles are cleared', () => {
    const grid = [
      ['A', 'B'],
      ['C', 'D'],
    ];
    const states = makeTileStates(2, [{ row: 0, col: 0 }]); // Only clear A

    const result = computeGravityResult(grid, states, 2, 'en', 0);

    // Column 1 unchanged
    expect(result.newGrid[0][1]).toBe('B');
    expect(result.newGrid[1][1]).toBe('D');
    // Column 0: C falls to bottom, new tile at top
    expect(result.newGrid[1][0]).toBe('C');
    expect(result.newGrid[0][0]).toBe('X');
  });
});

describe('countCleared', () => {
  it('should count cleared tiles', () => {
    const states = makeTileStates(3, [
      { row: 0, col: 0 },
      { row: 1, col: 1 },
      { row: 2, col: 2 },
    ]);
    expect(countCleared(states)).toBe(3);
  });

  it('should return 0 when no tiles cleared', () => {
    const states = makeTileStates(3);
    expect(countCleared(states)).toBe(0);
  });
});
