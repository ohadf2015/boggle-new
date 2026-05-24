import { describe, it, expect } from 'vitest';
import { getProgressPercent, meterZone } from '../feedbackTiers';

describe('getProgressPercent — round score toward target', () => {
  it('is score/target, clamped to [0,1]', () => {
    expect(getProgressPercent(0, 100)).toBe(0);
    expect(getProgressPercent(50, 100)).toBeCloseTo(0.5);
    expect(getProgressPercent(150, 100)).toBe(1); // clamped, the overflow is celebrated not shown >100%
  });
  it('guards a zero/negative target without dividing by zero', () => {
    expect(getProgressPercent(20, 0)).toBe(0);
    expect(Number.isFinite(getProgressPercent(20, 0))).toBe(true);
  });
});

describe('meterZone — encouraging, not alarming (cosy)', () => {
  it('builds quietly through the early stretch', () => {
    expect(meterZone(0, 100)).toBe('building');
    expect(meterZone(60, 100)).toBe('building');
  });
  it('lifts to anticipation near the target', () => {
    expect(meterZone(90, 100)).toBe('close');
  });
  it('celebrates once the target is reached or beaten', () => {
    expect(meterZone(100, 100)).toBe('reached');
    expect(meterZone(140, 100)).toBe('reached');
  });
});
