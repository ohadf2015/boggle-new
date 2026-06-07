/**
 * TDD for the Blast "treasure roll" — ethical variable reward (2026-06-07 fun pass).
 *
 * Council guardrails encoded as tests:
 *  - FLOOR RULE: a roll never pays LESS than the deterministic base (bonus >= 0,
 *    total >= base). Randomness is upside-only.
 *  - CAPPED: bonus can't exceed `base * maxBonusRatio` (anti-cheat ceiling).
 *  - DETERMINISTIC: same (seed, base, context) → identical result (server-verifiable,
 *    can't be re-rolled by retrying).
 *  - SKILL-BIASED: combo depth / cascade depth / special tiles raise jackpot odds.
 */
import { rollTreasure } from '../blastTreasureRoll';

describe('rollTreasure — floor rule (upside only)', () => {
  it('never pays less than base; bonus is always >= 0', () => {
    for (let s = 0; s < 500; s++) {
      const r = rollTreasure({ seed: s, base: 40 });
      expect(r.bonus).toBeGreaterThanOrEqual(0);
      expect(r.total).toBeGreaterThanOrEqual(40);
      expect(r.total).toBe(40 + r.bonus);
    }
  });

  it('base of 0 yields no reward to amplify (common, bonus 0)', () => {
    const r = rollTreasure({ seed: 7, base: 0 });
    expect(r.tier).toBe('common');
    expect(r.bonus).toBe(0);
    expect(r.total).toBe(0);
  });
});

describe('rollTreasure — capped', () => {
  it('bonus never exceeds base * maxBonusRatio (default 1.0)', () => {
    for (let s = 0; s < 500; s++) {
      const r = rollTreasure({ seed: s, base: 50, comboLevel: 9, cascadeDepth: 9, hasSpecial: true });
      expect(r.bonus).toBeLessThanOrEqual(50);
    }
  });

  it('honours a custom maxBonusRatio', () => {
    for (let s = 0; s < 200; s++) {
      const r = rollTreasure({ seed: s, base: 100, comboLevel: 9, cascadeDepth: 9, hasSpecial: true, maxBonusRatio: 0.5 });
      expect(r.bonus).toBeLessThanOrEqual(50);
    }
  });
});

describe('rollTreasure — deterministic', () => {
  it('same input → identical output', () => {
    const a = rollTreasure({ seed: 'level-3:word-5', base: 40, comboLevel: 2 });
    const b = rollTreasure({ seed: 'level-3:word-5', base: 40, comboLevel: 2 });
    expect(a).toEqual(b);
  });

  it('different seeds diverge across the sample', () => {
    const tiers = new Set<string>();
    for (let s = 0; s < 200; s++) tiers.add(rollTreasure({ seed: s, base: 40 }).tier);
    expect(tiers.size).toBeGreaterThan(1);
  });
});

describe('rollTreasure — tiers', () => {
  it('common tier has zero bonus; lucky/jackpot have positive bonus', () => {
    for (let s = 0; s < 300; s++) {
      const r = rollTreasure({ seed: s, base: 60 });
      if (r.tier === 'common') expect(r.bonus).toBe(0);
      else expect(r.bonus).toBeGreaterThan(0);
    }
  });

  it('jackpot pays more than lucky on average', () => {
    let luckySum = 0, luckyN = 0, jackSum = 0, jackN = 0;
    for (let s = 0; s < 2000; s++) {
      const r = rollTreasure({ seed: s, base: 100, comboLevel: 3, hasSpecial: true });
      if (r.tier === 'lucky') { luckySum += r.bonus; luckyN++; }
      if (r.tier === 'jackpot') { jackSum += r.bonus; jackN++; }
    }
    expect(luckyN).toBeGreaterThan(0);
    expect(jackN).toBeGreaterThan(0);
    expect(jackSum / jackN).toBeGreaterThan(luckySum / luckyN);
  });
});

describe('rollTreasure — skill bias', () => {
  it('high combo + cascade + special raises jackpot frequency vs baseline', () => {
    const count = (opts: Parameters<typeof rollTreasure>[0]) => {
      let n = 0;
      for (let s = 0; s < 2000; s++) {
        if (rollTreasure({ ...opts, seed: s }).tier === 'jackpot') n++;
      }
      return n;
    };
    const baseline = count({ seed: 0, base: 40 });
    const boosted = count({ seed: 0, base: 40, comboLevel: 5, cascadeDepth: 4, hasSpecial: true });
    expect(boosted).toBeGreaterThan(baseline);
  });
});
