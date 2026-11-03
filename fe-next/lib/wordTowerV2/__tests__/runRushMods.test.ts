import { describe, expect, it } from 'vitest';
import { densityForTrait } from '../engine';
import { rollReward } from '../rewards';
import { GOLD_BONUS, PERFECT_BONUS, applyLanding, createRun } from '../run';

const seq = (...vals: number[]) => {
  let i = 0;
  return () => vals[Math.min(i++, vals.length - 1)];
};

function streak(n: number, mods?: Parameters<typeof applyLanding>[2]) {
  let run = createRun(1);
  let last = 0;
  for (let i = 0; i < n; i++) {
    const out = applyLanding(run, { quality: 'perfect', wordLen: 3 }, mods);
    run = out.run;
    last = out.points;
  }
  return { run, last };
}

describe('applyLanding rush mods', () => {
  it('given no mods, when a perfect streak lands, then points match the classic table', () => {
    expect(streak(3).last).toBe(PERFECT_BONUS * 3);
    expect(streak(3, {}).last).toBe(PERFECT_BONUS * 3);
  });

  it('given a perfect bonus multiplier, when a perfect lands, then the whole perfect payout scales', () => {
    expect(streak(1, { perfectBonusMul: 1.5 }).last).toBe(75);
    expect(streak(3, { perfectBonusMul: 1.5 }).last).toBe(225);
  });

  it('given a combo gain multiplier, when a streak lands, then only the streak part scales and the combo stays an integer', () => {
    expect(streak(1, { comboGainMul: 1.5 }).last).toBe(PERFECT_BONUS);
    const { run, last } = streak(3, { comboGainMul: 1.5 });
    expect(last).toBe(PERFECT_BONUS * (1 + 2 * 1.5));
    expect(run.combo).toBe(3);
  });

  it('given an anvil block, when its perfect lands, then its streak part gains x1.5', () => {
    let run = createRun(1);
    run = applyLanding(run, { quality: 'perfect', wordLen: 3 }).run;
    const out = applyLanding(run, { quality: 'perfect', wordLen: 3 }, { trait: 'anvil' });
    expect(out.points).toBe(PERFECT_BONUS * (1 + 1 * 1.5));
  });

  it('given a gold block, when it lands without missing, then it pays one extra floor of height points into points and bonus', () => {
    const run = createRun(1);
    const good = applyLanding(run, { quality: 'good', wordLen: 3 }, { trait: 'gold' });
    const plain = applyLanding(run, { quality: 'good', wordLen: 3 });
    expect(good.points - plain.points).toBe(GOLD_BONUS);
    expect(good.run.bonus - plain.run.bonus).toBe(GOLD_BONUS);
    expect(applyLanding(run, { quality: 'miss', wordLen: 3 }, { trait: 'gold' }).points).toBe(0);
  });

  it('given a lucky block, when it lands without missing, then a crate always opens', () => {
    for (let seed = 1; seed < 40; seed++) {
      const run = createRun(seed);
      expect(applyLanding(run, { quality: 'sloppy', wordLen: 3 }, { trait: 'lucky' }).reward).not.toBeNull();
    }
    expect(applyLanding(createRun(3), { quality: 'miss', wordLen: 3 }, { trait: 'lucky' }).reward).toBeNull();
  });

  it('given neutral mods, when replayed, then the crate sequence is the same as without mods', () => {
    const play = (mods?: Parameters<typeof applyLanding>[2]) => {
      let run = createRun(9);
      const ids: (string | null)[] = [];
      for (let i = 0; i < 20; i++) {
        const out = applyLanding(run, { quality: i % 3 === 0 ? 'perfect' : 'good', wordLen: 5 }, mods);
        run = out.run;
        ids.push(out.reward?.id ?? null);
      }
      return ids;
    };
    expect(play({ trait: 'plain', chanceMul: 1, wordLenBonusPerLetter: 0 })).toEqual(play());
  });
});

describe('rollReward rush mods', () => {
  const ctx = { quality: 'good' as const, combo: 0, sinceLast: 0, floors: 2, wordLen: 3 };

  it('given a crate chance multiplier, when the roll is just above the base chance, then it now pays', () => {
    expect(rollReward(seq(0.3, 0), ctx)).toBeNull();
    expect(rollReward(seq(0.3, 0), { ...ctx, chanceMul: 1.5 })).not.toBeNull();
  });

  it('given a per-letter perk, when a long word lands, then each letter over four adds chance', () => {
    const long = { ...ctx, wordLen: 6 };
    expect(rollReward(seq(0.35, 0), long)).toBeNull();
    expect(rollReward(seq(0.35, 0), { ...long, bonusPerLetter: 0.05 })).not.toBeNull();
  });

  it('given a guaranteed roll, when a decent landing lands, then a crate always pays but a miss never does', () => {
    expect(rollReward(seq(0.99, 0), { ...ctx, guaranteed: true })).not.toBeNull();
    expect(rollReward(seq(0), { ...ctx, quality: 'miss', guaranteed: true })).toBeNull();
  });
});

describe('densityForTrait', () => {
  it('given each trait, then feather is lighter, anvil heavier and the rest use the default', () => {
    expect(densityForTrait('feather')).toBe(0.001);
    expect(densityForTrait('anvil')).toBe(0.0026);
    expect(densityForTrait('plain')).toBeUndefined();
    expect(densityForTrait('gold')).toBeUndefined();
  });
});
