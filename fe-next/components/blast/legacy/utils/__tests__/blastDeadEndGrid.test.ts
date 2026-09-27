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
    // Ice was un-gated on 2026-06-13 (THAWABLE_TYPES = {frozen} only): it now
    // spawns directly-selectable/meltable. So ice must NOT be masked — masking a
    // selectable tile makes the detector fire a FALSE dead-end when only
    // ice-routed words remain. Only unthawed `frozen` (the frost vault) is blocked.
    it('exposes ice tiles (directly selectable since 2026-06-13)', () => {
      const grid = [['A', 'B']];
      const tiles = [[tile({ type: 'ice', isThawed: false }), tile()]];
      const result = buildDeadEndGrid(grid, tiles);
      expect(result[0][0]).toBe('A');
    });

    it('masks unthawed frozen tiles as empty string', () => {
      const grid = [['A', 'B']];
      const tiles = [[tile({ type: 'frozen', isThawed: false }), tile()]];
      const result = buildDeadEndGrid(grid, tiles);
      expect(result[0][0]).toBe('');
    });

    it('exposes thawed frozen tiles (selectable after thaw)', () => {
      const grid = [['A', 'B']];
      const tiles = [[tile({ type: 'frozen', isThawed: true }), tile()]];
      const result = buildDeadEndGrid(grid, tiles);
      expect(result[0][0]).toBe('A');
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
