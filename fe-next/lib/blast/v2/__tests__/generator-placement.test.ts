import { describe, it, expect } from 'vitest';
import { placeWords, forwardSim, type Grid } from '../generator/placement';
import { seededPRNG } from '../prng';

describe('placement', () => {
  it('placeWords returns valid grid with placements', () => {
    const prng = seededPRNG(42);
    const result = placeWords(['HELLO', 'WORLD'], { cols: 6, maxHeight: 5 }, prng);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.placements.length).toBeGreaterThan(0);
      expect(result.heights.length).toBe(6);
    }
  });

  it('placeWords fails on impossible placement', () => {
    const prng = seededPRNG(42);
    const result = placeWords(['VERYLONGWORD'], { cols: 2, maxHeight: 1 }, prng);
    expect(result.ok).toBe(false);
  });
});

describe('forwardSim', () => {
  it('forwardSim finds valid pop order', () => {
    const grid: Grid = {
      cols: 3,
      rows: 3,
      cells: {
        'c0r0': 'C',
        'c0r1': 'A',
        'c0r2': 'T',
        'c1r0': 'D',
        'c1r1': 'O',
        'c1r2': 'G',
      },
    };
    const result = forwardSim(grid, ['CAT', 'DOG']);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.order.length).toBe(2);
    }
  });

  it('forwardSim returns ok:false when no valid order', () => {
    const grid: Grid = {
      cols: 2,
      rows: 2,
      cells: {
        'c0r0': 'A',
        'c0r1': 'B',
        'c1r0': 'C',
        'c1r1': 'D',
      },
    };
    const result = forwardSim(grid, ['ABCDEFG']);
    expect(result.ok).toBe(false);
  });
});
