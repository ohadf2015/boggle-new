import { describe, expect, it } from 'vitest';
import {
  type Estate,
  type RunSummary,
  applyRaidToAttacker,
  applyRaidToDefender,
  applyRepair,
  applyRun,
  applyUpgrade,
  advanceDistrict,
  canUpgrade,
  chestOdds,
  chestSeed,
  clampRunSummary,
  districtComplete,
  emptyEstate,
  expectedChestCoins,
  raidOutcome,
  repairCost,
  rollChest,
  runCoins,
  runQuality,
  upgradeCost,
} from '../estate';
import { MAX_DISTRICT, MAX_PLOT_LEVEL, PLOT_SLOTS } from '../estateCatalog';

/** What a middling run looks like (the sim's "median play"). */
const MEDIAN_RUN: RunSummary = { floors: 12, perfects: 4, bestCombo: 3, crates: 2, heightM: 36 };

const withPlots = (levels: number[], extra: Partial<Estate> = {}): Estate => ({
  ...emptyEstate(),
  plots: PLOT_SLOTS.map((slot, i) => ({ slot, level: levels[i] ?? 0, damaged: false })),
  ...extra,
});

describe('runCoins', () => {
  it('given an empty run, when paid, then it still pays a little (never zero)', () => {
    expect(runCoins({ floors: 0, perfects: 0, bestCombo: 0, crates: 0, heightM: 0 })).toBeGreaterThan(0);
  });

  it('given a better run, when paid, then it pays more', () => {
    const worse = runCoins(MEDIAN_RUN);
    const better = runCoins({ ...MEDIAN_RUN, floors: 20, perfects: 10, bestCombo: 6 });
    expect(better).toBeGreaterThan(worse);
  });

  it('given a forged summary, when paid, then the fields are clamped and the payout is capped', () => {
    const forged = runCoins({ floors: 1e9, perfects: 1e9, bestCombo: 1e9, crates: 1e9, heightM: 1e9 });
    const honestMax = runCoins(clampRunSummary({ floors: 1e9, perfects: 1e9, bestCombo: 1e9, crates: 1e9, heightM: 1e9 }));
    expect(forged).toBe(honestMax);
    expect(forged).toBeLessThanOrEqual(3000);
  });

  it('given perfects above floors, when clamped, then perfects <= floors and combo <= perfects', () => {
    const s = clampRunSummary({ floors: 5, perfects: 9, bestCombo: 9, crates: 99, heightM: -4 });
    expect(s.perfects).toBe(5);
    expect(s.bestCombo).toBe(5);
    expect(s.crates).toBeLessThanOrEqual(5);
    expect(s.heightM).toBe(0);
  });

  it('given a later district and a vault bonus, when paid, then yields grow', () => {
    const base = runCoins(MEDIAN_RUN);
    expect(runCoins(MEDIAN_RUN, { district: 3 })).toBeGreaterThan(base);
    expect(runCoins(MEDIAN_RUN, { coinMult: 1.5 })).toBeGreaterThan(base);
  });
});

describe('rollChest', () => {
  it('given the same seed, when rolled twice, then it is identical', () => {
    expect(rollChest(1234, 0.5)).toEqual(rollChest(1234, 0.5));
  });

  it('given any seed, when rolled, then the chest is never empty', () => {
    for (let s = 1; s < 3000; s += 1) expect(rollChest(s, 0.5).coins).toBeGreaterThan(0);
  });

  it('given median quality, when rolled 20k times, then rare ~15% and epic ~3%', () => {
    const n = 20000;
    let rare = 0;
    let epic = 0;
    for (let s = 1; s <= n; s += 1) {
      const t = rollChest(chestSeed('player', s), runQuality(MEDIAN_RUN)).tier;
      if (t === 'rare') rare += 1;
      if (t === 'epic') epic += 1;
    }
    expect(rare / n).toBeGreaterThan(0.12);
    expect(rare / n).toBeLessThan(0.18);
    expect(epic / n).toBeGreaterThan(0.02);
    expect(epic / n).toBeLessThan(0.045);
  });

  it('given a better run, when odds are computed, then rare and epic odds rise', () => {
    expect(chestOdds(1).rare).toBeGreaterThan(chestOdds(0).rare);
    expect(chestOdds(1).epic).toBeGreaterThan(chestOdds(0).epic);
  });

  it('given tiers, when rolled, then rare carries a golden brick and epic a blueprint', () => {
    let sawRare = false;
    let sawEpic = false;
    for (let s = 1; s < 5000 && !(sawRare && sawEpic); s += 1) {
      const c = rollChest(s, 1);
      if (c.tier === 'rare') {
        sawRare = true;
        expect(c.bricks).toBe(1);
      }
      if (c.tier === 'epic') {
        sawEpic = true;
        expect(c.blueprints).toBe(1);
      }
    }
    expect(sawRare && sawEpic).toBe(true);
  });
});

