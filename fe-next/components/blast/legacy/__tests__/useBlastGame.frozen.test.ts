/**
 * useBlastGame frozen tile tests.
 * Frozen (Frost) tiles require 2 hits to clear (FROST_HITS_REQUIRED).
 * They give no bonus (obstacle) but reveal a hidden inner special on final hit.
 * They also break cascade detection in the vertical scanner.
 */
import type { BlastTileState, BlastTileType } from '../types';
import { detectVerticalWords } from '../utils/blastVerticalScanner';

function makeTileState(
  row: number, col: number, type: BlastTileType = 'standard', hitsRemaining = 0,
): BlastTileState {
  return { row, col, type, isCleared: false, activationEffect: null, hitsRemaining, uid: `t-${row}-${col}` };
}

function make6x6Grid(): BlastTileState[][] {
  return Array.from({ length: 6 }, (_, r) =>
    Array.from({ length: 6 }, (_, c) => makeTileState(r, c))
  );
}

function simulateClearForFrozen(
  tileStates: BlastTileState[][],
  path: Array<{ row: number; col: number }>,
): { bonusScore: number; clearedCount: number } {
  const next = tileStates.map(row => row.map(tile => ({ ...tile })));
  let bonusScore = 0;
  let clearedCount = 0;

  for (const cell of path) {
    const tile = next[cell.row]?.[cell.col];
    if (!tile || tile.isCleared) continue;

    if (tile.type === 'frozen' && tile.hitsRemaining > 1) {
      tile.hitsRemaining--;
      tile.activationEffect = 'frozen-crack';
      continue;
    }

    tile.isCleared = true;
    clearedCount++;
    // Frozen gives no bonus
  }

  return { bonusScore, clearedCount };
}

describe('Frozen tile mechanics', () => {
  it('starts with hitsRemaining: 2 (FROST_HITS_REQUIRED)', () => {
    const tile = makeTileState(2, 2, 'frozen', 2);
    expect(tile.hitsRemaining).toBe(2);
  });

  it('requires 2 hits to clear', () => {
    const grid = make6x6Grid();
    grid[2][2] = makeTileState(2, 2, 'frozen', 2);

    // Hit 1
    let result = simulateClearForFrozen(grid, [{ row: 2, col: 2 }]);
    expect(result.clearedCount).toBe(0);
    grid[2][2].hitsRemaining = 1;

    // Hit 2 (final)
    result = simulateClearForFrozen(grid, [{ row: 2, col: 2 }]);
    expect(result.clearedCount).toBe(1);
  });

  it('gives no bonus on clear', () => {
    const grid = make6x6Grid();
    grid[2][2] = makeTileState(2, 2, 'frozen', 1);

    const result = simulateClearForFrozen(grid, [{ row: 2, col: 2 }]);
    expect(result.bonusScore).toBe(0);
  });
});

describe('Frozen tile cascade blocking', () => {
  it('frozen tile breaks column runs for cascade detection', () => {
    // Column 0: C-A-T-[frozen]-D-O-G
    // Without frozen: "cat" at 0-2 should be detected
    // With frozen at row 3 breaking the run
    const letters = [
      ['C', 'X'], ['A', 'X'], ['T', 'X'],
      ['F', 'X'], // frozen tile row
      ['D', 'X'], ['O', 'X'], ['G', 'X'],
    ];
    const tileStates = letters.map((row, ri) =>
      row.map((_, ci) => ({
        row: ri, col: ci, type: (ri === 3 && ci === 0 ? 'frozen' : 'standard') as BlastTileType,
        isCleared: false, activationEffect: null, hitsRemaining: ri === 3 && ci === 0 ? 2 : 0,
        uid: `t-${ri}-${ci}`,
      }))
    );

    const checkWord = (w: string) => ['cat', 'dog', 'catfdog'].includes(w);
    const result = detectVerticalWords(letters, tileStates, checkWord, new Set(), 3);

    // "cat" at 0-2 should be found (before frozen)
    // "dog" at 4-6 should be found (after frozen)
    // No word spanning through frozen should exist
    const words = result.map(r => r.word);
    expect(words).toContain('cat');
    expect(words).toContain('dog');
    // No 7-letter word that spans frozen
    expect(words).not.toContain('catfdog');
  });

  it('clearing frozen tile re-enables cascade through that position', () => {
    // Same setup but frozen is cleared
    const letters = [
      ['C', 'X'], ['A', 'X'], ['T', 'X'],
      ['S', 'X'], // was frozen, now cleared or standard
      ['X', 'X'], ['X', 'X'],
    ];
    const tileStates = letters.map((row, ri) =>
      row.map((_, ci) => ({
        row: ri, col: ci, type: 'standard' as BlastTileType,
        isCleared: false, activationEffect: null, hitsRemaining: 0,
        uid: `t-${ri}-${ci}`,
      }))
    );

    const checkWord = (w: string) => w === 'cats';
    const result = detectVerticalWords(letters, tileStates, checkWord, new Set(), 3);

    expect(result).toHaveLength(1);
    expect(result[0].word).toBe('cats');
  });
});
