import { describe, expect, it } from 'vitest';
import { RANK_TIERS, rankFor } from '../rankLadder';

describe('RANK_TIERS', () => {
  it('has the 9 tiers in order with their thresholds', () => {
    expect(RANK_TIERS.map((t) => t.id)).toEqual([
      'foundation',
      'scaffold',
      'lowrise',
      'midrise',
      'highrise',
      'skyline',
      'supertall',
      'megatall',
      'legend',
    ]);
    expect(RANK_TIERS.map((t) => t.minM)).toEqual([0, 6, 15, 30, 50, 80, 120, 180, 260]);
  });
});

describe('rankFor', () => {
  it('starts at foundation', () => {
    expect(rankFor(0)).toEqual({ tier: 0, tierId: 'foundation', progress01: 0, nextTierM: 6 });
  });

  it('clamps negative and non-finite heights to 0', () => {
    expect(rankFor(-12)).toEqual(rankFor(0));
    expect(rankFor(Number.NaN)).toEqual(rankFor(0));
  });

  it('reports progress within the tier', () => {
    const rank = rankFor(22.5);
    expect(rank.tierId).toBe('lowrise');
    expect(rank.tier).toBe(2);
    expect(rank.progress01).toBeCloseTo(0.5);
    expect(rank.nextTierM).toBe(30);
  });

  it('enters a tier exactly at its threshold', () => {
    expect(rankFor(6)).toMatchObject({ tierId: 'scaffold', progress01: 0, nextTierM: 15 });
    expect(rankFor(5.999).tierId).toBe('foundation');
  });

  it('pins the last tier at full progress with no next tier', () => {
    expect(rankFor(260)).toEqual({ tier: 8, tierId: 'legend', progress01: 1, nextTierM: null });
    expect(rankFor(9999)).toEqual({ tier: 8, tierId: 'legend', progress01: 1, nextTierM: null });
  });
});
