import { describe, it, expect } from 'vitest';
import {
  BLAST_UPGRADES,
  upgradeCost,
  computeUpgradeEffects,
  NO_UPGRADE_EFFECTS,
} from '../blastUpgradeCatalog';

describe('blastUpgradeCatalog', () => {
  it('has a stable, non-empty catalog with unique ids', () => {
    const ids = BLAST_UPGRADES.map(u => u.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every upgrade has an i18n name+desc key, a currency, and sane curve', () => {
    for (const u of BLAST_UPGRADES) {
      expect(u.nameKey).toMatch(/^blast\.store\./);
      expect(u.descKey).toMatch(/^blast\.store\./);
      expect(['coins', 'gems']).toContain(u.currency);
      expect(u.baseCost).toBeGreaterThan(0);
      expect(u.costGrowth).toBeGreaterThan(1);
      expect(u.maxLevel).toBeGreaterThanOrEqual(1);
    }
  });

  it('cost grows geometrically with owned level', () => {
    const u = BLAST_UPGRADES[0];
    const l0 = upgradeCost(u, 0);
    const l1 = upgradeCost(u, 1);
    expect(l0).toBe(u.baseCost);
    expect(l1).toBeGreaterThan(l0);
    expect(l1).toBe(Math.round(u.baseCost * u.costGrowth));
  });

  it('no owned upgrades → neutral effects', () => {
    expect(computeUpgradeEffects({})).toEqual(NO_UPGRADE_EFFECTS);
  });

  it('owning extraMoves adds starting moves', () => {
    const eff = computeUpgradeEffects({ extraMoves: 3 });
    expect(eff.startingMovesBonus).toBeGreaterThan(0);
  });

  it('comboSurge multiplies combo score above 1x', () => {
    const eff = computeUpgradeEffects({ comboSurge: 2 });
    expect(eff.comboScoreMult).toBeGreaterThan(1);
  });

  it('clamps level to maxLevel when aggregating effects', () => {
    const u = BLAST_UPGRADES.find(x => x.id === 'extraMoves')!;
    const over = computeUpgradeEffects({ extraMoves: u.maxLevel + 10 });
    const atMax = computeUpgradeEffects({ extraMoves: u.maxLevel });
    expect(over.startingMovesBonus).toBe(atMax.startingMovesBonus);
  });
});