describe('upgrade economy', () => {
  it('given a fresh estate, when one median run is banked, then the first upgrade is affordable', () => {
    const cheapest = Math.min(...PLOT_SLOTS.map((slot) => upgradeCost(1, slot, 0)));
    expect(runCoins(MEDIAN_RUN)).toBeGreaterThanOrEqual(cheapest);
  });

  it('given district 1, when its full cost is divided by median income, then it takes 15-21 runs (5-7 days at 3/day)', () => {
    let total = 0;
    for (const slot of PLOT_SLOTS) for (let l = 0; l < MAX_PLOT_LEVEL; l += 1) total += upgradeCost(1, slot, l);
    const perRun = runCoins(MEDIAN_RUN) + expectedChestCoins(runQuality(MEDIAN_RUN));
    const runs = total / perRun;
    expect(runs).toBeGreaterThanOrEqual(15);
    expect(runs).toBeLessThanOrEqual(21);
  });

  it('given higher levels and districts, when priced, then the curve rises', () => {
    expect(upgradeCost(1, 'vault', 3)).toBeGreaterThan(upgradeCost(1, 'vault', 2));
    expect(upgradeCost(2, 'vault', 0)).toBeGreaterThan(upgradeCost(1, 'vault', 0));
  });

  it('given enough coins, when upgrading, then coins are spent and the level rises', () => {
    const e = withPlots([], { coins: 1000 });
    const r = applyUpgrade(e, 'vault');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.estate.plots.find((p) => p.slot === 'vault')!.level).toBe(1);
    expect(r.estate.coins).toBe(1000 - upgradeCost(1, 'vault', 0));
    expect(e.coins).toBe(1000); // pure: input untouched
  });

  it('given a blueprint, when upgrading, then the blueprint pays instead of coins', () => {
    const r = applyUpgrade(withPlots([], { coins: 0, blueprints: 1 }), 'landmark');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.estate.blueprints).toBe(0);
    expect(r.estate.coins).toBe(0);
  });

  it('given too few coins, a maxed plot, or a damaged plot, when upgrading, then it is refused with a reason', () => {
    expect(canUpgrade(withPlots([], { coins: 0 }), 'vault')).toMatchObject({ ok: false, reason: 'coins' });
    expect(canUpgrade(withPlots([5], { coins: 1e6 }), 'foundation')).toMatchObject({ ok: false, reason: 'maxed' });
    const damaged = withPlots([2], { coins: 1e6 });
    damaged.plots[0].damaged = true;
    expect(canUpgrade(damaged, 'foundation')).toMatchObject({ ok: false, reason: 'damaged' });
  });
});

describe('repair', () => {
  it('given a damaged plot, when repaired with coins, then it costs less than the upgrade that built it', () => {
    const e = withPlots([3], { coins: 1000 });
    e.plots[0].damaged = true;
    const cost = repairCost(1, 'foundation', 3);
    expect(cost).toBeGreaterThan(0);
    expect(cost).toBeLessThan(upgradeCost(1, 'foundation', 2));
    const r = applyRepair(e, 'foundation');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.estate.plots[0].damaged).toBe(false);
    expect(r.estate.coins).toBe(1000 - cost);
  });

  it('given a golden brick, when repairing, then the brick is used before coins', () => {
    const e = withPlots([3], { coins: 1000, bricks: 1 });
    e.plots[0].damaged = true;
    const r = applyRepair(e, 'foundation');
    expect(r.ok && r.estate.bricks === 0 && r.estate.coins === 1000).toBe(true);
  });

  it('given an intact plot, when repairing, then it is refused', () => {
    expect(applyRepair(withPlots([3], { coins: 1000 }), 'foundation')).toMatchObject({ ok: false, reason: 'intact' });
  });
});

