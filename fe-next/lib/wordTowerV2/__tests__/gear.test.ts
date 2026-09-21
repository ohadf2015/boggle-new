import { describe, expect, it } from 'vitest';
import { type Estate, emptyEstate } from '../estate';
import { PLOT_SLOTS } from '../estateCatalog';
import { MATERIALS, gearFromEstate } from '../gear';

const withPlots = (levels: number[], extra: Partial<Estate> = {}): Estate => ({
  ...emptyEstate(),
  plots: PLOT_SLOTS.map((slot, i) => ({ slot, level: levels[i] ?? 0, damaged: false })),
  ...extra,
});

describe('gearFromEstate — the upgrades you can SEE on the tower', () => {
  it('given a fresh estate, then the tower wears no gear', () => {
    const g = gearFromEstate(emptyEstate());
    for (const slot of PLOT_SLOTS) expect(g[slot].level).toBe(0);
  });

  it('given a level-3 foundation, then the plinth shows 3 steps in the first material', () => {
    const g = gearFromEstate(withPlots([3]));
    expect(g.foundation).toEqual({ level: 3, material: MATERIALS[0] });
  });

  it('given a maxed part, then it upgrades to the next material', () => {
    expect(gearFromEstate(withPlots([5])).foundation.material).toBe(MATERIALS[1]);
  });

  it('given a new district, then gear from finished districts never disappears', () => {
    const g = gearFromEstate(withPlots([0, 1], { district: 2 }));
    expect(g.foundation.level).toBe(5);
    expect(g.craneYard.level).toBe(5);
    expect(g.craneYard.material).toBe(MATERIALS[1]);
  });

  it('given a raided (damaged) part, then it shows one level lower', () => {
    const e = withPlots([2]);
    e.plots[0].damaged = true;
    expect(gearFromEstate(e).foundation.level).toBe(1);
  });

  it('then there are ten distinct materials — none of them nautical', () => {
    expect(new Set(MATERIALS.map((m) => m.id)).size).toBe(10);
  });
});
