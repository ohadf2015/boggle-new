import { describe, expect, it } from 'vitest';
import { PERKS, combineMods, rollDraft } from '../perks';
import type { PerkId } from '../types';

const ALL_IDS: PerkId[] = [
  'wideLoad',
  'steadyHands',
  'longWordBonus',
  'perfectStreak',
  'goldRush',
  'slowSwing',
  'safetyNet',
  'luckyCrates',
  'magnetBase',
  'momentum',
];

describe('PERKS', () => {
  it('defines each PerkId exactly once', () => {
    expect(PERKS.map((p) => p.id).sort()).toEqual([...ALL_IDS].sort());
  });

  it('gives every perk a glyph and at least one mod', () => {
    for (const perk of PERKS) {
      expect(perk.glyph.length).toBeGreaterThan(0);
      expect(Object.keys(perk.mods).length).toBeGreaterThan(0);
    }
  });

  it('covers all three rarities', () => {
    expect(new Set(PERKS.map((p) => p.rarity))).toEqual(new Set(['common', 'rare', 'epic']));
  });
});

describe('combineMods', () => {
  it('returns neutral defaults when nothing is owned', () => {
    expect(combineMods([])).toEqual({
      widthMul: 1,
      swingSpeedMul: 1,
      perfectWindowMul: 1,
      perfectBonusMul: 1,
      wordLenBonusPerLetter: 0,
      comboGainMul: 1,
      crateChanceMul: 1,
      goldChanceMul: 1,
      freeRecoveries: 0,
    });
  });

  it('applies the specified single-perk values', () => {
    expect(combineMods(['wideLoad']).widthMul).toBeCloseTo(1.12);
    expect(combineMods(['steadyHands']).perfectWindowMul).toBeCloseTo(1.25);
    expect(combineMods(['longWordBonus']).wordLenBonusPerLetter).toBeCloseTo(0.05);
    expect(combineMods(['perfectStreak']).comboGainMul).toBeCloseTo(1.5);
    expect(combineMods(['goldRush']).goldChanceMul).toBeCloseTo(2);
    expect(combineMods(['slowSwing']).swingSpeedMul).toBeCloseTo(0.88);
    expect(combineMods(['safetyNet']).freeRecoveries).toBe(1);
    expect(combineMods(['luckyCrates']).crateChanceMul).toBeCloseTo(1.5);
    expect(combineMods(['momentum']).perfectBonusMul).toBeCloseTo(1.5);
    const magnet = combineMods(['magnetBase']);
    expect(magnet.perfectWindowMul).toBeCloseTo(1.1);
    expect(magnet.widthMul).toBeCloseTo(1.04);
  });

  it('multiplies Mul fields and sums additive fields across perks', () => {
    const mods = combineMods(['steadyHands', 'magnetBase', 'wideLoad', 'safetyNet', 'longWordBonus']);
    expect(mods.perfectWindowMul).toBeCloseTo(1.25 * 1.1);
    expect(mods.widthMul).toBeCloseTo(1.12 * 1.04);
    expect(mods.freeRecoveries).toBe(1);
    expect(mods.wordLenBonusPerLetter).toBeCloseTo(0.05);
  });

  it('stacks a perk owned twice', () => {
    const mods = combineMods(['safetyNet', 'safetyNet', 'wideLoad', 'wideLoad']);
    expect(mods.freeRecoveries).toBe(2);
    expect(mods.widthMul).toBeCloseTo(1.12 * 1.12);
  });
});

describe('rollDraft', () => {
  it('returns 3 distinct perks', () => {
    const draft = rollDraft(42, 5, []);
    expect(draft).toHaveLength(3);
    expect(new Set(draft.map((p) => p.id)).size).toBe(3);
  });

  it('is deterministic for the same seed and floor', () => {
    expect(rollDraft(1234, 10, ['wideLoad'])).toEqual(rollDraft(1234, 10, ['wideLoad']));
  });

  it('varies across floors of the same run', () => {
    const draws = new Set<string>();
    for (let floor = 5; floor <= 100; floor += 5) {
      draws.add(rollDraft(7, floor, []).map((p) => p.id).join(','));
    }
    expect(draws.size).toBeGreaterThan(5);
  });

  it('never offers an owned perk', () => {
    const owned: PerkId[] = ['wideLoad', 'steadyHands', 'goldRush', 'momentum'];
    for (let seed = 0; seed < 50; seed++) {
      for (const perk of rollDraft(seed, 5, owned)) {
        expect(owned).not.toContain(perk.id);
      }
    }
  });

  it('returns what remains when fewer than 3 perks are left', () => {
    const owned = ALL_IDS.filter((id) => id !== 'safetyNet' && id !== 'luckyCrates');
    const draft = rollDraft(9, 50, owned);
    expect(draft.map((p) => p.id).sort()).toEqual(['luckyCrates', 'safetyNet']);
    expect(rollDraft(9, 55, ALL_IDS)).toEqual([]);
  });

  it('weights rarity: common shows up most, epic least', () => {
    const counts = { common: 0, rare: 0, epic: 0 };
    for (let seed = 0; seed < 2000; seed++) {
      counts[rollDraft(seed, 5, [])[0].rarity]++;
    }
    expect(counts.common).toBeGreaterThan(counts.rare);
    expect(counts.rare).toBeGreaterThan(counts.epic);
    expect(counts.epic).toBeGreaterThan(0);
  });
});
