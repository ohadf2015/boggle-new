import { describe, it, expect } from 'vitest';
import { inferAxis, type PlacedTile } from '@/lib/word-craft/placement';

/**
 * Test linearity constraint checking for tile placements.
 * Ensures that invalid placements (off-axis) are prevented visually.
 */

describe('WordCraft Linearity Validation', () => {
  const computeInvalidCell = (pending: PlacedTile[]) => {
    return (row: number, col: number): boolean => {
      if (pending.length === 0) return false; // All cells valid when no pending
      if (pending.length === 1) {
        // One tile placed: both row and column are valid (axis not locked yet)
        const p = pending[0];
        return row !== p.row && col !== p.col;
      }
      // Two or more tiles: only cells on the locked axis are valid
      const axis = inferAxis(pending);
      if (axis === 'h') return row !== pending[0].row;
      if (axis === 'v') return col !== pending[0].col;
      // If axis is null (tiles not aligned), cell is invalid
      return true;
    };
  };

  describe('no pending tiles', () => {
    it('should allow any cell', () => {
      const isInvalid = computeInvalidCell([]);
      expect(isInvalid(0, 0)).toBe(false);
      expect(isInvalid(7, 7)).toBe(false);
      expect(isInvalid(5, 10)).toBe(false);
    });
  });

  describe('one pending tile', () => {
    it('should allow cells in the same row', () => {
      const pending: PlacedTile[] = [
        { row: 5, col: 5, letter: 'A', value: 1, isBlank: false, rackTileId: '1' },
      ];
      const isInvalid = computeInvalidCell(pending);
      expect(isInvalid(5, 0)).toBe(false); // same row, left
      expect(isInvalid(5, 9)).toBe(false); // same row, right
    });

    it('should allow cells in the same column', () => {
      const pending: PlacedTile[] = [
        { row: 5, col: 5, letter: 'A', value: 1, isBlank: false, rackTileId: '1' },
      ];
      const isInvalid = computeInvalidCell(pending);
      expect(isInvalid(0, 5)).toBe(false); // same col, above
      expect(isInvalid(9, 5)).toBe(false); // same col, below
    });

    it('should reject cells off both axes', () => {
      const pending: PlacedTile[] = [
        { row: 5, col: 5, letter: 'A', value: 1, isBlank: false, rackTileId: '1' },
      ];
      const isInvalid = computeInvalidCell(pending);
      expect(isInvalid(3, 7)).toBe(true); // different row and column
      expect(isInvalid(8, 2)).toBe(true); // different row and column
    });
  });

  describe('two pending tiles - horizontal', () => {
    it('should allow only cells in the same row', () => {
      const pending: PlacedTile[] = [
        { row: 5, col: 3, letter: 'A', value: 1, isBlank: false, rackTileId: '1' },
        { row: 5, col: 5, letter: 'B', value: 1, isBlank: false, rackTileId: '2' },
      ];
      const isInvalid = computeInvalidCell(pending);
      expect(isInvalid(5, 7)).toBe(false); // same row
      expect(isInvalid(5, 0)).toBe(false); // same row, far left
      expect(isInvalid(4, 5)).toBe(true); // different row (above)
      expect(isInvalid(6, 5)).toBe(true); // different row (below)
    });
  });

  describe('two pending tiles - vertical', () => {
    it('should allow only cells in the same column', () => {
      const pending: PlacedTile[] = [
        { row: 3, col: 5, letter: 'A', value: 1, isBlank: false, rackTileId: '1' },
        { row: 5, col: 5, letter: 'B', value: 1, isBlank: false, rackTileId: '2' },
      ];
      const isInvalid = computeInvalidCell(pending);
      expect(isInvalid(7, 5)).toBe(false); // same column
      expect(isInvalid(0, 5)).toBe(false); // same column, far up
      expect(isInvalid(5, 3)).toBe(true); // different column (left)
      expect(isInvalid(5, 7)).toBe(true); // different column (right)
    });
  });

  describe('three pending tiles - horizontal', () => {
    it('should enforce horizontal linearity', () => {
      const pending: PlacedTile[] = [
        { row: 5, col: 2, letter: 'A', value: 1, isBlank: false, rackTileId: '1' },
        { row: 5, col: 5, letter: 'B', value: 1, isBlank: false, rackTileId: '2' },
        { row: 5, col: 8, letter: 'C', value: 1, isBlank: false, rackTileId: '3' },
      ];
      const isInvalid = computeInvalidCell(pending);
      expect(isInvalid(5, 10)).toBe(false); // same row continues the line
      expect(isInvalid(4, 5)).toBe(true); // breaks to a different row
    });
  });

  describe('misaligned tiles', () => {
    it('should reject any placement when tiles are not aligned', () => {
      const pending: PlacedTile[] = [
        { row: 5, col: 3, letter: 'A', value: 1, isBlank: false, rackTileId: '1' },
        { row: 7, col: 5, letter: 'B', value: 1, isBlank: false, rackTileId: '2' },
      ];
      const isInvalid = computeInvalidCell(pending);
      // Tiles are misaligned (different row AND different column)
      // This should be caught earlier by inferAxis returning null
      const axis = inferAxis(pending);
      expect(axis).toBe(null);
      // When axis is null, all placements should be invalid
      expect(isInvalid(5, 7)).toBe(true);
      expect(isInvalid(7, 7)).toBe(true);
    });
  });
});
