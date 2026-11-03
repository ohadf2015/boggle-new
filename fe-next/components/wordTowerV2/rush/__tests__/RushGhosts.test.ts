import { describe, expect, it } from 'vitest';
import { sameView, sampleProjector } from '../RushGhosts';

describe('sampleProjector', () => {
  it('given no projector yet or an unmeasured box, when sampled, then there is no view', () => {
    expect(sampleProjector(null, 800)).toBeNull();
    expect(sampleProjector((m) => m, 0)).toBeNull();
  });

  it('given a camera projector, when sampled, then two whole-pixel points describe the same line', () => {
    const fn = (m: number) => 700.4 - m * 30 * 0.5;
    expect(sampleProjector(fn, 844.2)).toEqual({ y0: 700, y100: -800, h: 844 });
  });
});

describe('sameView', () => {
  it('given sub-pixel camera drift, when compared after sampling, then no re-render is needed', () => {
    const a = sampleProjector((m) => 500.1 - m * 10, 800);
    const b = sampleProjector((m) => 500.3 - m * 10, 800);
    expect(sameView(a, b)).toBe(true);
  });

  it('given the camera moved a pixel, when compared, then it re-renders', () => {
    expect(sameView({ y0: 500, y100: -500, h: 800 }, { y0: 501, y100: -499, h: 800 })).toBe(false);
    expect(sameView(null, { y0: 1, y100: 0, h: 1 })).toBe(false);
  });
});

describe('sampleProjector with a box offset', () => {
  it('given the layer starts under the HUD, when sampled, then Y is local to that box', () => {
    expect(sampleProjector((m) => 600 - m, 500, 120)).toEqual({ y0: 480, y100: 380, h: 500 });
  });
});
