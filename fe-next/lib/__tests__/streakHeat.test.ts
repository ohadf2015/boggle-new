/**
 * Streak heat map — tier art + escalating background.
 *
 * The thresholds themselves are NOT owned here: they live in `STREAK_TIERS`
 * (lib/streakTierRewards.ts), which is shared with the single-player win-streak
 * economy. These tests pin that this module stays a pure art layer over those
 * thresholds, so a heat entry can never drift out of sync with a tier.
 */
import { describe, it, expect } from 'vitest';
import { STREAK_TIERS } from '../streakTierRewards';
import { getStreakHeat, STREAK_HEAT } from '../streakHeat';
import { MASCOT_IMAGES } from '@/components/ui/mascotData';

describe('getStreakHeat', () => {
  it('gives every tier in STREAK_TIERS a heat entry', () => {
    for (const tier of STREAK_TIERS) {
      expect(STREAK_HEAT[tier.id], `missing heat for tier ${tier.id}`).toBeDefined();
    }
  });

  it('points every heat entry at a registered mascot asset', () => {
    for (const heat of Object.values(STREAK_HEAT)) {
      expect(MASCOT_IMAGES[heat.mascot], `unregistered mascot ${heat.mascot}`).toBeTruthy();
    }
  });

  it('clamps a zero or negative streak to the coolest tier', () => {
    expect(getStreakHeat(0).id).toBe('starting');
    expect(getStreakHeat(-5).id).toBe('starting');
  });

  // Boundary days: the day BEFORE a threshold must still be the cooler tier,
  // and the threshold day itself must promote. Off-by-one here would show the
  // wrong mascot on the exact day a player earns a new one.
  it.each([
    [1, 'starting'],
    [2, 'starting'],
    [3, 'hot'],
    [6, 'hot'],
    [7, 'fire'],
    [13, 'fire'],
    [14, 'epic'],
    [29, 'epic'],
    [30, 'legendary'],
    [59, 'legendary'],
    [60, 'mythic'],
    [99, 'mythic'],
    [100, 'immortal'],
    [4000, 'immortal'],
  ])('day %i is tier %s', (days, expected) => {
    expect(getStreakHeat(days).id).toBe(expected);
  });

  it('gets hotter, never repeating a gradient between adjacent tiers', () => {
    const gradients = STREAK_TIERS.map(tier => `${STREAK_HEAT[tier.id].from}${STREAK_HEAT[tier.id].to}`);
    expect(new Set(gradients).size).toBe(STREAK_TIERS.length);
  });

  it('exposes a translation key per tier rather than baked-in English', () => {
    for (const heat of Object.values(STREAK_HEAT)) {
      expect(heat.labelKey).toMatch(/^daily\.streakHeat\./);
    }
  });
});
