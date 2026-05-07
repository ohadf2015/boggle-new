/**
 * blastDeadEndGrid - Tests for grid masking used in dead-end detection
 *
 * Validates that buildDeadEndGrid correctly masks ALL unselectable tile types
 * so that hasValidWords only sees letters that can actually be played.
 */

import { buildDeadEndGrid } from '../blastDeadEndGrid';
import type { BlastTileState } from '../../types';

const tile = (overrides: Partial<BlastTileState> = {}): BlastTileState => ({
  type: 'standard',
  isCleared: false,
  isThawed: false,
  isUnlocked: false,
  ...overrides,
} as BlastTileState);

describe('buildDeadEndGrid', () => {
  describe('cleared tiles', () => {
    it('masks cleared tiles as empty string', () => {
      const grid = [['A', 'B']];
      const tiles = [[tile({ isCleared: true }), tile()]];
      const result = buildDeadEndGrid(grid, tiles);
      expect(result[0][0]).toBe('');
      expect(result[0][1]).toBe('B');
    });
  });

  describe('ice and frozen tiles', () => {
    it('masks unthawed ice tiles as empty string', () => {
      const grid = [['A', 'B']];
      const tiles = [[tile({ type: 'ice', isThawed: false }), tile()]];
      const result = buildDeadEndGrid(grid, tiles);
      expect(result[0][0]).toBe('');
    });

    it('masks unthawed frozen tiles as empty string', () => {
      const grid = [['A', 'B']];
      const tiles = [[tile({ type: 'frozen', isThawed: false }), tile()]];
      const result = buildDeadEndGrid(grid, tiles);
      expect(result[0][0]).toBe('');
    });

    it('exposes thawed ice tiles (selectable after thaw)', () => {
      const grid = [['A', 'B']];
      const tiles = [[tile({ type: 'ice', isThawed: true }), tile()]];
      const result = buildDeadEndGrid(grid, tiles);
      expect(result[0][0]).toBe('A');
    });
  });

  describe('locked tiles — BUG regression', () => {
    it('masks unselectable locked tiles as empty string', () => {
      const grid = [['C', 'A', 'T']];
      const tiles = [
        [
          tile({ type: 'locked', isUnlocked: false }),
          tile(),
          tile(),
        ],
      ];
      const result = buildDeadEndGrid(grid, tiles);
      // 'C' under a locked tile must be hidden from DFS
      expect(result[0][0]).toBe('');
      expect(result[0][1]).toBe('A');
      expect(result[0][2]).toBe('T');
    });

    it('exposes unlocked locked tiles (key was collected)', () => {
      const grid = [['C', 'A', 'T']];
      const tiles = [
        [
          tile({ type: 'locked', isUnlocked: true }),
          tile(),
          tile(),
        ],
      ];
      const result = buildDeadEndGrid(grid, tiles);
      expect(result[0][0]).toBe('C');
    });

    it('dead-end: grid where only words traverse locked tiles returns all empty', () => {
      // 2×2 grid where the only paths for a word go through a locked tile
      // 'C'=locked, 'A'=normal, 'T'=normal, 'S'=locked
      // Only possible 2-letter combos: A-T, T-A (not in dict)
      // "CAT" requires C which is locked → must not count
      const grid = [
        ['C', 'A'],
        ['T', 'S'],
      ];
      const tiles = [
        [
          tile({ type: 'locked', isUnlocked: false }),
          tile(),
        ],
        [
          tile(),
          tile({ type: 'locked', isUnlocked: false }),
        ],
      ];
      const result = buildDeadEndGrid(grid, tiles);
      expect(result[0][0]).toBe('');
      expect(result[0][1]).toBe('A');
      expect(result[1][0]).toBe('T');
      expect(result[1][1]).toBe('');
    });
  });

  describe('standard selectable tiles', () => {
    it('passes through standard tile letters unchanged', () => {
      const grid = [['X', 'Y', 'Z']];
      const tiles = [[tile(), tile(), tile()]];
      const result = buildDeadEndGrid(grid, tiles);
      expect(result[0]).toEqual(['X', 'Y', 'Z']);
    });

    it('passes through special types that are selectable (bomb, gem, etc.)', () => {
      const grid = [['B', 'G']];
      const tiles = [[tile({ type: 'bomb' }), tile({ type: 'gem' })]];
      const result = buildDeadEndGrid(grid, tiles);
      expect(result[0][0]).toBe('B');
      expect(result[0][1]).toBe('G');
    });
  });

  describe('missing tile state', () => {
    it('returns empty string when tile state is missing for a cell', () => {
      const grid = [['A', 'B']];
      const tiles: BlastTileState[][] = [[]]; // no entries
      const result = buildDeadEndGrid(grid, tiles);
      expect(result[0][0]).toBe('');
      expect(result[0][1]).toBe('');
    });
  });
});
