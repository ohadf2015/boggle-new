import { describe, it, expect } from 'vitest';
import { computePulseRingFrame, pulseRingTierColor } from '../pulseRingCurve';

describe('computePulseRingFrame', () => {
  it('returns start state at t=0: scale 0.2, full alpha', () => {
    const frame = computePulseRingFrame(0);
    expect(frame.scale).toBeCloseTo(0.2, 3);
    expect(frame.alpha).toBeCloseTo(1, 3);
    expect(frame.done).toBe(false);
  });

  it('returns end state at t=1: large scale, zero alpha, done', () => {
    const frame = computePulseRingFrame(1);
    expect(frame.scale).toBeGreaterThan(1.5);
    expect(frame.alpha).toBeCloseTo(0, 3);
    expect(frame.done).toBe(true);
  });

  it('scale grows monotonically across the tween', () => {
    const samples = [0, 0.25, 0.5, 0.75, 1];
    const scales = samples.map((t) => computePulseRingFrame(t).scale);
    for (let i = 1; i < scales.length; i++) {
      expect(scales[i]).toBeGreaterThan(scales[i - 1]);
    }
  });

  it('alpha decays monotonically across the tween', () => {
    const samples = [0, 0.25, 0.5, 0.75, 1];
    const alphas = samples.map((t) => computePulseRingFrame(t).alpha);
    for (let i = 1; i < alphas.length; i++) {
      expect(alphas[i]).toBeLessThanOrEqual(alphas[i - 1]);
    }
  });

  it('clamps t > 1 and t < 0 instead of extrapolating', () => {
    expect(computePulseRingFrame(2).alpha).toBeCloseTo(0, 3);
    expect(computePulseRingFrame(-1).alpha).toBeCloseTo(1, 3);
    expect(computePulseRingFrame(2).done).toBe(true);
  });
});

describe('pulseRingTierColor', () => {
  it('returns neo-lime for tier 1', () => {
    expect(pulseRingTierColor(1)).toBe(0xbfff00);
  });

  it('returns neo-pink for mid tiers', () => {
    expect(pulseRingTierColor(3)).toBe(0xff1493);
  });

  it('returns neo-cyan for high tiers (5+)', () => {
    expect(pulseRingTierColor(5)).toBe(0x00ffff);
    expect(pulseRingTierColor(9)).toBe(0x00ffff);
  });

  it('clamps tiers below 1 to lime', () => {
    expect(pulseRingTierColor(0)).toBe(0xbfff00);
    expect(pulseRingTierColor(-2)).toBe(0xbfff00);
  });
});
