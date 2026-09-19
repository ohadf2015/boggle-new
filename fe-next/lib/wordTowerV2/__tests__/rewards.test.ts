import { describe, expect, it } from 'vitest';
import { REWARDS, type RewardId, payoutFor, rollReward, steadySwing } from '../rewards';
import { SWING } from '../crane';

/** Deterministic rng from a fixed list, cycling. */
const seq = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe('rollReward', () => {
  it('given a miss, when rolled, then nothing — rewards follow good play', () => {
    expect(rollReward(seq(0), { quality: 'miss', combo: 0, sinceLast: 9, floors: 5 })).toBeNull();
  });

  it('given a long dry spell, when a decent floor lands, then the pity guarantees a crate', () => {
    expect(rollReward(seq(0.999), { quality: 'sloppy', combo: 0, sinceLast: 4, floors: 5 })).not.toBeNull();
  });

  it('given an unlucky roll early, when rolled, then it can come up empty (variable, not fixed)', () => {
    expect(rollReward(seq(0.999), { quality: 'good', combo: 0, sinceLast: 0, floors: 2 })).toBeNull();
  });

  it('given a perfect drop, when rolled, then it is likelier than a sloppy one', () => {
    const hits = (quality: 'perfect' | 'sloppy') => {
      let n = 0;
      for (let i = 0; i < 1000; i += 1) {
        const r = (i * 0.618) % 1;
        if (rollReward(seq(r, 0.5), { quality, combo: 0, sinceLast: 0, floors: 6 })) n += 1;
      }
      return n;
    };
    expect(hits('perfect')).toBeGreaterThan(hits('sloppy') * 2);
  });

  it('given a combo milestone, when rolled, then a rare crate (rebar or jackpot) is guaranteed', () => {
    for (const combo of [3, 6, 9]) {
      const id = rollReward(seq(0.999, 0.1), { quality: 'perfect', combo, sinceLast: 0, floors: 8 });
      expect(['rebar', 'jackpot']).toContain(id);
    }
  });

  it('given a short tower, when rolled, then never rebar (nothing below to weld)', () => {
    for (let i = 0; i < 200; i += 1) {
      const id = rollReward(seq(0, i / 200), { quality: 'perfect', combo: 0, sinceLast: 9, floors: 2 });
      expect(id).not.toBe('rebar');
    }
  });

  it('given many rolls, when tallied, then every reward shows up (true variety)', () => {
    const seen = new Set<RewardId>();
    for (let i = 0; i < 400; i += 1) {
      const id = rollReward(seq(0, i / 400), { quality: 'perfect', combo: 1, sinceLast: 9, floors: 10 });
      if (id) seen.add(id);
    }
    expect(seen.size).toBe(REWARDS.length);
  });
});

describe('payoutFor', () => {
  it('given each reward, when paid, then it changes gameplay, not just the score', () => {
    expect(payoutFor('steady', 5).steadyDrops).toBeGreaterThan(0);
    expect(payoutFor('plumb', 5).plumbDrops).toBeGreaterThan(0);
    expect(payoutFor('wide', 5).widthMult).toBeGreaterThan(1);
    expect(payoutFor('rebar', 5).rebar).toBe(true);
    expect(payoutFor('scramble', 5).scrambles).toBeGreaterThan(0);
  });

  it('given a taller tower, when a jackpot pays, then it pays more', () => {
    expect(payoutFor('jackpot', 20).points).toBeGreaterThan(payoutFor('jackpot', 2).points);
  });
});

describe('steadySwing', () => {
  it('given the steady crane, when swung, then slower and narrower than normal', () => {
    const s = steadySwing(SWING);
    expect(s.periodMs).toBeGreaterThan(SWING.periodMs);
    expect(s.amplitudeRad).toBeLessThan(SWING.amplitudeRad);
  });
});
