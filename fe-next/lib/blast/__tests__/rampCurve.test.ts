import { describe, it, expect } from 'vitest';
import { rampRate, RAMP_DEFAULTS } from '../rampCurve';

describe('rampRate', () => {
  it('returns 1.0 at t=0 (real-time approach)', () => {
    expect(rampRate(0, RAMP_DEFAULTS)).toBeCloseTo(1.0, 2);
  });

  it('returns 0.2 at peak start (t=400ms)', () => {
    expect(rampRate(400, RAMP_DEFAULTS)).toBeCloseTo(0.2, 2);
  });

  it('holds 0.2 during dwell (t=600ms)', () => {
    expect(rampRate(600, RAMP_DEFAULTS)).toBeCloseTo(0.2, 2);
  });

  it('returns 1.5 at end of follow-through (t=1400ms)', () => {
    expect(rampRate(1400, RAMP_DEFAULTS)).toBeCloseTo(1.5, 2);
  });

  it('clamps to 1.5 past end', () => {
    expect(rampRate(2000, RAMP_DEFAULTS)).toBeCloseTo(1.5, 2);
  });

  it('clamps to 1.0 at negative t', () => {
    expect(rampRate(-100, RAMP_DEFAULTS)).toBeCloseTo(1.0, 2);
  });
});
