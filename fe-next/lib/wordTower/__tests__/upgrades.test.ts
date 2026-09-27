/**
 * Word Tower — persistent upgrade economy (Phase 5).
 *
 * Coins earned climbing now buy PERMANENT tower upgrades that tune the run in the
 * player's favour — the "just one more run to afford the next tier" meta-hook.
 * Pure + deterministic: cost curve, purchase, and the effects bundle the physics
 * + economy read.
 */
import { describe, it, expect } from 'vitest';
import {
  UPGRADE_DEFS,
  UPGRADE_IDS,
  LIVE_UPGRADE_IDS,
  upgradeCost,
  isMaxed,
  canAfford,
  purchase,
  computeEffects,
  NEUTRAL_EFFECTS,
  type UpgradeId,
  type UpgradeLevels,
} from '../upgrades';

describe('UPGRADE_DEFS', () => {
  it('every upgrade has a sane definition', () => {
    for (const id of UPGRADE_IDS) {
      const d = UPGRADE_DEFS[id];
      expect(d.maxLevel).toBeGreaterThanOrEqual(1);
      expect(d.baseCost).toBeGreaterThan(0);
      expect(d.costGrowth).toBeGreaterThan(1);
      expect(d.perLevel).toBeGreaterThan(0);
    }
  });
});

describe('LIVE_UPGRADE_IDS', () => {
  it('is a non-empty subset of all upgrades (shop never sells an undefined id)', () => {
    expect(LIVE_UPGRADE_IDS.length).toBeGreaterThan(0);
    for (const id of LIVE_UPGRADE_IDS) {
      expect(UPGRADE_IDS).toContain(id);
      expect(UPGRADE_DEFS[id]).toBeDefined();
    }
  });
});

describe('upgradeCost', () => {
  it('escalates with each level and is finite below max', () => {
    for (const id of UPGRADE_IDS) {
      const c0 = upgradeCost(id, 0);
      const c1 = upgradeCost(id, 1);
      expect(c0).toBeGreaterThan(0);
      expect(c1).toBeGreaterThan(c0); // each tier costs more
    }
  });

  it('is Infinity once maxed (nothing left to buy)', () => {
    const id: UpgradeId = 'wideFooting';
    expect(upgradeCost(id, UPGRADE_DEFS[id].maxLevel)).toBe(Infinity);
    expect(isMaxed(id, UPGRADE_DEFS[id].maxLevel)).toBe(true);
    expect(isMaxed(id, 0)).toBe(false);
  });
});

describe('purchase', () => {
  it('buys a level, deducts the exact cost, and bumps only that upgrade', () => {
    const levels: UpgradeLevels = {};
    const cost = upgradeCost('windbreak', 0);
    const r = purchase(levels, cost + 50, 'windbreak');
    expect(r.ok).toBe(true);
    expect(r.levels.windbreak).toBe(1);
    expect(r.coins).toBe(50);
    expect(levels.windbreak).toBeUndefined(); // input not mutated
  });

  it('refuses when the player cannot afford it', () => {
    const r = purchase({}, 1, 'masterArchitect');
    expect(r.ok).toBe(false);
    expect(r.levels.masterArchitect).toBeUndefined();
    expect(r.coins).toBe(1);
  });

  it('refuses to buy past max level', () => {
    const id: UpgradeId = 'reinforcedCore';
    const maxed: UpgradeLevels = { [id]: UPGRADE_DEFS[id].maxLevel };
    const r = purchase(maxed, 999999, id);
    expect(r.ok).toBe(false);
    expect(r.levels[id]).toBe(UPGRADE_DEFS[id].maxLevel);
  });

  it('canAfford agrees with the cost curve', () => {
    const cost = upgradeCost('steadyCable', 0);
    expect(canAfford(cost, 'steadyCable', 0)).toBe(true);
    expect(canAfford(cost - 1, 'steadyCable', 0)).toBe(false);
  });
});

describe('computeEffects', () => {
  it('no upgrades → neutral (multipliers 1, bonuses 0)', () => {
    expect(computeEffects({})).toEqual(NEUTRAL_EFFECTS);
  });

  it('each upgrade moves its own effect in the helpful direction', () => {
    const full: UpgradeLevels = {
      steadyCable: UPGRADE_DEFS.steadyCable.maxLevel,
      wideFooting: UPGRADE_DEFS.wideFooting.maxLevel,
      windbreak: UPGRADE_DEFS.windbreak.maxLevel,
      masterArchitect: UPGRADE_DEFS.masterArchitect.maxLevel,
      reinforcedCore: UPGRADE_DEFS.reinforcedCore.maxLevel,
      quickRecovery: UPGRADE_DEFS.quickRecovery.maxLevel,
    };
    const e = computeEffects(full);
    expect(e.sweepSpeedMult).toBeLessThan(1); // slower sweep = easier timing
    expect(e.perfectBandBonus).toBeGreaterThan(0); // wider perfect window
    expect(e.windMult).toBeLessThan(1); // calmer wind
    expect(e.rewardMult).toBeGreaterThan(1); // fatter coins
    expect(e.extraTopple).toBeGreaterThanOrEqual(1); // tougher tower
    expect(e.leanResetMult).toBeGreaterThan(1); // faster recovery
  });

  it('keeps every effect inside safe bounds even fully maxed', () => {
    const full = Object.fromEntries(UPGRADE_IDS.map((id) => [id, UPGRADE_DEFS[id].maxLevel])) as UpgradeLevels;
    const e = computeEffects(full);
    expect(e.sweepSpeedMult).toBeGreaterThanOrEqual(0.5); // never trivialise timing
    expect(e.windMult).toBeGreaterThanOrEqual(0.4);
    expect(e.perfectBandBonus).toBeLessThanOrEqual(0.12);
    expect(e.rewardMult).toBeLessThanOrEqual(2);
  });

  it('every upgrade is LIVE (the shop never sells a no-op)', () => {
    for (const id of UPGRADE_IDS) {
      expect(LIVE_UPGRADE_IDS).toContain(id);
    }
  });

  it('the new upgrades each move their own effect (tailwind/salvage/momentum)', () => {
    const tail = computeEffects({ tailwind: UPGRADE_DEFS.tailwind.maxLevel });
    expect(tail.heightMult).toBeGreaterThan(1); // every floor a little taller

    const salv = computeEffects({ salvage: UPGRADE_DEFS.salvage.maxLevel });
    expect(salv.toppleReduction).toBeGreaterThanOrEqual(1); // softer collapses

    const mom = computeEffects({ momentum: UPGRADE_DEFS.momentum.maxLevel });
    expect(mom.perfectBonus).toBeGreaterThan(0); // fatter perfect streaks
  });

  it('new effects stay inside safe bounds even fully maxed', () => {
    const full = Object.fromEntries(UPGRADE_IDS.map((id) => [id, UPGRADE_DEFS[id].maxLevel])) as UpgradeLevels;
    const e = computeEffects(full);
    expect(e.heightMult).toBeLessThanOrEqual(1.4);
    expect(e.toppleReduction).toBeLessThanOrEqual(3);
    expect(e.perfectBonus).toBeLessThanOrEqual(0.5);
    expect(e.leanResetMult).toBeLessThanOrEqual(2);
  });

  it('clamps levels above max (corrupt save can never over-power)', () => {
    const cheat: UpgradeLevels = { masterArchitect: 999 };
    const e = computeEffects(cheat);
    const maxed = computeEffects({ masterArchitect: UPGRADE_DEFS.masterArchitect.maxLevel });
    expect(e.rewardMult).toBeCloseTo(maxed.rewardMult, 6);
  });
});
