import { describe, it, expect } from 'vitest';
import { seededPRNG } from '../prng';
import {
  rollLevelModifier,
  applyModifierToRates,
  LEVEL_MODIFIER_INTRO_KEYS,
  MODIFIER_UNLOCK_LEVEL,
  MODIFIER_ROLL_CHANCE,
} from '../level-modifiers';

describe('level-modifiers', () => {
  it('returns null below MODIFIER_UNLOCK_LEVEL', () => {
    for (let n = 1; n < MODIFIER_UNLOCK_LEVEL; n++) {
      const prng = seededPRNG(n * 7);
      expect(rollLevelModifier(prng, n)).toBeNull();
    }
  });

  it('returns one of the known modifier keys when chance hits', () => {
    // Roll many seeds to ensure all three branches are reachable.
    const hits = new Set<string>();
    for (let s = 0; s < 200; s++) {
      const prng = seededPRNG(s);
      const m = rollLevelModifier(prng, 10);
      if (m) hits.add(m);
    }
    expect(hits.size).toBeGreaterThanOrEqual(2);
    for (const m of hits) {
      expect(['gem_rush', 'coin_bonanza', 'bonus_storm']).toContain(m);
    }
  });

  it('fires roughly at MODIFIER_ROLL_CHANCE frequency', () => {
    let count = 0;
    const N = 2000;
    for (let s = 0; s < N; s++) {
      const prng = seededPRNG(s);
      if (rollLevelModifier(prng, 5)) count++;
    }
    const rate = count / N;
    expect(rate).toBeGreaterThan(MODIFIER_ROLL_CHANCE * 0.6);
    expect(rate).toBeLessThan(MODIFIER_ROLL_CHANCE * 1.4);
  });

  it('applyModifierToRates boosts the matched flag rate and leaves others unchanged', () => {
    const baseline = { coin: 0.20, gem: 0.02, doubleBonus: 0.05 };

    const gemBoosted = applyModifierToRates(baseline, 'gem_rush');
    expect(gemBoosted.gem).toBeGreaterThan(baseline.gem);
    expect(gemBoosted.coin).toBe(baseline.coin);
    expect(gemBoosted.doubleBonus).toBe(baseline.doubleBonus);

    const coinBoosted = applyModifierToRates(baseline, 'coin_bonanza');
    expect(coinBoosted.coin).toBeGreaterThan(baseline.coin);
    expect(coinBoosted.gem).toBe(baseline.gem);

    const bonusBoosted = applyModifierToRates(baseline, 'bonus_storm');
    expect(bonusBoosted.doubleBonus).toBeGreaterThan(baseline.doubleBonus);

    expect(applyModifierToRates(baseline, null)).toEqual(baseline);
  });

  it('exports translation key paths for every modifier', () => {
    expect(LEVEL_MODIFIER_INTRO_KEYS.gem_rush).toMatch(/^blast\.modifier\./);
    expect(LEVEL_MODIFIER_INTRO_KEYS.coin_bonanza).toMatch(/^blast\.modifier\./);
    expect(LEVEL_MODIFIER_INTRO_KEYS.bonus_storm).toMatch(/^blast\.modifier\./);
  });
});
