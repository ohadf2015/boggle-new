import { describe, it, expect } from 'vitest';
import { rollGemCells, replenishGemCells, DEFAULT_TARGET_COUNT } from '../gemPlacement';
import { createBoard } from '../../board';
import { GEM_COLORS } from '../types';

describe('gems/gemPlacement', () => {
  describe('rollGemCells', () => {
    it('is deterministic for the same seed', () => {
      const board = createBoard(15);
      const a = rollGemCells({ board, occupied: new Set(), seed: 42 });
      const b = rollGemCells({ board, occupied: new Set(), seed: 42 });
      expect(a).toEqual(b);
    });

    it('rolls DEFAULT_TARGET_COUNT cells', () => {
      const board = createBoard(15);
      const cells = rollGemCells({ board, occupied: new Set(), seed: 7 });
      expect(cells).toHaveLength(DEFAULT_TARGET_COUNT);
    });

    it('does not overlap with occupied coordinates', () => {
      const board = createBoard(15);
      const occupied = new Set<string>(['7,7', '7,8', '8,7']);
      const cells = rollGemCells({ board, occupied, seed: 99 });
      for (const cell of cells) {
        expect(occupied.has(`${cell.row},${cell.col}`)).toBe(false);
      }
    });

    it('includes all 4 colors in default count', () => {
      const board = createBoard(15);
      const cells = rollGemCells({ board, occupied: new Set(), seed: 3 });
      const colors = new Set(cells.map((c) => c.color));
      for (const color of GEM_COLORS) {
        expect(colors.has(color)).toBe(true);
      }
    });

    it('rolls within board bounds', () => {
      const board = createBoard(11);
      const cells = rollGemCells({ board, occupied: new Set(), seed: 13 });
      for (const cell of cells) {
        expect(cell.row).toBeGreaterThanOrEqual(0);
        expect(cell.row).toBeLessThan(11);
        expect(cell.col).toBeGreaterThanOrEqual(0);
        expect(cell.col).toBeLessThan(11);
      }
    });

    it('rarity 1 is more common than rarity 3 over many rolls', () => {
      const board = createBoard(15);
      const tally = { 1: 0, 2: 0, 3: 0 };
      for (let seed = 0; seed < 60; seed++) {
        const cells = rollGemCells({ board, occupied: new Set(), seed });
        for (const c of cells) tally[c.rarity] += 1;
      }
      expect(tally[1]).toBeGreaterThan(tally[2]);
      expect(tally[2]).toBeGreaterThan(tally[3]);
    });

    it('assigns unique stable ids', () => {
      const board = createBoard(15);
      const cells = rollGemCells({ board, occupied: new Set(), seed: 1 });
      const ids = new Set(cells.map((c) => c.id));
      expect(ids.size).toBe(cells.length);
    });
  });

  describe('replenishGemCells', () => {
    it('tops up to target count without disturbing existing', () => {
      const board = createBoard(15);
      const existing = rollGemCells({ board, occupied: new Set(), seed: 11 });
      const survivors = existing.slice(0, 3); // pretend 5 were collected
      const occupied = new Set<string>(survivors.map((c) => `${c.row},${c.col}`));
      const next = replenishGemCells({ board, occupied, current: survivors, seed: 11 });
      expect(next.length).toBe(DEFAULT_TARGET_COUNT);
      for (const s of survivors) {
        expect(next.find((c) => c.id === s.id)).toBeTruthy();
      }
    });
  });
});
