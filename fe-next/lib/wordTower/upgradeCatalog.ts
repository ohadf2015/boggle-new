/**
 * Word Tower — upgrade shop catalog (pure, presentation-layer).
 *
 * Groups the 10 permanent upgrades into browsable categories, formats the
 * current→next effect preview per row ("−8% → −16%"), and picks the "best
 * pick" recommendation (cheapest affordable tier, tie-broken toward the
 * category the player has invested in least). Costs and effect math stay in
 * upgrades.ts untouched — this file only reads them.
 */

import {
  computeEffects,
  isMaxed,
  levelOf,
  upgradeCost,
  type UpgradeEffects,
  type UpgradeId,
  type UpgradeLevels,
} from './upgrades';

export type UpgradeCategoryId = 'crane' | 'stability' | 'boost';

export interface UpgradeCategory {
  id: UpgradeCategoryId;
  upgrades: readonly UpgradeId[];
}

/** Shop layout: what the crane does → what keeps the tower standing → payouts. */
export const UPGRADE_CATEGORIES: readonly UpgradeCategory[] = [
  { id: 'crane', upgrades: ['steadyCable', 'wideFooting', 'momentum'] },
  { id: 'stability', upgrades: ['windbreak', 'reinforcedCore', 'quickRecovery', 'salvage', 'centerMagnet'] },
  { id: 'boost', upgrades: ['masterArchitect', 'tailwind'] },
] as const;

const pct = (frac: number, sign: '+' | '-') => `${sign}${Math.round(Math.abs(frac) * 100)}%`;

/** How each upgrade's live effect reads as a short stat string. */
const FORMATTERS: Record<UpgradeId, (e: UpgradeEffects) => string> = {
  steadyCable: (e) => pct(1 - e.sweepSpeedMult, '-'),
  wideFooting: (e) => pct(e.perfectBandBonus, '+'),
  windbreak: (e) => pct(1 - e.windMult, '-'),
  masterArchitect: (e) => pct(e.rewardMult - 1, '+'),
  reinforcedCore: (e) => `+${e.extraTopple}`,
  quickRecovery: (e) => pct(e.leanResetMult - 1, '+'),
  tailwind: (e) => pct(e.heightMult - 1, '+'),
  salvage: (e) => `-${e.toppleReduction}`,
  momentum: (e) => pct(e.perfectBonus, '+'),
  centerMagnet: (e) => pct(e.passiveLeanReset - 1, '+'),
};

/**
 * Current → next effect strings for the shop row; `null` once maxed (the row
 * shows the MAXED badge instead).
 */
export function effectDelta(id: UpgradeId, level: number): { current: string; next: string } | null {
  if (isMaxed(id, level)) return null;
  const fmt = FORMATTERS[id];
  return {
    current: fmt(computeEffects({ [id]: level })),
    next: fmt(computeEffects({ [id]: level + 1 })),
  };
}

/**
 * "Best pick" chip: the cheapest affordable non-maxed tier. Ties break toward
 * the category with the fewest invested levels, so the recommendation nudges
 * a rounded build instead of stacking one column.
 */
export function recommendedUpgrade(levels: UpgradeLevels, coins: number): UpgradeId | null {
  const investedIn = (cat: UpgradeCategory) =>
    cat.upgrades.reduce((sum, id) => sum + levelOf(levels, id), 0);

  let best: { id: UpgradeId; cost: number; invested: number } | null = null;
  for (const cat of UPGRADE_CATEGORIES) {
    const invested = investedIn(cat);
    for (const id of cat.upgrades) {
      const lvl = levelOf(levels, id);
      if (isMaxed(id, lvl)) continue;
      const cost = upgradeCost(id, lvl);
      if (cost > coins) continue;
      if (!best || cost < best.cost || (cost === best.cost && invested < best.invested)) {
        best = { id, cost, invested };
      }
    }
  }
  return best?.id ?? null;
}
