import { describe, it, expect } from 'vitest';
import { starCells, modifierRingCenters, WORDCRAFT_MODIFIERS, isGoldenTile } from '../modifiers';

const place = (row: number, col: number, id = 't1') => ({ row, col, letter: 'a', value: 1, isBlank: false, rackTileId: id });

describe('starCells', () => {
  it('is deterministic per seed and board size', () => {
    expect(starCells(42, 7)).toEqual(starCells(42, 7));
    expect(starCells(42, 7)).not.toEqual(starCells(43, 7));
  });
  it('gives 4 distinct in-bounds cells away from the very edge', () => {
    for (const size of [7, 11, 13, 15]) {
      for (let seed = 1; seed <= 30; seed++) {
        const cells = starCells(seed, size);
        expect(cells).toHaveLength(4);
        expect(new Set(cells.map((c) => `${c.row},${c.col}`)).size).toBe(4);
        for (const c of cells) {
          expect(c.row).toBeGreaterThanOrEqual(1);
          expect(c.col).toBeGreaterThanOrEqual(1);
          expect(c.row).toBeLessThanOrEqual(size - 2);
          expect(c.col).toBeLessThanOrEqual(size - 2);
        }
      }
    }
  });
});

describe('modifierRingCenters', () => {
  it('is a registered modifier', () => {
    expect(WORDCRAFT_MODIFIERS).toContain('star_squares');
  });
  it('star_squares: only placements on a star cell are ring centers', () => {
    const stars = starCells(9, 7);
    const on = place(stars[0].row, stars[0].col, 'a');
    const off = place(stars[0].row === 1 ? 2 : 1, stars[0].col === 1 ? 2 : 1, 'b');
    const centers = modifierRingCenters('star_squares', 9, 7, [on, off]);
    expect(centers).toEqual([{ row: on.row, col: on.col }]);
  });
  it('golden_tiles: golden tile ids are ring centers', () => {
    const ids = Array.from({ length: 60 }, (_, i) => `tile-${i}`);
    const gold = ids.find((id) => isGoldenTile(5, id))!;
    const plain = ids.find((id) => !isGoldenTile(5, id))!;
    const centers = modifierRingCenters('golden_tiles', 5, 7, [place(1, 1, gold), place(1, 2, plain)]);
    expect(centers).toEqual([{ row: 1, col: 1 }]);
  });
  it('other modifiers have no ring centers', () => {
    expect(modifierRingCenters('none', 1, 7, [place(1, 1)])).toBeUndefined();
    expect(modifierRingCenters('land_grab', 1, 7, [place(1, 1)])).toBeUndefined();
  });
});
