import { describe, expect, it } from 'vitest';
import { type Estate, emptyEstate, repairCost, upgradeCost } from '../estate';
import { MAX_DISTRICT, MAX_PLOT_LEVEL, PLOT_SLOTS, type PlotSlot } from '../estateCatalog';
import { applyFinishDistrict, finishDistrictPlan, nextPlotAfterBuild, settleDistrict } from '../estateFinish';

const withLevels = (e: Estate, levels: Partial<Record<PlotSlot, number>>, damaged: PlotSlot[] = []): Estate => ({
  ...e,
  plots: e.plots.map((p) => ({ ...p, level: levels[p.slot] ?? p.level, damaged: damaged.includes(p.slot) })),
});

const allCosts = (e: Estate) =>
  e.plots.flatMap((p) => Array.from({ length: MAX_PLOT_LEVEL - p.level }, (_, i) => upgradeCost(e.district, p.slot, p.level + i)));
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe('finishDistrictPlan', () => {
  it('given an empty district, then the price is every remaining level', () => {
    const e = emptyEstate();
    expect(finishDistrictPlan(e)).toEqual({ coins: sum(allCosts(e)), blueprints: 0, bricks: 0, levels: PLOT_SLOTS.length * MAX_PLOT_LEVEL, repairs: 0 });
  });

  it('given blueprints, then they pay for the most expensive levels', () => {
    const e = { ...emptyEstate(), blueprints: 2 };
    const costs = allCosts(e).sort((a, b) => b - a);
    const plan = finishDistrictPlan(e)!;
    expect(plan.blueprints).toBe(2);
    expect(plan.coins).toBe(sum(costs.slice(2)));
  });

  it('given damaged plots, then repairs are in the price and bricks cover the dearest', () => {
    const e = { ...withLevels(emptyEstate(), { foundation: 5, vault: 5 }, ['foundation', 'vault']), bricks: 1 };
    const repairs = [repairCost(1, 'foundation', 5), repairCost(1, 'vault', 5)].sort((a, b) => b - a);
    const plan = finishDistrictPlan(e)!;
    expect(plan.repairs).toBe(2);
    expect(plan.bricks).toBe(1);
    expect(plan.coins).toBe(sum(allCosts(e)) + repairs[1]);
  });

  it('given nothing left to do, then there is no plan', () => {
    const done = withLevels(emptyEstate(), Object.fromEntries(PLOT_SLOTS.map((s) => [s, MAX_PLOT_LEVEL])));
    expect(finishDistrictPlan(done)).toBeNull();
  });
});

describe('applyFinishDistrict', () => {
  it('given enough coins, then every plot is maxed and intact and exactly the quoted price is spent', () => {
    const start = withLevels(emptyEstate(), { vault: 2 }, ['vault']);
    const plan = finishDistrictPlan({ ...start, coins: 1 })!;
    const r = applyFinishDistrict({ ...start, coins: plan.coins + 7 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.cost).toBe(plan.coins);
    expect(r.estate.coins).toBe(7);
    expect(r.estate.plots.every((p) => p.level === MAX_PLOT_LEVEL && !p.damaged)).toBe(true);
  });

  it('given one coin too few, then nothing is spent', () => {
    const e = emptyEstate();
    expect(applyFinishDistrict({ ...e, coins: finishDistrictPlan(e)!.coins - 1 })).toEqual({ ok: false, reason: 'coins' });
  });
});

describe('settleDistrict', () => {
  const maxed = withLevels(emptyEstate(), Object.fromEntries(PLOT_SLOTS.map((s) => [s, MAX_PLOT_LEVEL])));

  it('given a finished district, then it advances and reports it', () => {
    const r = settleDistrict(maxed);
    expect(r.completed).toBe(true);
    expect(r.estate.district).toBe(2);
  });

  it('given a maxed district with a damaged plot, then it waits for the repair', () => {
    const r = settleDistrict(withLevels(maxed, {}, ['vault']));
    expect(r.completed).toBe(false);
    expect(r.estate.district).toBe(1);
  });

  it('given the last district, then it stays put', () => {
    expect(settleDistrict({ ...maxed, district: MAX_DISTRICT }).estate.district).toBe(MAX_DISTRICT);
  });
});

describe('nextPlotAfterBuild', () => {
  it('given the built plot can still level up, then the selection stays', () => {
    expect(nextPlotAfterBuild({ ...withLevels(emptyEstate(), { foundation: 2 }), coins: 9999 }, 'foundation')).toBeNull();
  });

  it('given the built plot is maxed, then the next affordable plot is picked', () => {
    expect(nextPlotAfterBuild({ ...withLevels(emptyEstate(), { foundation: 5 }), coins: 9999 }, 'foundation')).toBe(PLOT_SLOTS[1]);
  });

  it('given a damaged plot elsewhere, then it comes first', () => {
    expect(nextPlotAfterBuild({ ...withLevels(emptyEstate(), { foundation: 5, vault: 3 }, ['vault']), coins: 9999 }, 'foundation')).toBe('vault');
  });

  it('given no coins left, then the next unfinished plot is still shown', () => {
    expect(nextPlotAfterBuild(withLevels(emptyEstate(), { foundation: 5 }), 'foundation')).toBe(PLOT_SLOTS[1]);
  });
});
