import { describe, expect, it } from 'vitest';
import { PERFECT_BONUS, applyLanding, consumeDrop, createRun, spendScramble, tenantsFor, totalScore } from '../run';

describe('applyLanding', () => {
  it('given consecutive perfect drops, when applied, then the combo climbs and pays more each time', () => {
    let run = createRun(1);
    run = applyLanding(run, { quality: 'perfect', wordLen: 3 }).run;
    const first = run.bonus;
    run = applyLanding(run, { quality: 'perfect', wordLen: 3 }).run;

    expect(run.combo).toBe(2);
    expect(first).toBe(PERFECT_BONUS);
    expect(run.bonus - first).toBeGreaterThan(first);
  });

  it('given a sloppy drop after a streak, when applied, then the combo resets', () => {
    let run = createRun(1);
    run = applyLanding(run, { quality: 'perfect', wordLen: 3 }).run;
    run = applyLanding(run, { quality: 'sloppy', wordLen: 3 }).run;

    expect(run.combo).toBe(0);
    expect(run.bestCombo).toBe(1);
  });

  it('given many landings, when applied, then a crate always drops within the pity window', () => {
    // Variable reward must never go silent for a whole run.
    let run = createRun(42);
    const events: string[] = [];
    for (let i = 0; i < 12; i += 1) {
      const out = applyLanding(run, { quality: 'good', wordLen: 4 });
      run = out.run;
      if (out.reward) events.push(out.reward.id);
    }

    expect(events.length).toBeGreaterThan(0);
  });

  it('given the same seed, when replayed, then the same crates drop', () => {
    const play = () => {
      let run = createRun(7);
      const seen: Array<string | null> = [];
      for (let i = 0; i < 15; i += 1) {
        const out = applyLanding(run, { quality: 'good', wordLen: 5 });
        run = out.run;
        seen.push(out.reward?.id ?? null);
      }
      return seen;
    };

    expect(play()).toEqual(play());
  });

  it('given a wide-load crate, when the next floor spawns, then it is wider exactly once', () => {
    const armed = { ...createRun(1), nextWidthMult: 1.3 };
    const first = consumeDrop(armed);
    const second = consumeDrop(first.run);

    expect(first.widthMult).toBe(1.3);
    expect(second.widthMult).toBe(1);
  });

  it('given steady and plumb crates, when floors are hoisted, then each lasts its drop count', () => {
    let run = { ...createRun(1), steadyDrops: 2, plumbDrops: 1 };
    const a = consumeDrop(run);
    run = a.run;
    const b = consumeDrop(run);
    run = b.run;
    const c = consumeDrop(run);

    expect([a.steady, b.steady, c.steady]).toEqual([true, true, false]);
    expect([a.plumb, b.plumb, c.plumb]).toEqual([true, false, false]);
  });

  it('given a steady crate paid on landing, when applied, then the run banks its drops', () => {
    let run = createRun(3);
    let banked = false;
    for (let i = 0; i < 40 && !banked; i += 1) {
      const out = applyLanding(run, { quality: 'perfect', wordLen: 4 });
      run = out.run;
      if (out.reward?.id === 'steady') banked = run.steadyDrops >= 3;
    }
    expect(banked).toBe(true);
  });

  it('given a crate payout, when applied, then its points land in the bonus', () => {
    let run = createRun(42);
    for (let i = 0; i < 12; i += 1) {
      const before = run.bonus;
      const out = applyLanding(run, { quality: 'sloppy', wordLen: 6 });
      run = out.run;
      // Sloppy pays no base points, so any bonus growth is the crate's.
      expect(run.bonus - before).toBe(out.reward?.points ?? 0);
    }
  });
});

describe('spendScramble', () => {
  it('given scrambles in the bank, when spent, then one is used', () => {
    const run = createRun(1);
    expect(spendScramble(run)?.scrambles).toBe(run.scrambles - 1);
  });

  it('given an empty bank, when spent, then refused', () => {
    expect(spendScramble({ ...createRun(1), scrambles: 0 })).toBeNull();
  });
});

describe('totalScore', () => {
  it('given height and bonus, when totalled, then both count', () => {
    expect(totalScore(2, 150)).toBe(350);
  });
});

describe('tenants', () => {
  it('given a longer (wider) word, when it lands well, then more tenants move in', () => {
    expect(tenantsFor('good', 7)).toBeGreaterThan(tenantsFor('good', 4));
  });

  it('given a perfect landing, when scored, then a bonus tenant over a good one', () => {
    expect(tenantsFor('perfect', 5)).toBe(tenantsFor('good', 5) + 1);
  });

  it('given a sloppy landing, when scored, then fewer tenants but never zero', () => {
    expect(tenantsFor('sloppy', 6)).toBeLessThan(tenantsFor('good', 6));
    expect(tenantsFor('sloppy', 3)).toBeGreaterThanOrEqual(1);
  });

  it('given a miss, when scored, then nobody moves in', () => {
    expect(tenantsFor('miss', 9)).toBe(0);
  });

  it('given landings, when applied, then the run counts every tenant and reports the new arrivals', () => {
    const a = applyLanding(createRun(1), { quality: 'good', wordLen: 5 });
    const b = applyLanding(a.run, { quality: 'miss', wordLen: 5 });
    expect(a.tenants).toBe(tenantsFor('good', 5));
    expect(b.tenants).toBe(0);
    expect(b.run.tenants).toBe(a.tenants);
  });
});
