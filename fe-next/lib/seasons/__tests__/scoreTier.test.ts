import { describe, it, expect } from 'vitest';
import { scoreTier, TIER_ORDER, tierTextClass, tierDotClass, navTierForPath } from '../scoreTier';

describe('scoreTier', () => {
  // Thresholds MUST mirror SQL get_user_current_season_rank / get_user_tier_position.
  it.each([
    [0, 'stone'],
    [499, 'stone'],
    [500, 'bronze'],
    [2499, 'bronze'],
    [2500, 'silver'],
    [9999, 'silver'],
    [10000, 'gold'],
    [29999, 'gold'],
    [30000, 'platinum'],
    [79999, 'platinum'],
    [80000, 'diamond'],
    [199999, 'diamond'],
    [200000, 'grandmaster'],
    [999999, 'grandmaster'],
  ] as const)('maps score %i to tier %s', (score, tier) => {
    expect(scoreTier(score)).toBe(tier);
  });

  it('treats null/negative as stone', () => {
    expect(scoreTier(null)).toBe('stone');
    expect(scoreTier(undefined)).toBe('stone');
    expect(scoreTier(-5)).toBe('stone');
  });

  it('exposes every tier in ascending order', () => {
    expect(TIER_ORDER).toEqual(['stone', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'grandmaster']);
  });

  it('returns a literal Tailwind class for every tier (no dynamic interpolation)', () => {
    for (const tier of TIER_ORDER) {
      expect(tierTextClass(tier)).toMatch(/^text-/);
      expect(tierDotClass(tier)).toMatch(/^bg-/);
    }
  });
});

describe('navTierForPath', () => {
  it('returns the tier on the profile route when above stone', () => {
    expect(navTierForPath('/profile', 12000)).toBe('gold');
    expect(navTierForPath('/account/settings', 3000)).toBe('silver');
  });

  it('returns null for the stone tier (do not label newcomers)', () => {
    expect(navTierForPath('/profile', 100)).toBeNull();
    expect(navTierForPath('/profile', 0)).toBeNull();
  });

  it('returns null off the profile/account route', () => {
    expect(navTierForPath('/leaderboard', 12000)).toBeNull();
    expect(navTierForPath('/', 999999)).toBeNull();
  });
});
