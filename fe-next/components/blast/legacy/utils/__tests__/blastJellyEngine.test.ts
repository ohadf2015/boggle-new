import { describe, it, expect } from 'vitest';
import { decrementJellyForWord, countJelly } from '../blastJellyEngine';
import type { BlastTileState } from '@/shared/types/blast';

const cell = (overrides: Partial<BlastTileState>): BlastTileState => ({
  uid: 'u', row: 0, col: 0, type: 'standard', isCleared: false,
  activationEffect: null, hitsRemaining: 1, ...overrides,
});

describe('blastJellyEngine.decrementJellyForWord', () => {
  it('decrements jelly by 1 per cell used', () => {
    const grid = [[
      cell({ uid: 'a', row: 0, col: 0, jellyLayers: 2 }),
      cell({ uid: 'b', row: 0, col: 1, jellyLayers: 1 }),
    ]];
    const next = decrementJellyForWord(grid, [{ row: 0, col: 0 }, { row: 0, col: 1 }]);
    expect(next[0][0].jellyLayers).toBe(1);
    expect(next[0][1].jellyLayers).toBe(0);
  });

  it('ignores cells with no jelly', () => {
    const grid = [[cell({ uid: 'a' }), cell({ uid: 'b', row: 0, col: 1, jellyLayers: 1 })]];
    const next = decrementJellyForWord(grid, [{ row: 0, col: 0 }, { row: 0, col: 1 }]);
    expect(next[0][0].jellyLayers).toBeUndefined();
    expect(next[0][1].jellyLayers).toBe(0);
  });

  it('does not mutate input grid', () => {
    const grid = [[cell({ uid: 'a', jellyLayers: 2 })]];
    decrementJellyForWord(grid, [{ row: 0, col: 0 }]);
    expect(grid[0][0].jellyLayers).toBe(2);
  });

  it('skips out-of-bounds cells safely', () => {
    const grid = [[cell({ uid: 'a', jellyLayers: 1 })]];
    const next = decrementJellyForWord(grid, [{ row: 5, col: 5 }, { row: 0, col: 0 }]);
    expect(next[0][0].jellyLayers).toBe(0);
  });
});

describe('blastJellyEngine.countJelly', () => {
  it('counts cells with jellyLayers > 0', () => {
    const grid = [
      [cell({ uid: 'a', jellyLayers: 2 }), cell({ uid: 'b', row: 0, col: 1, jellyLayers: 0 })],
      [cell({ uid: 'c', row: 1, col: 0, jellyLayers: 1 }), cell({ uid: 'd', row: 1, col: 1 })],
    ];
    expect(countJelly(grid)).toBe(2);
  });

  it('returns 0 when grid has no jelly', () => {
    const grid = [[cell({ uid: 'a' }), cell({ uid: 'b', row: 0, col: 1 })]];
    expect(countJelly(grid)).toBe(0);
  });
});
