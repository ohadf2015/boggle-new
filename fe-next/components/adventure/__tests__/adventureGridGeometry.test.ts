/**
 * adventureGridGeometry Tests
 *
 * Tests for:
 * - Fix 1: Adaptive deadzone (uses getDeadzoneThreshold from utils/consts)
 * - Fix 3: Velocity-aware selection threshold
 */

import {
  hasExceededDeadzone,
  isWithinSelectionThreshold,
  CELL_SELECTION_THRESHOLD,
  DIAGONAL_SELECTION_THRESHOLD,
  type CellPosition,
} from '../adventureGridGeometry';

// Mock getDeadzoneThreshold from utils/consts
vi.mock('@/utils/consts', () => ({
  getDeadzoneThreshold: vi.fn(() => 8),
}));

import { getDeadzoneThreshold } from '@/utils/consts';

describe('adventureGridGeometry', () => {
  describe('Fix 1: Adaptive deadzone', () => {
    it('should use getDeadzoneThreshold from utils/consts instead of hardcoded value', () => {
      // Movement of 9px should exceed threshold of 8
      expect(hasExceededDeadzone(0, 0, 9, 0)).toBe(true);
      expect(getDeadzoneThreshold).toHaveBeenCalled();
    });

    it('should not exceed deadzone when movement is below adaptive threshold', () => {
      // Movement of 7px should NOT exceed threshold of 8
      expect(hasExceededDeadzone(0, 0, 5, 5)).toBe(false); // ~7.07px
    });

    it('should respect different device thresholds', () => {
      (getDeadzoneThreshold as jest.Mock).mockReturnValue(10);
      // Movement of 9px should NOT exceed threshold of 10
      expect(hasExceededDeadzone(0, 0, 9, 0)).toBe(false);

      (getDeadzoneThreshold as jest.Mock).mockReturnValue(5);
      // Movement of 6px should exceed threshold of 5
      expect(hasExceededDeadzone(0, 0, 6, 0)).toBe(true);
    });
  });

  describe('Fix 3: Velocity-aware selection threshold', () => {
    const makeCellPosition = (distanceFromCenter: number, cellRadius = 50): CellPosition => ({
      row: 0,
      col: 1,
      letter: 'A',
      distanceFromCenter,
      cellRadius,
    });

    it('should match classic mode thresholds (0.85 straight, 0.95 diagonal)', () => {
      expect(CELL_SELECTION_THRESHOLD).toBe(0.85);
      expect(DIAGONAL_SELECTION_THRESHOLD).toBe(0.95);
    });

    it('should give 10% velocity bonus when velocity > 0.3 (matching regular mode)', () => {
      // cellRadius=50, threshold=0.85 => base=42.5, with 10% bonus=46.75
      const cell = makeCellPosition(44);
      // Without velocity: 44 > 42.5 => false
      expect(isWithinSelectionThreshold(cell, false, 0)).toBe(false);
      // With high velocity: 44 <= 46.75 => true
      expect(isWithinSelectionThreshold(cell, false, 0.5)).toBe(true);
    });

    it('should NOT give velocity bonus when velocity <= 0.3', () => {
      const cell = makeCellPosition(44);
      // velocity 0.2 should not give bonus: 44 > 42.5 => false
      expect(isWithinSelectionThreshold(cell, false, 0.2)).toBe(false);
    });

    it('should accept velocity parameter (not just swipeVelocity > 0.5)', () => {
      const cell = makeCellPosition(44);
      // velocity 0.31 should trigger the bonus (threshold is 0.3, not 0.5)
      expect(isWithinSelectionThreshold(cell, false, 0.31)).toBe(true);
    });

    it('should apply diagonal threshold with velocity bonus', () => {
      // cellRadius=50, diagonal threshold=0.95 => base=47.5, with 10% bonus=52.25
      const cell = makeCellPosition(49);
      // Without velocity: 49 > 47.5 => false
      expect(isWithinSelectionThreshold(cell, true, 0)).toBe(false);
      // With velocity: 49 <= 52.25 => true
      expect(isWithinSelectionThreshold(cell, true, 0.5)).toBe(true);
    });

    it('should still work with zero velocity', () => {
      const cell = makeCellPosition(40); // within base threshold of 42.5
      expect(isWithinSelectionThreshold(cell, false, 0)).toBe(true);
    });
  });
});
