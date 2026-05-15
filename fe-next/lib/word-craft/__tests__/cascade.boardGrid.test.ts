import { describe, it, expect } from 'vitest';
import { createBag } from '../tileBag';
import {
  createGrid,
  cellAt,
  coordsOf,
  neighborsOf,
  cellCount,
} from '../cascade/boardGrid';

describe('cascade/boardGrid', () => {
  describe('createGrid', () => {
    it('builds a rows×cols grid filled with letters from a seeded bag', () => {
      const bag = createBag({ seed: 42, locale: 'en' });
      const grid = createGrid(7, 7, bag);

      expect(grid.rows).toBe(7);
      expect(grid.cols).toBe(7);
      expect(grid.cells.length).toBe(49);
      // Every cell has a unique id and a non-empty letter
      const ids = grid.cells.map((c) => c.id);
      expect(new Set(ids).size).toBe(49);
      for (const cell of grid.cells) {
        expect(typeof cell.letter).toBe('string');
        expect(cell.letter.length).toBeGreaterThan(0);
      }
    });

    it('is deterministic for the same seed', () => {
      const a = createGrid(7, 7, createBag({ seed: 99, locale: 'en' }));
      const b = createGrid(7, 7, createBag({ seed: 99, locale: 'en' }));
      expect(a.cells.map((c) => c.letter)).toEqual(b.cells.map((c) => c.letter));
    });

    it('supports 9×9 size', () => {
      const grid = createGrid(9, 9, createBag({ seed: 1, locale: 'en' }));
      expect(grid.cells.length).toBe(81);
      expect(cellCount(grid)).toBe(81);
    });

    it('throws when bag does not have enough tiles', () => {
      const bag = createBag({ seed: 1, locale: 'en', bagSize: 5 });
      expect(() => createGrid(7, 7, bag)).toThrow(/insufficient tiles/i);
    });
  });

  describe('cellAt / coordsOf', () => {
    it('round-trips between row/col and cell id', () => {
      const grid = createGrid(7, 7, createBag({ seed: 7, locale: 'en' }));
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          const cell = cellAt(grid, r, c);
          expect(cell).toBeDefined();
          expect(coordsOf(grid, cell!.id)).toEqual({ row: r, col: c });
        }
      }
    });

    it('returns null for out-of-bounds coords', () => {
      const grid = createGrid(7, 7, createBag({ seed: 7, locale: 'en' }));
      expect(cellAt(grid, -1, 0)).toBeNull();
      expect(cellAt(grid, 0, -1)).toBeNull();
      expect(cellAt(grid, 7, 0)).toBeNull();
      expect(cellAt(grid, 0, 7)).toBeNull();
    });

    it('returns null for unknown cell id', () => {
      const grid = createGrid(7, 7, createBag({ seed: 7, locale: 'en' }));
      expect(coordsOf(grid, 'nope-nope')).toBeNull();
    });
  });

  describe('neighborsOf', () => {
    it('returns 4 orthogonal neighbors for an interior cell', () => {
      const grid = createGrid(7, 7, createBag({ seed: 3, locale: 'en' }));
      const center = cellAt(grid, 3, 3)!;
      const ids = neighborsOf(grid, center.id).map((c) => c.id);
      expect(ids).toHaveLength(4);
      const coords = ids.map((id) => coordsOf(grid, id)!);
      expect(coords).toEqual(
        expect.arrayContaining([
          { row: 2, col: 3 },
          { row: 4, col: 3 },
          { row: 3, col: 2 },
          { row: 3, col: 4 },
        ])
      );
    });

    it('returns 2 neighbors for a corner', () => {
      const grid = createGrid(7, 7, createBag({ seed: 3, locale: 'en' }));
      const corner = cellAt(grid, 0, 0)!;
      const ids = neighborsOf(grid, corner.id);
      expect(ids).toHaveLength(2);
    });

    it('returns 3 neighbors for an edge', () => {
      const grid = createGrid(7, 7, createBag({ seed: 3, locale: 'en' }));
      const edge = cellAt(grid, 0, 3)!;
      const ids = neighborsOf(grid, edge.id);
      expect(ids).toHaveLength(3);
    });

    it('returns 8 neighbors with diagonal=true for an interior cell', () => {
      const grid = createGrid(7, 7, createBag({ seed: 3, locale: 'en' }));
      const center = cellAt(grid, 3, 3)!;
      const ids = neighborsOf(grid, center.id, { diagonal: true });
      expect(ids).toHaveLength(8);
    });

    it('returns 3 neighbors with diagonal=true for a corner', () => {
      const grid = createGrid(7, 7, createBag({ seed: 3, locale: 'en' }));
      const corner = cellAt(grid, 0, 0)!;
      const ids = neighborsOf(grid, corner.id, { diagonal: true });
      expect(ids).toHaveLength(3);
    });

    it('returns empty array for unknown cell id', () => {
      const grid = createGrid(7, 7, createBag({ seed: 3, locale: 'en' }));
      expect(neighborsOf(grid, 'bogus')).toEqual([]);
    });
  });
});
