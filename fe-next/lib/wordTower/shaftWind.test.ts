import { describe, it, expect } from 'vitest';
import { shaftWindX, SHAFT_WIND_MAX_PX, SHAFT_WIND_BAND, SHAFT_WIND_PERIOD_MS } from './shaftWind';

describe('shaftWindX', () => {
  it('is 0 for a degenerate / single-tile tower', () => {
    expect(shaftWindX(0, 0, 1234, 1)).toBe(0);
    expect(shaftWindX(0, -3, 1234, 1)).toBe(0);
  });

  it('keeps the base band dead-steady (exactly 0 below the band floor)', () => {
    const top = 100;
    for (let pos = 0; pos < SHAFT_WIND_BAND * top - 1; pos += 5) {
      expect(shaftWindX(pos, top, 777, 1)).toBe(0);
    }
  });

  it('never exceeds the px cap in magnitude', () => {
    const top = 100;
    for (let pos = 0; pos <= top; pos++) {
      for (let t = 0; t < SHAFT_WIND_PERIOD_MS; t += 60) {
        expect(Math.abs(shaftWindX(pos, top, t, 1))).toBeLessThanOrEqual(SHAFT_WIND_MAX_PX + 1e-9);
      }
    }
  });

  it('sways the crown more than a lower in-band tile (at a shared phase peak)', () => {
    // Pick a time where the base sine term is near its peak; compare amplitudes
    // by sampling the max |offset| over a full period (phase differs by height).
    const top = 100;
    const maxAt = (pos: number) => {
      let m = 0;
      for (let t = 0; t < SHAFT_WIND_PERIOD_MS; t += 20) m = Math.max(m, Math.abs(shaftWindX(pos, top, t, 1)));
      return m;
    };
    expect(maxAt(98)).toBeGreaterThan(maxAt(75));
  });

  it('sways even on a perfectly stable tower (idle wind at altitude)', () => {
    const top = 100;
    let m = 0;
    for (let t = 0; t < SHAFT_WIND_PERIOD_MS; t += 20) m = Math.max(m, Math.abs(shaftWindX(top, top, t, 0)));
    expect(m).toBeGreaterThan(0);
  });

  it('amplitude grows with instability', () => {
    const top = 100;
    const maxAt = (inst: number) => {
      let m = 0;
      for (let t = 0; t < SHAFT_WIND_PERIOD_MS; t += 20) m = Math.max(m, Math.abs(shaftWindX(top, top, t, inst)));
      return m;
    };
    expect(maxAt(1)).toBeGreaterThan(maxAt(0));
  });

  it('is deterministic for identical inputs', () => {
    expect(shaftWindX(90, 100, 4242, 0.5)).toBe(shaftWindX(90, 100, 4242, 0.5));
  });
});
