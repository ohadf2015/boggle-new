/**
 * Skill Effects Tests
 *
 * TDD tests for skill effect application.
 */

import {
  getActiveEffects,
  calculateEffectValue,
  getMaxPowerUpSlots,
  getPowerUpCooldownMultiplier,
  getComboMultiplierBonus,
  getBossDamageMultiplier,
  getHintDuration,
  hasAdvancedMultiplier,
  getLongWordDamageMultiplier,
  getChainDurationBonus,
} from './skillEffects';

describe('getActiveEffects', () => {
  it('returns empty array when no skills unlocked', () => {
    const effects = getActiveEffects(new Set());
    expect(effects).toEqual([]);
  });

  it('returns effect for unlocked skill', () => {
    const effects = getActiveEffects(new Set(['power_strike']));
    expect(effects).toContainEqual(
      expect.objectContaining({
        effectId: 'long_word_bonus',
      })
    );
  });

  it('returns multiple effects for multiple skills', () => {
    const effects = getActiveEffects(new Set(['power_strike', 'chain_mastery']));
    expect(effects.length).toBe(2);
  });

  it('ignores unknown skill IDs', () => {
    const effects = getActiveEffects(new Set(['power_strike', 'unknown_skill']));
    expect(effects.length).toBe(1);
  });
});

describe('calculateEffectValue', () => {
  it('returns base value when effect not active', () => {
    const value = calculateEffectValue('nonexistent', 100, new Set());
    expect(value).toBe(100);
  });

  it('applies multiplier effect', () => {
    // combo_amplifier adds 0.25 to combo multiplier
    const effects = getActiveEffects(new Set(['combo_amplifier']));
    const effect = effects.find((e) => e.effectId === 'combo_multiplier_boost');
    expect(effect?.modifier).toEqual({ type: 'add', value: 0.25 });
  });
});

describe('getMaxPowerUpSlots', () => {
  it('returns 1 with no skills', () => {
    expect(getMaxPowerUpSlots(new Set())).toBe(1);
  });

  it('returns 2 with power_slot_2 unlocked', () => {
    expect(getMaxPowerUpSlots(new Set(['power_slot_2']))).toBe(2);
  });

  it('returns 3 with both power slot skills unlocked', () => {
    expect(getMaxPowerUpSlots(new Set(['power_slot_2', 'power_slot_3']))).toBe(3);
  });

  it('returns 2 with only power_slot_3 (counts each slot skill)', () => {
    // power_slot_3 requires power_slot_2, but we just count
    expect(getMaxPowerUpSlots(new Set(['power_slot_3']))).toBe(2);
  });
});

describe('getPowerUpCooldownMultiplier', () => {
  it('returns 1.0 with no skills', () => {
    expect(getPowerUpCooldownMultiplier(new Set())).toBe(1.0);
  });

  it('reduces cooldown with quick_charge', () => {
    // quick_charge reduces cooldown by 10s on a 60s base = ~0.833 multiplier
    const multiplier = getPowerUpCooldownMultiplier(new Set(['quick_charge']));
    expect(multiplier).toBeCloseTo(0.833, 2);
  });
});

describe('getComboMultiplierBonus', () => {
  it('returns 0 with no skills', () => {
    expect(getComboMultiplierBonus(new Set())).toBe(0);
  });

  it('returns 0.25 with combo_amplifier', () => {
    expect(getComboMultiplierBonus(new Set(['combo_amplifier']))).toBe(0.25);
  });
});

describe('getBossDamageMultiplier', () => {
  it('returns 1.0 with no skills', () => {
    expect(getBossDamageMultiplier(new Set())).toBe(1.0);
  });

  it('returns 1.15 with boss_slayer', () => {
    expect(getBossDamageMultiplier(new Set(['boss_slayer']))).toBe(1.15);
  });

  it('returns 1.15 with boss_slayer and power_strike (power_strike handled separately)', () => {
    // power_strike: +25% for 6+ letter words (handled per word in getLongWordDamageMultiplier)
    // boss_slayer: +15% to all boss damage
    expect(getBossDamageMultiplier(new Set(['boss_slayer', 'power_strike']))).toBe(1.15);
  });
});

describe('getHintDuration', () => {
  it('returns 5000ms with no skills', () => {
    expect(getHintDuration(new Set())).toBe(5000);
  });

  it('returns 10000ms with extended_hints', () => {
    expect(getHintDuration(new Set(['extended_hints']))).toBe(10000);
  });
});

describe('hasAdvancedMultiplier', () => {
  it('returns false with no skills', () => {
    expect(hasAdvancedMultiplier(new Set())).toBe(false);
  });

  it('returns true with advanced_multiplier unlocked', () => {
    expect(hasAdvancedMultiplier(new Set(['advanced_multiplier']))).toBe(true);
  });
});

describe('getLongWordDamageMultiplier', () => {
  it('returns 1.0 for short words with no skills', () => {
    expect(getLongWordDamageMultiplier(5, new Set())).toBe(1.0);
  });

  it('returns 1.0 for long words with no skills', () => {
    expect(getLongWordDamageMultiplier(6, new Set())).toBe(1.0);
  });

  it('returns 1.25 for 6+ letter words with power_strike', () => {
    expect(getLongWordDamageMultiplier(6, new Set(['power_strike']))).toBe(1.25);
  });

  it('returns 1.0 for 5 letter words with power_strike', () => {
    expect(getLongWordDamageMultiplier(5, new Set(['power_strike']))).toBe(1.0);
  });

  it('returns 1.25 for 7+ letter words with power_strike', () => {
    expect(getLongWordDamageMultiplier(7, new Set(['power_strike']))).toBe(1.25);
  });
});

describe('getChainDurationBonus', () => {
  it('returns 0 with no skills', () => {
    expect(getChainDurationBonus(new Set())).toBe(0);
  });

  it('returns 3000ms with chain_mastery', () => {
    expect(getChainDurationBonus(new Set(['chain_mastery']))).toBe(3000);
  });
});
