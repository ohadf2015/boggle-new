import { describe, it, expect } from 'vitest';
import {
  COINS_PER_REFERRAL,
  REFERRAL_MILESTONES,
  milestonesCrossed,
} from '../rewards';

describe('referral rewards constants', () => {
  it('per-referral coin grant is a positive integer', () => {
    expect(Number.isInteger(COINS_PER_REFERRAL)).toBe(true);
    expect(COINS_PER_REFERRAL).toBeGreaterThan(0);
  });

  it('milestones are sorted by ascending threshold', () => {
    const thresholds = REFERRAL_MILESTONES.map(m => m.threshold);
    const sorted = [...thresholds].sort((a, b) => a - b);
    expect(thresholds).toEqual(sorted);
  });
});

describe('milestonesCrossed', () => {
  it('returns empty when no threshold crossed', () => {
    expect(milestonesCrossed(0, 2)).toEqual([]);
    expect(milestonesCrossed(3, 3)).toEqual([]);
    expect(milestonesCrossed(4, 5)).toEqual([]);
  });

  it('returns the single milestone crossed', () => {
    const result = milestonesCrossed(2, 3);
    expect(result.map(m => m.id)).toEqual(['bronze']);
  });

  it('returns multiple milestones if jump spans more than one tier', () => {
    const result = milestonesCrossed(0, 25);
    expect(result.map(m => m.id)).toEqual(['bronze', 'silver', 'gold']);
  });

  it('returns empty when count goes backward', () => {
    expect(milestonesCrossed(10, 5)).toEqual([]);
  });

  it('crosses diamond at exactly threshold 50', () => {
    const result = milestonesCrossed(49, 50);
    expect(result.map(m => m.id)).toEqual(['diamond']);
  });
});
