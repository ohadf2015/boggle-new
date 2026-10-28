/**
 * Tests for bomb/coin effects in clearTilesProcessor.processTilesForWord.
 */
import { processTilesForWord, type TileProcessingInput } from '../utils/clearTilesProcessor';
import type { BlastTileState } from '@/shared/types/blast';
import { GOLD_BONUS_MOVES, GOLD_MULTIPLIER, BOMB_AREA_CLEAR_BONUS } from '../types';

/** Create a standard tile */
function tile(row: number, col: number, type: BlastTileState['type'] = 'standard'): BlastTileState {
  return {
    uid: `${row}-${col}`,
    row, col, type,
    isCleared: false,
    activationEffect: null,
    hitsRemaining: 0,
  };
}

/** Build a gridSize×gridSize grid of standard tiles */
function makeGrid(gridSize: number, overrides?: Array<{ row: number; col: number; tile: Partial<BlastTileState> }>): BlastTileState[][] {
  const grid: BlastTileState[][] = [];
  for (let r = 0; r < gridSize; r++) {
    grid[r] = [];
    for (let c = 0; c < gridSize; c++) {
      grid[r][c] = tile(r, c);
    }
  }
  for (const o of overrides ?? []) {
    grid[o.row][o.col] = tile(o.row, o.col, (o.tile.type ?? 'standard') as BlastTileState['type']);
  }
  return grid;
}

function makeInput(grid: BlastTileState[][], path: Array<{ row: number; col: number }>, word: string, opts?: Partial<TileProcessingInput>): TileProcessingInput {
  return {
    prev: grid,
    path,
    word,
    baseScore: 10,
    gridSize: grid.length,
    currentWave: 1,
    preDetectedCombos: [],
    ...opts,
  };
}

describe('processTilesForWord — tile effects', () => {
  describe('gold tile: bonus moves', () => {
    it('awards GOLD_BONUS_MOVES per gold tile in word', () => {
      const grid = makeGrid(4, [
        { row: 0, col: 0, tile: { type: 'gold' } },
        { row: 0, col: 1, tile: { type: 'gold' } },
      ]);
      const path = [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }];
      const result = processTilesForWord(makeInput(grid, path, 'ABC'));
      // 2 gold tiles * GOLD_BONUS_MOVES + word-length bonus (3 letters = 0 from calculateBonusMoves)
      expect(result.bonusMoveCount).toBeGreaterThanOrEqual(2 * GOLD_BONUS_MOVES);
    });
  });

  describe('gold tile: score multiplier', () => {
    it('multiplies the word score by GOLD_MULTIPLIER', () => {
      const grid = makeGrid(4, [{ row: 0, col: 1, tile: { type: 'gold' } }]);
      const path = [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }];
      expect(processTilesForWord(makeInput(grid, path, 'abc')).totalScore).toBe(10 * GOLD_MULTIPLIER);
    });
  });

  describe('bomb tile: 3x3 clear', () => {
    it('clears the eight neighbours and pays BOMB_AREA_CLEAR_BONUS each', () => {
      const grid = makeGrid(4, [{ row: 1, col: 1, tile: { type: 'bomb' } }]);
      const path = [{ row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }];
      const result = processTilesForWord(makeInput(grid, path, 'abc'));
      for (let r = 0; r <= 2; r++) for (let c = 0; c <= 2; c++) expect(result.next[r][c].isCleared).toBe(true);
      expect(result.next[3][3].isCleared).toBe(false);
      expect(result.totalScore).toBe(10 + 6 * BOMB_AREA_CLEAR_BONUS);
    });

    it('chains into a bomb caught in the blast', () => {
      const grid = makeGrid(5, [{ row: 0, col: 0, tile: { type: 'bomb' } }, { row: 1, col: 1, tile: { type: 'bomb' } }]);
      const result = processTilesForWord(makeInput(grid, [{ row: 0, col: 0 }, { row: 0, col: 1 }], 'ab'));
      expect(result.next[2][2].isCleared).toBe(true);
    });
  });
});
