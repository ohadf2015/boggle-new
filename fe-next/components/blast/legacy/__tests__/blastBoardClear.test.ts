/**
 * Board Clear Mode (shrink) tests.
 *
 * Tests the incremental board clearing mechanic:
 * - BlastGameConfig.boardClearMode option
 * - computeGravityResult with refill=false leaves empty cells
 * - Board clear percentage calculation
 * - Victory condition when board is fully cleared
 */

import { resolveBlastConfig, type BlastTileState, type BlastTileType, type BlastGameConfig } from '../types';
import { computeGravityResult } from '../utils/blastGravity';
import { getBoardClearPercentage, isBoardFullyCleared } from '../utils/blastBoardClear';

jest.mock('../utils/blastLetterGenerator', () => ({
  generateBlastLetter: jest.fn(() => 'X'),
  rollSpecialType: jest.fn(() => 'standard' as const),
}));

function makeTileStates(
  gridSize: number,
  cleared: Array<{ row: number; col: number }> = [],
): BlastTileState[][] {
  const states: BlastTileState[][] = [];
  for (let r = 0; r < gridSize; r++) {
    states[r] = [];
    for (let c = 0; c < gridSize; c++) {
      states[r][c] = {
        uid: `tile-${r}-${c}`,
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

describe('BlastGameConfig.boardClearMode', () => {
  it('should default to undefined (refill behavior)', () => {
    const config = resolveBlastConfig('en', 'medium');
    expect(config.boardClearMode).toBeUndefined();
  });

  it('should accept shrink mode', () => {
    const config: BlastGameConfig = {
      gridSize: 6,
      specialTileChance: 0.15,
      language: 'en',
      boardClearMode: 'shrink',
    };
    expect(config.boardClearMode).toBe('shrink');
  });
});

describe('computeGravityResult with refill=false (shrink mode)', () => {
  it('should leave empty cells at top when refill=false', () => {
    const grid = [
      ['A', 'B'],
      ['C', 'D'],
    ];
    const states = makeTileStates(2, [
      { row: 1, col: 0 },
      { row: 1, col: 1 },
    ]);

    const result = computeGravityResult(grid, states, 2, 'en', 0, undefined, 0, undefined, false);

    expect(result.newGrid[1][0]).toBe('A');
    expect(result.newGrid[1][1]).toBe('B');
    expect(result.newGrid[0][0]).toBe('');
    expect(result.newGrid[0][1]).toBe('');
    expect(result.newTiles).toHaveLength(0);
    expect(result.newTileStates[0][0].isCleared).toBe(true);
    expect(result.newTileStates[0][1].isCleared).toBe(true);
  });

  it('should clear entire column when all tiles are cleared with refill=false', () => {
    const grid = [['A'], ['B'], ['C']];
    const states = makeTileStates(3);
    states[0][0].isCleared = true;
    states[1][0].isCleared = true;
    states[2][0].isCleared = true;

    const result = computeGravityResult(grid, states, 3, 'en', 0, undefined, 0, undefined, false);

    expect(result.newGrid[0][0]).toBe('');
    expect(result.newGrid[1][0]).toBe('');
    expect(result.newGrid[2][0]).toBe('');
    expect(result.newTiles).toHaveLength(0);
    expect(result.newTileStates[0][0].isCleared).toBe(true);
    expect(result.newTileStates[1][0].isCleared).toBe(true);
    expect(result.newTileStates[2][0].isCleared).toBe(true);
  });

  it('should still produce falling tiles with refill=false', () => {
    const grid = [['A'], ['B'], ['C']];
    const states = makeTileStates(3);
    states[1][0].isCleared = true;

    const result = computeGravityResult(grid, states, 3, 'en', 0, undefined, 0, undefined, false);

    expect(result.newGrid[2][0]).toBe('C');
    expect(result.newGrid[1][0]).toBe('A');
    expect(result.newGrid[0][0]).toBe('');
    expect(result.fallingTiles).toHaveLength(1);
    expect(result.fallingTiles[0].letter).toBe('A');
    expect(result.newTileStates[0][0].isCleared).toBe(true);
  });
});

describe('getBoardClearPercentage', () => {
  it('should return 0 when no tiles cleared', () => {
    const states = makeTileStates(3);
    expect(getBoardClearPercentage(states)).toBe(0);
  });

  it('should return correct percentage for partially cleared board', () => {
    const states = makeTileStates(2, [
      { row: 0, col: 0 },
      { row: 1, col: 1 },
    ]);
    expect(getBoardClearPercentage(states)).toBe(50);
  });

  it('should return 100 when all tiles cleared', () => {
    const states = makeTileStates(2, [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
    ]);
    expect(getBoardClearPercentage(states)).toBe(100);
  });
});

describe('isBoardFullyCleared', () => {
  it('should return false when tiles remain', () => {
    const states = makeTileStates(2, [{ row: 0, col: 0 }]);
    expect(isBoardFullyCleared(states)).toBe(false);
  });

  it('should return true when all tiles cleared', () => {
    const states = makeTileStates(2, [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
    ]);
    expect(isBoardFullyCleared(states)).toBe(true);
  });
});
