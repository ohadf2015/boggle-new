import { type Estate, type SpendResult, advanceDistrict, canUpgrade, districtComplete, repairCost, upgradeCost } from './estate';
import { MAX_PLOT_LEVEL, type PlotSlot } from './estateCatalog';

export interface FinishPlan {
  coins: number;
  blueprints: number;
  bricks: number;
  levels: number;
  repairs: number;
}

const sumAfter = (costs: number[], free: number) =>
  [...costs].sort((a, b) => b - a).slice(free).reduce((total, cost) => total + cost, 0);

/** The exact price of finishing this district now; free tokens cover the dearest steps. */
export function finishDistrictPlan(e: Estate): FinishPlan | null {
  const upgrades: number[] = [];
  const repairs: number[] = [];
  for (const p of e.plots) {
    if (p.damaged) repairs.push(repairCost(e.district, p.slot, p.level));
    for (let level = p.level; level < MAX_PLOT_LEVEL; level += 1) upgrades.push(upgradeCost(e.district, p.slot, level));
  }
  if (!upgrades.length && !repairs.length) return null;
  const blueprints = Math.min(e.blueprints, upgrades.length);
  const bricks = Math.min(e.bricks, repairs.length);
  return {
    coins: sumAfter(upgrades, blueprints) + sumAfter(repairs, bricks),
    blueprints,
    bricks,
    levels: upgrades.length,
    repairs: repairs.length,
  };
}

/** All or nothing, so a player never pays for a half-built district. Call settleDistrict next. */
export function applyFinishDistrict(e: Estate): SpendResult {
  const plan = finishDistrictPlan(e);
  if (!plan) return { ok: false, reason: 'maxed' };
  if (e.coins < plan.coins) return { ok: false, reason: 'coins' };
  return {
    ok: true,
    cost: plan.coins,
    usedToken: plan.blueprints + plan.bricks > 0,
    estate: {
      ...e,
      coins: e.coins - plan.coins,
      blueprints: e.blueprints - plan.blueprints,
      bricks: e.bricks - plan.bricks,
      plots: e.plots.map((p) => ({ ...p, level: MAX_PLOT_LEVEL, damaged: false })),
    },
  };
}

/** Upgrades and repairs can both be the step that finishes a district. */
export function settleDistrict(e: Estate): { estate: Estate; completed: boolean } {
  const completed = districtComplete(e);
  return { estate: completed ? advanceDistrict(e) : e, completed };
}

/** Where the workshop goes after a build; null keeps the current plot. */
export function nextPlotAfterBuild(e: Estate, built: PlotSlot): PlotSlot | null {
  const plot = e.plots.find((p) => p.slot === built);
  if (!plot || plot.level < MAX_PLOT_LEVEL) return null;
  const next =
    e.plots.find((p) => p.damaged) ??
    e.plots.find((p) => canUpgrade(e, p.slot).ok) ??
    e.plots.find((p) => p.level < MAX_PLOT_LEVEL);
  return next?.slot ?? null;
}
