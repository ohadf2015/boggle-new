import { describe, it, expect } from 'vitest';
import { createBag, type TileBag } from '../tileBag';
import {
  createGrid,
  cellAt,
  cellIdFor,
  setCellLetter,
  type CascadeGrid,
} from '../cascade/boardGrid';
import { burnCells, applyGravity } from '../cascade/burnAndGravity';

const freshBag = (seed: number) => createBag({ seed, locale: 'en' });

function snapshot(grid: CascadeGrid): string[][] {
  const out: string[][] = [];
  for (let r = 0; r < grid.rows; r++) {
    const row: string[] = [];
    for (let c = 0; c < grid.cols; c++) {
      row.push(cellAt(grid, r, c)!.letter ?? '·');
    }
    out.push(row);
  }
  return out;
}

describe('cascade/burnAndGravity', () => {
  describe('burnCells', () => {
    it('marks listed cells as empty (letter null)', () => {
      const grid = createGrid(3, 3, freshBag(1));
      const ids = [cellAt(grid, 0, 0)!.id, cellAt(grid, 1, 1)!.id];
      const next = burnCells(grid, ids);

      expect(cellAt(next, 0, 0)!.letter).toBeNull();
      expect(cellAt(next, 1, 1)!.letter).toBeNull();
      // Untouched cell still has letter
      expect(cellAt(next, 2, 2)!.letter).not.toBeNull();
    });

    it('does not mutate input grid', () => {
      const grid = createGrid(3, 3, freshBag(1));
      const before = snapshot(grid);
      const ids = [cellAt(grid, 0, 0)!.id];
      burnCells(grid, ids);
      expect(snapshot(grid)).toEqual(before);
    });

    it('preserves cell ids (positional)', () => {
      const grid = createGrid(3, 3, freshBag(1));
      const next = burnCells(grid, [cellAt(grid, 0, 0)!.id]);
      expect(cellAt(next, 0, 0)!.id).toBe(cellIdFor(0, 0));
    });

    it('is a no-op for empty id list', () => {
      const grid = createGrid(3, 3, freshBag(1));
      const next = burnCells(grid, []);
      expect(snapshot(next)).toEqual(snapshot(grid));
    });

    it('silently ignores unknown ids', () => {
      const grid = createGrid(3, 3, freshBag(1));
      const next = burnCells(grid, ['bogus']);
      expect(snapshot(next)).toEqual(snapshot(grid));
    });
  });

  describe('applyGravity', () => {
    function makeFixedGrid(bag: TileBag): CascadeGrid {
      // 3x3 grid filled deterministically
      return createGrid(3, 3, bag);
    }

    it('drops upper letters down into burned slots, top spawns from bag', () => {
      const bag = freshBag(7);
      const grid = makeFixedGrid(bag);

      // Capture pre-burn column 0 letters
      const before = [
        cellAt(grid, 0, 0)!.letter,
        cellAt(grid, 1, 0)!.letter,
        cellAt(grid, 2, 0)!.letter,
      ];

      // Burn bottom of col 0
      const burned = burnCells(grid, [cellAt(grid, 2, 0)!.id]);
      const { grid: g2, spawnedCellIds } = applyGravity(burned, bag);

      // Col 0 after: [spawnedTop, before[0], before[1]]
      expect(cellAt(g2, 1, 0)!.letter).toBe(before[0]);
      expect(cellAt(g2, 2, 0)!.letter).toBe(before[1]);
      expect(cellAt(g2, 0, 0)!.letter).not.toBeNull();
      expect(spawnedCellIds).toEqual([cellIdFor(0, 0)]);
    });

    it('mid-column hole pulls everything above downward', () => {
      const bag = freshBag(11);
      const grid = makeFixedGrid(bag);
      const before = [
        cellAt(grid, 0, 0)!.letter,
        cellAt(grid, 1, 0)!.letter,
        cellAt(grid, 2, 0)!.letter,
      ];

      // Burn middle of col 0
      const burned = burnCells(grid, [cellAt(grid, 1, 0)!.id]);
      const { grid: g2 } = applyGravity(burned, bag);

      // Col 0: [spawned, before[0], before[2]]
      expect(cellAt(g2, 1, 0)!.letter).toBe(before[0]);
      expect(cellAt(g2, 2, 0)!.letter).toBe(before[2]);
      expect(cellAt(g2, 0, 0)!.letter).not.toBeNull();
    });

    it('multiple burns in same column collapse cleanly', () => {
      const bag = freshBag(15);
      const grid = makeFixedGrid(bag);
      const before = [
        cellAt(grid, 0, 0)!.letter,
        cellAt(grid, 1, 0)!.letter,
        cellAt(grid, 2, 0)!.letter,
      ];
      const burned = burnCells(grid, [
        cellAt(grid, 0, 0)!.id,
        cellAt(grid, 1, 0)!.id,
      ]);
      const { grid: g2, spawnedCellIds } = applyGravity(burned, bag);

      expect(cellAt(g2, 2, 0)!.letter).toBe(before[2]);
      expect(cellAt(g2, 0, 0)!.letter).not.toBeNull();
      expect(cellAt(g2, 1, 0)!.letter).not.toBeNull();
      // Two new spawns
      expect(spawnedCellIds).toHaveLength(2);
    });

    it('does not affect columns without burns', () => {
      const bag = freshBag(21);
      const grid = makeFixedGrid(bag);
      const colBeforeAll: string[] = [];
      for (let r = 0; r < 3; r++) colBeforeAll.push(cellAt(grid, r, 1)!.letter!);

      const burned = burnCells(grid, [cellAt(grid, 2, 0)!.id]);
      const { grid: g2 } = applyGravity(burned, bag);

      for (let r = 0; r < 3; r++) {
        expect(cellAt(g2, r, 1)!.letter).toBe(colBeforeAll[r]);
      }
    });

    it('returns spawnedCellIds in top-down order per column', () => {
      const bag = freshBag(99);
      const grid = makeFixedGrid(bag);
      // Burn entire column 0
      const burned = burnCells(grid, [
        cellAt(grid, 0, 0)!.id,
        cellAt(grid, 1, 0)!.id,
        cellAt(grid, 2, 0)!.id,
      ]);
      const { spawnedCellIds } = applyGravity(burned, bag);
      expect(spawnedCellIds).toEqual([cellIdFor(0, 0), cellIdFor(1, 0), cellIdFor(2, 0)]);
    });

    it('throws when bag is empty and spawn is needed', () => {
      const bag = freshBag(1);
      const grid = createGrid(3, 3, bag);
      // Drain bag manually so spawn would have to come from empty
      while (bag.tiles.length > 0) bag.tiles.shift();

      const burned = burnCells(grid, [cellAt(grid, 0, 0)!.id]);
      expect(() => applyGravity(burned, bag)).toThrow(/bag empty/i);
    });

    it('is a no-op when no cells are burned', () => {
      const bag = freshBag(33);
      const grid = makeFixedGrid(bag);
      const before = snapshot(grid);
      const { grid: g2, spawnedCellIds } = applyGravity(grid, bag);
      expect(snapshot(g2)).toEqual(before);
      expect(spawnedCellIds).toEqual([]);
    });
  });

  describe('determinism', () => {
    it('same seed + same burn pattern → same post-gravity grid', () => {
      const make = () => {
        const bag = freshBag(555);
        const grid = createGrid(3, 3, bag);
        const burned = burnCells(grid, [
          cellAt(grid, 2, 0)!.id,
          cellAt(grid, 1, 1)!.id,
        ]);
        return applyGravity(burned, bag).grid;
      };
      expect(snapshot(make())).toEqual(snapshot(make()));
    });
  });

  describe('setCellLetter (boardGrid helper)', () => {
    it('mutates a cell letter in place while preserving id', () => {
      const grid = createGrid(2, 2, freshBag(1));
      const idBefore = cellAt(grid, 0, 0)!.id;
      setCellLetter(grid, 0, 0, 'Z', 10);
      expect(cellAt(grid, 0, 0)!.letter).toBe('Z');
      expect(cellAt(grid, 0, 0)!.value).toBe(10);
      expect(cellAt(grid, 0, 0)!.id).toBe(idBefore);
    });
  });
});
