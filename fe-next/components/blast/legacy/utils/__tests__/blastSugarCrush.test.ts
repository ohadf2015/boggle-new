/**
 * blastSugarCrush - Tests for Sugar Crush end-of-level sequence planner.
 * Plans which tiles to convert to specials and in what order.
 */
import { planSugarCrush, SUGAR_CRUSH_STAGGER_MS } from '../blastSugarCrush';
import type { BlastTileState } from '../../types';

// Helper: create a grid of all-standard tiles
function makeStandardGrid(size: number): BlastTileState[][] {
  const grid: BlastTileState[][] = [];
  for (let row = 0; row < size; row++) {
    grid[row] = [];
    for (let col = 0; col < size; col++) {
      grid[row][col] = {
        row,
        col,
        type: 'standard',
        isCleared: false,
        activationEffect: null,
        hitsRemaining: 0,
      };
    }
  }
  return grid;
}

describe('SUGAR_CRUSH_STAGGER_MS', () => {
  it('should be 300 (base stagger constant)', () => {
    expect(SUGAR_CRUSH_STAGGER_MS).toBe(300);
  });
});

describe('planSugarCrush', () => {
  describe('empty/no candidate cases', () => {
    it('should return empty array when grid has no standard tiles', () => {
      // GIVEN: all tiles are cleared
      const grid = makeStandardGrid(4);
      for (const row of grid) {
        for (const tile of row) {
          tile.isCleared = true;
        }
      }

      // WHEN
      const steps = planSugarCrush(grid, 4);

      // THEN
      expect(steps).toEqual([]);
    });

    it('should return empty array when all tiles are specials (non-standard)', () => {
      // GIVEN: grid with all-bomb tiles
      const grid = makeStandardGrid(3);
      for (const row of grid) {
        for (const tile of row) {
          tile.type = 'bomb';
        }
      }

      // WHEN
      const steps = planSugarCrush(grid, 3);

      // THEN
      expect(steps).toEqual([]);
    });

    it('should return empty array when no uncleared standard tiles exist', () => {
      // GIVEN: mix of cleared standard and uncleared non-standard
      const grid = makeStandardGrid(3);
      // Clear all standard
      grid[0][0].isCleared = true;
      grid[0][1].isCleared = true;
      grid[0][2].isCleared = true;
      grid[1][0].isCleared = true;
      grid[1][1].isCleared = true;
      grid[1][2].isCleared = true;
      grid[2][0].isCleared = true;
      // Make remaining uncleared ones non-standard
      grid[2][1].type = 'bomb';
      grid[2][2].type = 'lightning';

      // WHEN
      const steps = planSugarCrush(grid, 3);

      // THEN
      expect(steps).toEqual([]);
    });
  });

  describe('step structure', () => {
    it('should return steps with required properties', () => {
      // GIVEN: grid with some standard tiles
      const grid = makeStandardGrid(4);

      // WHEN
      const steps = planSugarCrush(grid, 4);

      // THEN: each step has required shape
      expect(steps.length).toBeGreaterThan(0);
      for (const step of steps) {
        expect(typeof step.row).toBe('number');
        expect(typeof step.col).toBe('number');
        expect(typeof step.delayMs).toBe('number');
        expect(['bomb', 'lightning', 'prism', 'rainbow']).toContain(step.convertTo);
        expect(['low', 'medium', 'high']).toContain(step.intensity);
      }
    });

    it('should not include non-convertible types (ice, frozen, magnet etc)', () => {
      // GIVEN
      const grid = makeStandardGrid(5);

      // WHEN
      const steps = planSugarCrush(grid, 5);

      // THEN: convertTo is only explosion/effect specials
      for (const step of steps) {
        expect(['standard', 'ice', 'frozen', 'magnet', 'gold', 'diamond', 'gem']).not.toContain(step.convertTo);
      }
    });
  });

  describe('tile selection', () => {
    it('should select at most 8 tiles', () => {
      // GIVEN: large grid with many standard tiles
      const grid = makeStandardGrid(6); // 36 tiles

      // WHEN
      const steps = planSugarCrush(grid, 6);

      // THEN
      expect(steps.length).toBeLessThanOrEqual(8);
    });

    it('should select all available tiles when fewer than 8 exist', () => {
      // GIVEN: only 3 standard uncleared tiles
      const grid = makeStandardGrid(6);
      // Clear most tiles
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 6; c++) {
          if (!(r === 0 && c === 0) && !(r === 1 && c === 1) && !(r === 2 && c === 2)) {
            grid[r][c].isCleared = true;
          }
        }
      }

      // WHEN
      const steps = planSugarCrush(grid, 6);

      // THEN: exactly 3 steps (all available)
      expect(steps.length).toBe(3);
    });

    it('should only select tiles that are uncleared and standard', () => {
      // GIVEN: grid where some tiles are special, some cleared
      const grid = makeStandardGrid(4);
      grid[0][0].type = 'bomb'; // should be skipped (not standard)
      grid[0][1].isCleared = true; // should be skipped (already cleared)
      grid[0][2].type = 'lightning'; // should be skipped (not standard)

      // WHEN
      const steps = planSugarCrush(grid, 4);

      // THEN: none of the steps reference the skipped tiles
      const skippedCoords = [
        { row: 0, col: 0 }, // bomb
        { row: 0, col: 1 }, // cleared
        { row: 0, col: 2 }, // lightning
      ];
      for (const step of steps) {
        for (const skipped of skippedCoords) {
          expect(step.row === skipped.row && step.col === skipped.col).toBe(false);
        }
      }
    });

    it('should not select the same tile twice', () => {
      // GIVEN
      const grid = makeStandardGrid(4);

      // WHEN
      const steps = planSugarCrush(grid, 4);

      // THEN: all selected positions are unique
      const positions = steps.map(s => `${s.row},${s.col}`);
      const unique = new Set(positions);
      expect(unique.size).toBe(positions.length);
    });
  });

  describe('escalating intensity pattern', () => {
    it('should assign low intensity to first tiles, medium to middle, high to last', () => {
      // GIVEN: enough tiles to get all intensity levels (need at least ~5)
      const grid = makeStandardGrid(4);

      // WHEN
      const steps = planSugarCrush(grid, 4);

      // THEN: intensities are in escalating order (low → medium → high)
      const intensities = steps.map(s => s.intensity);

      // Find transitions
      let seenMedium = false;
      let seenHigh = false;
      for (const intensity of intensities) {
        if (intensity === 'medium') seenMedium = true;
        if (intensity === 'high') {
          seenHigh = true;
          expect(seenMedium).toBe(true); // high comes after medium
        }
        if (seenHigh) {
          // Once we hit high, remaining should be high
          expect(intensity).toBe('high');
        }
      }

      // First step is always low
      expect(intensities[0]).toBe('low');
    });

    it('should use bomb for low intensity tiles', () => {
      // GIVEN: enough tiles to trigger all phases
      const grid = makeStandardGrid(5);

      // WHEN
      const steps = planSugarCrush(grid, 5);

      // THEN: low intensity tiles convert to bomb
      const lowSteps = steps.filter(s => s.intensity === 'low');
      for (const step of lowSteps) {
        expect(step.convertTo).toBe('bomb');
      }
    });

    it('should use lightning or prism for medium intensity tiles', () => {
      // GIVEN: enough tiles for medium phase
      const grid = makeStandardGrid(5);

      // WHEN
      const steps = planSugarCrush(grid, 5);

      // THEN: medium intensity tiles convert to lightning or prism
      const mediumSteps = steps.filter(s => s.intensity === 'medium');
      for (const step of mediumSteps) {
        expect(['lightning', 'prism']).toContain(step.convertTo);
      }
    });

    it('should use rainbow for high intensity tiles', () => {
      // GIVEN: enough tiles for high phase (need 7+)
      const grid = makeStandardGrid(4);

      // WHEN
      const steps = planSugarCrush(grid, 4);

      // THEN: high intensity tiles convert to rainbow
      const highSteps = steps.filter(s => s.intensity === 'high');
      for (const step of highSteps) {
        expect(step.convertTo).toBe('rainbow');
      }
    });
  });

  describe('delay timing', () => {
    it('should have increasing cumulative delay (each step fires after the previous)', () => {
      // GIVEN
      const grid = makeStandardGrid(4);

      // WHEN
      const steps = planSugarCrush(grid, 4);

      // THEN: delays are monotonically increasing
      for (let i = 1; i < steps.length; i++) {
        expect(steps[i].delayMs).toBeGreaterThan(steps[i - 1].delayMs);
      }
    });

    it('should start with base stagger of SUGAR_CRUSH_STAGGER_MS for first step', () => {
      // GIVEN
      const grid = makeStandardGrid(4);

      // WHEN
      const steps = planSugarCrush(grid, 4);

      // THEN: first step fires at base stagger or earlier
      expect(steps[0].delayMs).toBeGreaterThan(0);
      expect(steps[0].delayMs).toBeLessThanOrEqual(SUGAR_CRUSH_STAGGER_MS);
    });

    it('should use smaller stagger for high intensity steps (creates acceleration effect)', () => {
      // GIVEN: enough tiles to test multiple phases
      const grid = makeStandardGrid(4);

      // WHEN
      const steps = planSugarCrush(grid, 4);

      // THEN: compute average stagger between consecutive steps per intensity group
      const staggers: number[] = [];
      for (let i = 1; i < steps.length; i++) {
        staggers.push(steps[i].delayMs - steps[i - 1].delayMs);
      }

      // High-intensity staggers should be ≤ low-intensity staggers
      const lowStaggers = staggers.filter((_, i) => steps[i + 1]?.intensity === 'low');
      const highStaggers = staggers.filter((_, i) => steps[i + 1]?.intensity === 'high');

      if (lowStaggers.length > 0 && highStaggers.length > 0) {
        const avgLow = lowStaggers.reduce((a, b) => a + b, 0) / lowStaggers.length;
        const avgHigh = highStaggers.reduce((a, b) => a + b, 0) / highStaggers.length;
        expect(avgHigh).toBeLessThanOrEqual(avgLow);
      }
    });
  });

  describe('small grids', () => {
    it('should work with a 2x2 grid (min grid)', () => {
      // GIVEN
      const grid = makeStandardGrid(2);

      // WHEN
      const steps = planSugarCrush(grid, 2);

      // THEN: up to 4 steps
      expect(steps.length).toBeLessThanOrEqual(4);
      expect(steps.length).toBeGreaterThan(0);
    });

    it('should handle single remaining tile', () => {
      // GIVEN: only 1 standard uncleared tile
      const grid = makeStandardGrid(3);
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          if (!(r === 1 && c === 1)) {
            grid[r][c].isCleared = true;
          }
        }
      }

      // WHEN
      const steps = planSugarCrush(grid, 3);

      // THEN: exactly 1 step
      expect(steps.length).toBe(1);
      expect(steps[0].row).toBe(1);
      expect(steps[0].col).toBe(1);
      expect(steps[0].delayMs).toBeGreaterThan(0);
    });
  });
});
