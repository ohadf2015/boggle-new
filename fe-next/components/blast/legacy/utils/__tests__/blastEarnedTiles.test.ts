/**
 * Tests for earned tile creation — players create specials through word length.
 */
import { earnTileUpgrade, WORD_LENGTH_REWARDS } from '../blastEarnedTiles';
import type { BlastTileState } from '@/shared/types/blast';

function makeTile(row: number, col: number, type: BlastTileState['type'] = 'standard'): BlastTileState {
  return { row, col, type, isCleared: false, activationEffect: null, hitsRemaining: 0, uid: `t-${row}-${col}` };
}

function makeGrid(size: number): BlastTileState[][] {
  return Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => makeTile(r, c))
  );
}

describe('WORD_LENGTH_REWARDS', () => {
  it('defines rewards for 5, 6, and 7+ letter words', () => {
    expect(WORD_LENGTH_REWARDS[5]).toBeDefined();
    expect(WORD_LENGTH_REWARDS[6]).toBeDefined();
    expect(WORD_LENGTH_REWARDS[7]).toBeDefined();
  });

  it('does not define rewards for words shorter than 5', () => {
    expect(WORD_LENGTH_REWARDS[4]).toBeUndefined();
    expect(WORD_LENGTH_REWARDS[3]).toBeUndefined();
  });
});

describe('earnTileUpgrade', () => {
  it('upgrades a standard tile for a 5-letter word', () => {
    const grid = makeGrid(5);
    const path = [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }, { row: 0, col: 4 }];
    const result = earnTileUpgrade(grid, path, 5, 1);

    expect(result).not.toBeNull();
    if (result) {
      const upgradedTile = grid[result.row][result.col];
      expect(upgradedTile.type).not.toBe('standard');
      expect(WORD_LENGTH_REWARDS[5]).toContain(upgradedTile.type);
    }
  });

  it('returns null for a 4-letter word', () => {
    const grid = makeGrid(5);
    const path = [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }];
    const result = earnTileUpgrade(grid, path, 4, 1);
    expect(result).toBeNull();
  });

  it('does NOT upgrade tiles that are in the word path', () => {
    const grid = makeGrid(5);
    // Fill entire grid with standard tiles, path uses row 0
    const path = Array.from({ length: 5 }, (_, c) => ({ row: 0, col: c }));
    const result = earnTileUpgrade(grid, path, 5, 1);

    if (result) {
      const isInPath = path.some(p => p.row === result.row && p.col === result.col);
      expect(isInPath).toBe(false);
    }
  });

  it('does NOT upgrade tiles that are already special', () => {
    const grid = makeGrid(5);
    // Make all non-path tiles special
    for (let r = 1; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        grid[r][c].type = 'bomb';
      }
    }
    const path = Array.from({ length: 5 }, (_, c) => ({ row: 0, col: c }));
    const result = earnTileUpgrade(grid, path, 5, 1);
    // No standard tiles available outside the path
    expect(result).toBeNull();
  });

  it('does NOT upgrade cleared tiles', () => {
    const grid = makeGrid(5);
    // Clear all non-path tiles
    for (let r = 1; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        grid[r][c].isCleared = true;
      }
    }
    const path = Array.from({ length: 5 }, (_, c) => ({ row: 0, col: c }));
    const result = earnTileUpgrade(grid, path, 5, 1);
    expect(result).toBeNull();
  });

  it('sets activationEffect to tile-earned on the upgraded tile', () => {
    const grid = makeGrid(5);
    const path = [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }, { row: 0, col: 4 }];
    const result = earnTileUpgrade(grid, path, 5, 1);

    if (result) {
      expect(grid[result.row][result.col].activationEffect).toBe('tile-earned');
    }
  });

  it('upgrades to a stronger tile for 6-letter words', () => {
    const grid = makeGrid(6);
    const path = Array.from({ length: 6 }, (_, c) => ({ row: 0, col: c }));
    const result = earnTileUpgrade(grid, path, 6, 1);

    if (result) {
      expect(WORD_LENGTH_REWARDS[6]).toContain(grid[result.row][result.col].type);
    }
  });

  it('upgrades to a powerful tile for 7+ letter words', () => {
    const grid = makeGrid(7);
    const path = Array.from({ length: 7 }, (_, c) => ({ row: 0, col: c }));
    const result = earnTileUpgrade(grid, path, 7, 1);

    if (result) {
      expect(WORD_LENGTH_REWARDS[7]).toContain(grid[result.row][result.col].type);
    }
  });
});
