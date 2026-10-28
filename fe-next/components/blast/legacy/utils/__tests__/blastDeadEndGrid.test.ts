/**
 * blastDeadEndGrid - Tests for grid masking used in dead-end detection
 *
 * Validates that buildDeadEndGrid masks cleared tiles so hasValidWords only
 * sees letters still on the board.
 */

import { buildDeadEndGrid } from '../blastDeadEndGrid';
import type { BlastTileState } from '../../types';

const tile = (overrides: Partial<BlastTileState> = {}): BlastTileState => ({
  type: 'standard',
  isCleared: false,
  hitsRemaining: 0,
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

  describe('standard selectable tiles', () => {
    it('passes through standard tile letters unchanged', () => {
      const grid = [['X', 'Y', 'Z']];
      const tiles = [[tile(), tile(), tile()]];
      const result = buildDeadEndGrid(grid, tiles);
      expect(result[0]).toEqual(['X', 'Y', 'Z']);
    });

    it('passes through special tiles (bomb, coin, diamond)', () => {
      const grid = [['B', 'G', 'D']];
      const tiles = [[tile({ type: 'bomb' }), tile({ type: 'gold' }), tile({ type: 'diamond' })]];
      const result = buildDeadEndGrid(grid, tiles);
      expect(result[0][0]).toBe('B');
      expect(result[0][1]).toBe('G');
      expect(result[0][2]).toBe('D');
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
