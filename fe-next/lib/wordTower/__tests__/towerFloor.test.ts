import { describe, it, expect } from 'vitest';
import {
  floorCourse,
  overlapWidth,
  maxOffsetPx,
  nextFloorX,
  supportWidthPx,
  FLOOR_MIN_TILE,
  FLOOR_WIDTH_CEILING_FRAC,
  MAX_ROW_GAP_PX,
  MIN_OVERLAP_FRAC,
  GROUND_PAD_TILES,
} from '../towerFloor';

const CANVAS_W = 390;
const BASE = 46;

describe('floorCourse — a word is one horizontal floor', () => {
  it('lays N letters left→right centred on 0 (LTR)', () => {
    const { xs, size } = floorCourse(4, BASE, CANVAS_W, 'ltr');
    expect(xs).toHaveLength(4);
    // Symmetric about the floor centre.
    expect(xs[0]).toBeCloseTo(-xs[3], 5);
    expect(xs[1]).toBeCloseTo(-xs[2], 5);
    // Strictly increasing, one tile+gap apart.
    expect(xs[1] - xs[0]).toBeCloseTo(xs[2] - xs[1], 5);
    expect(xs[1] - xs[0]).toBeGreaterThan(size);
  });

  it('places the logical first letter on the RIGHT in RTL', () => {
    const ltr = floorCourse(3, BASE, CANVAS_W, 'ltr');
    const rtl = floorCourse(3, BASE, CANVAS_W, 'rtl');
    expect(rtl.xs[0]).toBeCloseTo(ltr.xs[2], 5);
    expect(rtl.xs[2]).toBeCloseTo(ltr.xs[0], 5);
    expect(rtl.width).toBeCloseTo(ltr.width, 5);
  });

  it('keeps tiles at the base size while the floor fits the width ceiling', () => {
    expect(floorCourse(3, BASE, CANVAS_W, 'ltr').size).toBe(BASE);
    expect(floorCourse(5, BASE, CANVAS_W, 'ltr').size).toBe(BASE);
  });

  it('shrinks tiles instead of overflowing once the ceiling is hit', () => {
    const long = floorCourse(8, BASE, CANVAS_W, 'ltr');
    expect(long.size).toBeLessThan(BASE);
    expect(long.width).toBeLessThanOrEqual(CANVAS_W * FLOOR_WIDTH_CEILING_FRAC + 0.5);
  });

  // Rows are a FIXED height; a tile that shrinks freely floats in its row and
  // the stack reads as separated slabs. The width target yields to the row.
  it('never shrinks so far that the floor floats inside its row', () => {
    for (const base of [38, 46, 54]) {
      for (const w of [320, 390, 430]) {
        for (let n = 3; n <= 7; n++) {
          // The row-gap floor yields only to the canvas: on a viewport too
          // narrow to hold the floor at all, fitting on screen wins.
          const fitFullCanvas = (w - 3 * (n - 1)) / n;
          const allowed = Math.max(FLOOR_MIN_TILE, Math.min(base - MAX_ROW_GAP_PX, fitFullCanvas));
          expect(floorCourse(n, base, w, 'ltr').size).toBeGreaterThanOrEqual(allowed - 0.001);
        }
      }
    }
  });

  it('keeps every REAL word (the 7-letter wheel) on screen', () => {
    for (const base of [38, 46, 54]) {
      for (const w of [320, 390, 430]) {
        for (let n = 3; n <= 7; n++) {
          expect(floorCourse(n, base, w, 'ltr').width).toBeLessThanOrEqual(w);
        }
      }
    }
  });

  it('is width-monotonic in word length — a longer word is never a narrower platform', () => {
    let prev = 0;
    for (let n = 3; n <= 30; n++) {
      const { width } = floorCourse(n, BASE, CANVAS_W, 'ltr');
      expect(width).toBeGreaterThanOrEqual(prev - 0.001);
      prev = width;
    }
  });

  it('returns an empty course for a zero-length word', () => {
    expect(floorCourse(0, BASE, CANVAS_W, 'ltr')).toEqual({ size: 0, gap: 0, width: 0, xs: [] });
  });
});

describe('overlapWidth — 1-D interval intersection', () => {
  it('is the narrower interval when perfectly centred', () => {
    expect(overlapWidth(0, 100, 60)).toBe(60);
    expect(overlapWidth(0, 60, 100)).toBe(60);
  });

  it('shrinks linearly with offset once the intervals part', () => {
    expect(overlapWidth(20, 100, 100)).toBe(80);
    expect(overlapWidth(-20, 100, 100)).toBe(80);
  });

  it('is zero when the floor clears the support entirely', () => {
    expect(overlapWidth(200, 100, 100)).toBe(0);
  });
});

describe('maxOffsetPx — a floor can never float free', () => {
  it('leaves at least MIN_OVERLAP_FRAC of the narrower span supported', () => {
    const fw = 120, sw = 80;
    const max = maxOffsetPx(fw, sw);
    expect(overlapWidth(max, fw, sw)).toBeCloseTo(MIN_OVERLAP_FRAC * Math.min(fw, sw), 5);
  });

  it('grows with a wider support — a long word below is a forgiving platform', () => {
    expect(maxOffsetPx(100, 200)).toBeGreaterThan(maxOffsetPx(100, 80));
  });
});

describe('nextFloorX — the stack records the drops', () => {
  const FW = 100, SW = 100, DRIFT = 100;

  it('lands dead centre on a perfect drop', () => {
    expect(nextFloorX(0, 0, FW, SW, DRIFT)).toBe(0);
  });

  it('offsets in the direction of the error and scales with it', () => {
    const small = nextFloorX(0, 0.2, FW, SW, DRIFT);
    const big = nextFloorX(0, 0.6, FW, SW, DRIFT);
    expect(small).toBeGreaterThan(0);
    expect(big).toBeGreaterThan(small);
    expect(nextFloorX(0, -0.6, FW, SW, DRIFT)).toBeCloseTo(-big, 5);
  });

  it('stacks relative to the floor below, so errors accumulate into a wonky tower', () => {
    const first = nextFloorX(0, 0.4, FW, SW, DRIFT);
    const second = nextFloorX(first, 0.4, FW, SW, DRIFT);
    expect(second).toBeGreaterThan(first);
  });

  it('keeps at least the minimum overlap even on a full miss', () => {
    const x = nextFloorX(0, 1, FW, SW, DRIFT);
    expect(overlapWidth(x, FW, SW)).toBeGreaterThanOrEqual(MIN_OVERLAP_FRAC * Math.min(FW, SW) - 0.001);
  });

  it('clamps cumulative drift so the tower never walks off screen', () => {
    let x = 0;
    for (let i = 0; i < 20; i++) x = nextFloorX(x, 1, FW, SW, DRIFT);
    expect(Math.abs(x)).toBeLessThanOrEqual(DRIFT);
  });
});

describe('supportWidthPx — what the next floor lands on', () => {
  it('uses the ground pad for the first floor', () => {
    expect(supportWidthPx([], BASE, CANVAS_W)).toBeCloseTo(GROUND_PAD_TILES * BASE, 0);
  });

  it('uses the width of the floor below', () => {
    const below = floorCourse(6, BASE, CANVAS_W, 'ltr');
    expect(supportWidthPx([6], BASE, CANVAS_W)).toBeCloseTo(below.width, 5);
  });

  it('makes a long word a wider platform than a short one', () => {
    expect(supportWidthPx([8], BASE, CANVAS_W)).toBeGreaterThan(supportWidthPx([3], BASE, CANVAS_W));
  });
});
