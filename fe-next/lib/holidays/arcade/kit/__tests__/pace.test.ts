import { describe, it, expect } from 'vitest';
import { comboMult, levelAt, LEVEL_S, newPace, stepPace } from '../pace';
import { mulberry32 } from '@/utils/dailyChallenge/prng';

describe('arcade pacing', () => {
  it('Given time passing, then the level rises every 12 seconds', () => {
    expect(LEVEL_S).toBe(12);
    expect([0, 11.9, 12, 24, 59].map(levelAt)).toEqual([0, 0, 1, 2, 4]);
  });

  it('Given any seed, then exactly one surprise fires between 15 and 35 seconds and each level-up is reported once', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const p = newPace(mulberry32(seed));
      const seen: { type: string; at: number }[] = [];
      for (let t = 0; t <= 60; t += 1 / 60) for (const e of stepPace(p, t)) seen.push({ ...e, at: t });
      const surprises = seen.filter((e) => e.type === 'surprise');
      expect(surprises).toHaveLength(1);
      expect(surprises[0].at).toBeGreaterThanOrEqual(15);
      expect(surprises[0].at).toBeLessThanOrEqual(35);
      expect(seen.filter((e) => e.type === 'level').map((e) => Math.round(e.at))).toEqual([12, 24, 36, 48, 60]);
    }
  });

  it('Given a combo, then the multiplier steps up every 5 in a row and tops out at x4', () => {
    expect([0, 4, 5, 9, 10, 15, 40].map(comboMult)).toEqual([1, 1, 2, 2, 3, 4, 4]);
  });
});
