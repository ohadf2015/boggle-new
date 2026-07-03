import { describe, expect, it } from 'vitest';
import { isGoldenTile } from '../modifiers';
import { resolveCaptures } from '../territory';
import { createBoard } from '../board';
import type { PlacedTile } from '../types';

describe('isGoldenTile', () => {
  it('is deterministic for the same seed+id', () => {
    expect(isGoldenTile(42, 't-10')).toBe(isGoldenTile(42, 't-10'));
  });

  it('varies by seed', () => {
    const a = Array.from({ length: 100 }, (_, i) => isGoldenTile(1, `t-${i}`)).join('');
    const b = Array.from({ length: 100 }, (_, i) => isGoldenTile(2, `t-${i}`)).join('');
    expect(a).not.toBe(b);
  });

  it('marks roughly 1 in 6 tiles golden (10–25% over 600 ids)', () => {
    let golden = 0;
    for (let i = 0; i < 600; i++) if (isGoldenTile(42, `t-${i}`)) golden++;
    expect(golden).toBeGreaterThan(60);
    expect(golden).toBeLessThan(150);
  });
});

describe('resolveCaptures ringCenters', () => {
  it('captures opponent cells around a ring center even when no word crosses them', () => {
    const board = createBoard(15, { premiums: false });
    const stamp = (r: number, c: number) => {
      board.cells[r][c].tile = { row: r, col: c, letter: 'B', value: 3, isBlank: false, rackTileId: `b-${r}-${c}` };
      board.cells[r][c].claim = 'bot';
    };
    stamp(7, 6);
    const placements: PlacedTile[] = [
      { row: 7, col: 7, letter: 'A', value: 1, isBlank: false, rackTileId: 't-1' },
      { row: 8, col: 7, letter: 'T', value: 1, isBlank: false, rackTileId: 't-2' },
    ];
    const words = [[{ row: 7, col: 7 }, { row: 8, col: 7 }]];
    const without = resolveCaptures(board, placements, words, 'player', {});
    expect(without.capturedCells).toHaveLength(0);
    const withRing = resolveCaptures(board, placements, words, 'player', { ringCenters: [{ row: 7, col: 7 }] });
    expect(withRing.capturedCells).toEqual([{ row: 7, col: 6 }]);
    expect(withRing.bonus).toBe(3);
  });

  it('never captures own or unclaimed cells', () => {
    const board = createBoard(15, { premiums: false });
    board.cells[7][6].tile = { row: 7, col: 6, letter: 'B', value: 3, isBlank: false, rackTileId: 'p-1' };
    board.cells[7][6].claim = 'player';
    const placements: PlacedTile[] = [
      { row: 7, col: 7, letter: 'A', value: 1, isBlank: false, rackTileId: 't-1' },
    ];
    const r = resolveCaptures(board, placements, [[{ row: 7, col: 7 }]], 'player', { ringCenters: [{ row: 7, col: 7 }] });
    expect(r.capturedCells).toHaveLength(0);
  });
});
