/**
 * Tests for ascensionConfig — Sprint 3 backfill (M20)
 * Verifies ascension level lookup, modifier defaults, and gold accumulation.
 */

import {
  ASCENSION_LEVELS,
  MAX_ASCENSION,
  getAscensionLevel,
  getAscensionModifiers,
  getAscensionTotalGold,
} from '../ascensionConfig';

describe('ASCENSION_LEVELS', () => {
  it('has exactly 10 levels', () => {
    expect(ASCENSION_LEVELS).toHaveLength(10);
  });

  it('levels are numbered 1 through 10', () => {
    const levels = ASCENSION_LEVELS.map(a => a.level);
    expect(levels).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('MAX_ASCENSION equals 10', () => {
    expect(MAX_ASCENSION).toBe(10);
  });

  it('bossHpMultiplier increases monotonically', () => {
    for (let i = 1; i < ASCENSION_LEVELS.length; i++) {
      expect(ASCENSION_LEVELS[i].modifiers.bossHpMultiplier)
        .toBeGreaterThan(ASCENSION_LEVELS[i - 1].modifiers.bossHpMultiplier);
    }
  });

  it('timerReduction increases monotonically', () => {
    for (let i = 1; i < ASCENSION_LEVELS.length; i++) {
      expect(ASCENSION_LEVELS[i].modifiers.timerReduction)
        .toBeGreaterThan(ASCENSION_LEVELS[i - 1].modifiers.timerReduction);
    }
  });

  it('every level has a gold reward > 0', () => {
    for (const asc of ASCENSION_LEVELS) {
      expect(asc.reward.gold).toBeGreaterThan(0);
    }
  });
});

describe('getAscensionLevel', () => {
  it('returns correct level for valid inputs', () => {
    expect(getAscensionLevel(1)?.level).toBe(1);
    expect(getAscensionLevel(5)?.level).toBe(5);
    expect(getAscensionLevel(10)?.level).toBe(10);
  });

  it('returns undefined for level 0', () => {
    expect(getAscensionLevel(0)).toBeUndefined();
  });

  it('returns undefined for level > 10', () => {
    expect(getAscensionLevel(11)).toBeUndefined();
  });

  it('returns undefined for negative level', () => {
    expect(getAscensionLevel(-1)).toBeUndefined();
  });
});

describe('getAscensionModifiers', () => {
  it('returns default modifiers for level <= 0', () => {
    const mods = getAscensionModifiers(0);
    expect(mods.bossHpMultiplier).toBe(1);
    expect(mods.timerReduction).toBe(0);
    expect(mods.extraObjectives).toBe(0);
    expect(mods.iceTileMultiplier).toBe(1);
    expect(mods.minWordLengthBonus).toBe(0);
  });

  it('returns defaults for negative level', () => {
    const mods = getAscensionModifiers(-5);
    expect(mods.bossHpMultiplier).toBe(1);
  });

  it('returns correct modifiers for valid level', () => {
    const mods = getAscensionModifiers(3);
    expect(mods.bossHpMultiplier).toBe(1.35);
    expect(mods.timerReduction).toBe(15);
    expect(mods.extraObjectives).toBe(1);
  });

  it('returns max level modifiers for level > 10', () => {
    const mods = getAscensionModifiers(99);
    const maxMods = ASCENSION_LEVELS[9].modifiers;
    expect(mods).toEqual(maxMods);
  });
});

describe('getAscensionTotalGold', () => {
  it('returns 0 for level 0', () => {
    expect(getAscensionTotalGold(0)).toBe(0);
  });

  it('returns first level gold for level 1', () => {
    expect(getAscensionTotalGold(1)).toBe(500);
  });

  it('accumulates gold across levels', () => {
    // Level 1: 500, Level 2: 750 → total 1250
    expect(getAscensionTotalGold(2)).toBe(1250);
  });

  it('total gold at max level sums all rewards', () => {
    const total = ASCENSION_LEVELS.reduce((sum, a) => sum + a.reward.gold, 0);
    expect(getAscensionTotalGold(10)).toBe(total);
  });
});
