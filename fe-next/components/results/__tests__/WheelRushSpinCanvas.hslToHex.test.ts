// hslToHex must never return a value Pixi v8 Color.set() will reject
// (i.e. never negative, always 0..0xFFFFFF). Low-lightness inputs make f(n)
// dip slightly negative without clamping.

vi.mock('pixi.js', () => ({
  Application: class { init = vi.fn(); destroy = vi.fn(); canvas = document.createElement('canvas'); stage = { addChild: vi.fn() }; },
  Graphics: class { clear = vi.fn().mockReturnThis(); arc = vi.fn().mockReturnThis(); stroke = vi.fn().mockReturnThis(); circle = vi.fn().mockReturnThis(); fill = vi.fn().mockReturnThis(); },
}));

import { hslToHex } from '../WheelRushSpinCanvas';

describe('hslToHex', () => {
  it('returns a 24-bit non-negative integer for canonical brand hues', () => {
    for (const h of [180, 320, 270, 60]) {
      const out = hslToHex(h, 90, 60);
      expect(out).toBeGreaterThanOrEqual(0);
      expect(out).toBeLessThanOrEqual(0xffffff);
    }
  });

  it('never goes negative across the full hue range at low lightness', () => {
    // Low L is the regime where f(n) can dip below 0 before clamping.
    for (let h = 0; h <= 360; h += 10) {
      for (const l of [1, 5, 10, 20]) {
        const out = hslToHex(h, 100, l);
        expect(out).toBeGreaterThanOrEqual(0);
        expect(out).toBeLessThanOrEqual(0xffffff);
      }
    }
  });

  it('never goes negative at extreme saturation/lightness combinations', () => {
    const cases: Array<[number, number, number]> = [
      [0, 0, 0],
      [360, 100, 100],
      [180, 100, 0],
      [200, 50, 50],
    ];
    for (const [h, s, l] of cases) {
      const out = hslToHex(h, s, l);
      expect(out).toBeGreaterThanOrEqual(0);
      expect(out).toBeLessThanOrEqual(0xffffff);
    }
  });
});
