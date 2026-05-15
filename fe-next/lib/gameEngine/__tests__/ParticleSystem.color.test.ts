// Color helper safety: never return a value Pixi v8 Color.set() will reject.
// Pixi v8 throws "Unable to convert color -N" on any negative number.

import { hexToNum, lerpColor } from '../ParticleSystem';

describe('hexToNum (ParticleSystem)', () => {
  it('parses 6-digit hex without #', () => {
    expect(hexToNum('BFFF00')).toBe(0xbfff00);
  });

  it('strips leading # before parsing', () => {
    expect(hexToNum('#FF1493')).toBe(0xff1493);
  });

  it('returns fallback (black) for NaN inputs instead of leaking NaN', () => {
    expect(hexToNum('nope')).toBe(0);
    expect(hexToNum('')).toBe(0);
    expect(hexToNum('#zz')).toBe(0);
  });

  it('never returns a negative number', () => {
    for (const v of ['BFFF00', '#FF1493', 'nope', '', '#zz', 'ffffff']) {
      expect(hexToNum(v)).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('lerpColor (ParticleSystem)', () => {
  it('returns a 24-bit non-negative integer for in-range t', () => {
    const out = lerpColor([0xbfff00, 0xff1493], 0.5);
    expect(out).toBeGreaterThanOrEqual(0);
    expect(out).toBeLessThanOrEqual(0xffffff);
  });

  it('clamps for t > 1 (no overshoot)', () => {
    const out = lerpColor([0xbfff00, 0xff1493], 2);
    expect(out).toBeGreaterThanOrEqual(0);
    expect(out).toBeLessThanOrEqual(0xffffff);
  });

  it('clamps for t < 0 (no undershoot to negative)', () => {
    const out = lerpColor([0xbfff00, 0xff1493], -1);
    expect(out).toBeGreaterThanOrEqual(0);
    expect(out).toBeLessThanOrEqual(0xffffff);
  });

  it('handles single-color array without crashing', () => {
    expect(lerpColor([0xbfff00], 0.5)).toBe(0xbfff00);
  });

  it('survives poisoned input (NaN color) without going negative', () => {
    const out = lerpColor([NaN as unknown as number, 0xff1493], 0.5);
    expect(out).toBeGreaterThanOrEqual(0);
    expect(out).toBeLessThanOrEqual(0xffffff);
  });
});
