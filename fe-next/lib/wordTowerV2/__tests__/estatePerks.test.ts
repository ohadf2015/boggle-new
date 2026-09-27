import { describe, expect, it } from 'vitest';
import { CRANE_CLEARANCE_PX, SWING, predictLandingX, releaseKinematics } from '../crane';
import { PERFECT_RATIO } from '../landing';
import { BLOCK_HEIGHT_PX, blockWidthForWord } from '../scoring';
import { type Estate, NEUTRAL_PERKS, emptyEstate, perksFromEstate, sanitizeEstate } from '../estate';
import { DISTRICTS, MAX_DISTRICT, PLOT_SLOTS, districtDef } from '../estateCatalog';

const maxed = (district: number): Estate => ({
  ...emptyEstate(),
  district,
  plots: PLOT_SLOTS.map((slot) => ({ slot, level: 5, damaged: false })),
});

/** feel.test's perfect-window measure, with a perk-adjusted swing + band. */
function perfectWindowMs(periodMult: number, windowMult: number): number {
  const swing = { ...SWING, periodMs: SWING.periodMs * periodMult };
  const dropPx = CRANE_CLEARANCE_PX - BLOCK_HEIGHT_PX / 2;
  const half = PERFECT_RATIO * windowMult * (blockWidthForWord('tower') / 2);
  let inside = 0;
  for (let t = 0; t < swing.periodMs; t += 0.25) {
    const k = releaseKinematics(t, swing, 0);
    if (Math.abs(predictLandingX(k.x, k.vx, dropPx)) < half) inside += 0.25;
  }
  return inside / 2;
}

describe('perksFromEstate', () => {
  it('given a fresh estate, when perks are read, then they are exactly neutral', () => {
    expect(perksFromEstate(emptyEstate())).toEqual(NEUTRAL_PERKS);
    expect(NEUTRAL_PERKS).toMatchObject({
      baseWidthMult: 1,
      swayMult: 1,
      swingPeriodMult: 1,
      perfectWindowMult: 1,
      coinMult: 1,
      scoreMult: 1,
    });
  });

  it('given upgrades, when perks are read, then each plot moves its own perk the right way', () => {
    const p = perksFromEstate(maxed(1));
    expect(p.baseWidthMult).toBeGreaterThan(1);
    expect(p.swayMult).toBeLessThan(1);
    expect(p.swingPeriodMult).toBeGreaterThan(1);
    expect(p.perfectWindowMult).toBeGreaterThan(1);
    expect(p.coinMult).toBeGreaterThan(1);
    expect(p.scoreMult).toBeGreaterThan(1);
    expect(p.shieldCap).toBeGreaterThan(NEUTRAL_PERKS.shieldCap);
  });

  it('given a damaged plot, when perks are read, then that plot counts one level lower', () => {
    const e = maxed(1);
    const hurt = { ...e, plots: e.plots.map((p) => (p.slot === 'vault' ? { ...p, damaged: true } : p)) };
    expect(perksFromEstate(hurt).coinMult).toBeLessThan(perksFromEstate(e).coinMult);
  });

  it('given the whole empire maxed, when perks are read, then they stay bounded', () => {
    const p = perksFromEstate(maxed(MAX_DISTRICT));
    expect(p.baseWidthMult).toBeLessThanOrEqual(1.25);
    expect(p.swayMult).toBeGreaterThanOrEqual(0.7);
    expect(p.swingPeriodMult).toBeLessThanOrEqual(1.2);
    expect(p.perfectWindowMult).toBeLessThanOrEqual(1.2);
    expect(p.coinMult).toBeLessThanOrEqual(2);
    expect(p.scoreMult).toBeLessThanOrEqual(1.5);
    expect(p.shieldCap).toBeLessThanOrEqual(5);
  });

  it('given maxed crane perks, when timed like feel.test, then the perfect window is still a skill (<=140ms)', () => {
    const p = perksFromEstate(maxed(MAX_DISTRICT));
    const ms = perfectWindowMs(p.swingPeriodMult, p.perfectWindowMult);
    expect(ms).toBeGreaterThan(perfectWindowMs(1, 1));
    expect(ms).toBeLessThanOrEqual(140);
  });
});

describe('catalog', () => {
  it('given every district, when listed, then it has 5 buildings, one per slot, with art ids and i18n keys', () => {
    expect(DISTRICTS.length).toBe(MAX_DISTRICT);
    const ids = new Set<string>();
    for (const d of DISTRICTS) {
      expect(d.buildings.map((b) => b.slot)).toEqual([...PLOT_SLOTS]);
      expect(d.i18nKey).toMatch(/^wordTowerV2\.estate\.district\./);
      for (const b of d.buildings) {
        expect(b.i18nKey).toMatch(/^wordTowerV2\.estate\.building\./);
        ids.add(b.id);
      }
    }
    expect(ids.size).toBe(MAX_DISTRICT * 5);
  });

  it('given an out-of-range district, when looked up, then it clamps', () => {
    expect(districtDef(0)).toBe(DISTRICTS[0]);
    expect(districtDef(999)).toBe(DISTRICTS[MAX_DISTRICT - 1]);
  });
});

describe('sanitizeEstate', () => {
  it('given garbage, when sanitized, then it is a fresh estate', () => {
    expect(sanitizeEstate(null)).toEqual(emptyEstate());
    expect(sanitizeEstate('nope')).toEqual(emptyEstate());
  });

  it('given a round-tripped estate, when sanitized, then it is unchanged', () => {
    const e = { ...maxed(3), coins: 1234, shields: 2, bricks: 1, blueprints: 1, raidCharges: 2, bestM: 51, runs: 9 };
    expect(sanitizeEstate(JSON.parse(JSON.stringify(e)))).toEqual(e);
  });

  it('given hostile values, when sanitized, then every field is clamped', () => {
    const e = sanitizeEstate({
      coins: -5,
      district: 99,
      plots: [{ slot: 'vault', level: 42, damaged: 'yes' }, { slot: 'hack', level: 3 }],
      shields: 1e9,
      bricks: -1,
      blueprints: 'x',
      raidCharges: 50,
      bestM: Number.NaN,
      runs: 2.7,
      lastTower: 'nope',
    });
    expect(e.coins).toBe(0);
    expect(e.district).toBe(MAX_DISTRICT);
    expect(e.plots.map((p) => p.slot)).toEqual([...PLOT_SLOTS]);
    expect(e.plots.find((p) => p.slot === 'vault')!.level).toBe(5);
    expect(e.plots.every((p) => p.damaged === false)).toBe(true);
    expect(e.shields).toBeLessThanOrEqual(5);
    expect(e.bricks).toBe(0);
    expect(e.blueprints).toBe(0);
    expect(e.raidCharges).toBeLessThanOrEqual(3);
    expect(e.bestM).toBe(0);
    expect(e.runs).toBe(2);
    expect(e.lastTower).toEqual([]);
  });
});