describe('raids', () => {
  const defender = withPlots([2, 4, 1, 0, 3], { coins: 1000, shields: 0 });

  it('given a shield, when raided, then the raid is blocked and one shield is consumed', () => {
    const shielded = { ...defender, shields: 2 };
    const out = raidOutcome({ attackerAccuracy: 1, defender: shielded, revenge: false });
    expect(out.kind).toBe('blocked');
    const after = applyRaidToDefender(shielded, out);
    expect(after.shields).toBe(1);
    expect(after.coins).toBe(1000);
    expect(after.plots).toEqual(shielded.plots);
    expect(out.attackerCoins).toBeGreaterThan(0);
  });

  it('given no shield, when raided, then the highest intact plot is damaged and coins are stolen', () => {
    const out = raidOutcome({ attackerAccuracy: 0.8, defender, revenge: false });
    expect(out.kind).toBe('damaged');
    if (out.kind !== 'damaged') return;
    expect(out.slot).toBe('craneYard');
    expect(out.coinsStolen).toBeGreaterThan(0);
    const after = applyRaidToDefender(defender, out);
    expect(after.plots[1].damaged).toBe(true);
    expect(after.plots[1].level).toBe(4); // level kept; damage costs a repair
    expect(after.coins).toBe(1000 - out.coinsStolen);
    expect(after.plots.filter((p) => p.damaged)).toHaveLength(1);
  });

  it('given better aim, when raiding, then more is stolen', () => {
    const lo = raidOutcome({ attackerAccuracy: 0, defender, revenge: false });
    const hi = raidOutcome({ attackerAccuracy: 1, defender, revenge: false });
    expect(lo.kind === 'damaged' && hi.kind === 'damaged' && hi.coinsStolen > lo.coinsStolen).toBe(true);
  });

  it('given a broke defender with nothing built, when raided, then nothing goes below zero', () => {
    const broke = withPlots([], { coins: 0 });
    const out = raidOutcome({ attackerAccuracy: 1, defender: broke, revenge: false });
    expect(out.kind === 'damaged' && out.slot === null && out.coinsStolen === 0).toBe(true);
    const after = applyRaidToDefender(broke, out);
    expect(after.coins).toBe(0);
    expect(after.plots.every((p) => p.level === 0 && !p.damaged)).toBe(true);
  });

  it('given revenge, when raiding, then the attacker earns a bonus', () => {
    const plain = raidOutcome({ attackerAccuracy: 0.5, defender, revenge: false });
    const revenge = raidOutcome({ attackerAccuracy: 0.5, defender, revenge: true });
    expect(revenge.attackerCoins).toBeGreaterThan(plain.attackerCoins);
  });

  it('given a raid, when paid to the attacker, then coins rise and a raid charge is spent', () => {
    const attacker = withPlots([], { coins: 10, raidCharges: 2 });
    const out = raidOutcome({ attackerAccuracy: 0.5, defender, revenge: false });
    const after = applyRaidToAttacker(attacker, out);
    expect(after.coins).toBe(10 + out.attackerCoins);
    expect(after.raidCharges).toBe(1);
  });
});

describe('districts', () => {
  it('given all five plots at max, when checked, then the district is complete', () => {
    expect(districtComplete(withPlots([5, 5, 5, 5, 4]))).toBe(false);
    expect(districtComplete(withPlots([5, 5, 5, 5, 5]))).toBe(true);
  });

  it('given a completed district, when advanced, then plots reset, the district grows and a reward lands', () => {
    const done = withPlots([5, 5, 5, 5, 5], { coins: 7 });
    const next = advanceDistrict(done);
    expect(next.district).toBe(2);
    expect(next.plots.every((p) => p.level === 0 && !p.damaged)).toBe(true);
    expect(next.coins).toBeGreaterThan(7);
  });

  it('given the last district, when advanced, then it stays put', () => {
    const last = withPlots([5, 5, 5, 5, 5], { district: MAX_DISTRICT });
    expect(advanceDistrict(last).district).toBe(MAX_DISTRICT);
  });

  it('given an incomplete district, when advanced, then nothing changes', () => {
    const e = withPlots([1]);
    expect(advanceDistrict(e)).toEqual(e);
  });
});

describe('applyRun', () => {
  it('given a run, when banked, then coins + chest land, runs and best height update, a raid charge is earned', () => {
    const { estate, coins, chest } = applyRun(emptyEstate(), MEDIAN_RUN, 42);
    expect(coins).toBe(runCoins(MEDIAN_RUN));
    expect(estate.coins).toBe(coins + chest.coins);
    expect(estate.runs).toBe(1);
    expect(estate.bestM).toBe(36);
    expect(estate.raidCharges).toBe(1);
  });

  it('given shields from chests, when banked, then shields never exceed the cap', () => {
    let e = emptyEstate();
    for (let s = 1; s < 400; s += 1) e = applyRun(e, MEDIAN_RUN, s).estate;
    expect(e.shields).toBeLessThanOrEqual(2);
    expect(e.raidCharges).toBeLessThanOrEqual(3);
  });

  it('given a worse run, when banked, then best height is kept', () => {
    const first = applyRun(emptyEstate(), MEDIAN_RUN, 1).estate;
    const second = applyRun(first, { ...MEDIAN_RUN, heightM: 3, floors: 1 }, 2).estate;
    expect(second.bestM).toBe(36);
  });
});
