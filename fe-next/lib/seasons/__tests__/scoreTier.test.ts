import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { scoreTier, TIER_ORDER, tierTextClass, tierDotClass, navTierForPath, tierImagePath } from '../scoreTier';
import { GLOBAL_LEADERBOARD_TIERS } from '@/lib/ranked/leaderboardTiers';

describe('season tier ↔ leaderboard image mapping', () => {
  // The season tier ladder (scoreTier) and the leaderboard tier defs are two
  // separately-maintained lists that share the same 7 ids. The rank badge image
  // is sourced from the leaderboard defs, so every season tier MUST resolve to a
  // def with a real on-disk image. This locks the lists together (a platinum
  // image once nearly went missing).
  it.each(TIER_ORDER)('tier "%s" maps to a leaderboard def with an existing image', (id) => {
    const def = GLOBAL_LEADERBOARD_TIERS.find((t) => t.id === id);
    expect(def, `no leaderboard def for tier "${id}"`).toBeTruthy();
    const path = tierImagePath(id);
    expect(path).toBe(def!.imagePath);
    expect(path).toMatch(/\/images\/tiers\/tier-.+\.webp$/);
    expect(existsSync(join(process.cwd(), 'public', path)), `missing asset: public${path}`).toBe(true);
  });
});

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
