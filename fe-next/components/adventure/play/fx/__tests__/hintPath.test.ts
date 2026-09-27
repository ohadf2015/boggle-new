import { describe, it, expect } from 'vitest';
import { hintCells, resolveHitPath } from '../hintPath';

const grid = [
  ['c', 'a', 'x'],
  ['q', 't', 's'],
  ['z', 'z', 'z'],
];

describe('hintCells', () => {
  it('given a first hint, when computed, then it returns the first 2 real tiles of the word', () => {
    expect(hintCells('cats', grid, 'en', false)).toEqual([{ row: 0, col: 0 }, { row: 0, col: 1 }]);
  });
  it('given the full-reveal relic, then it returns the whole path in order', () => {
    expect(hintCells('cats', grid, 'en', true)).toEqual([
      { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }, { row: 1, col: 2 },
    ]);
  });
  it('given a word not on the board, then nothing lights', () => {
    expect(hintCells('dog', grid, 'en', true)).toEqual([]);
  });
  it('is case-insensitive against an uppercase board', () => {
    const up = grid.map((r) => r.map((c) => c.toUpperCase()));
    expect(hintCells('cats', up, 'en', false)).toHaveLength(2);
  });
});

describe('resolveHitPath', () => {
  it('given the traced path spells the word, then the traced path wins', () => {
    const traced = [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }];
    expect(resolveHitPath('cat', traced, grid, 'en')).toEqual(traced);
  });
  it('given a stale/mismatched traced path, then it falls back to solving the board', () => {
    const traced = [{ row: 2, col: 0 }];
    expect(resolveHitPath('cat', traced, grid, 'en')).toEqual([{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }]);
  });
  it('given no path at all, then empty', () => {
    expect(resolveHitPath('dog', null, grid, 'en')).toEqual([]);
  });
});
