import { describe, expect, it } from 'vitest';
import { emptyEstate, type Estate } from '../estate';
import { MAX_PLOT_LEVEL } from '../estateCatalog';
import { TOWER_STYLES, empireLevel, styleIndexFor, styleProgress, towerStyleFor } from '../towerStyle';

const withLevels = (levels: number[], district = 1): Estate => {
  const e = emptyEstate();
  e.district = district;
  e.plots = e.plots.map((p, i) => ({ ...p, level: levels[i] ?? 0 }));
  return e;
};

describe('towerStyle', () => {
  it('given a fresh estate, when read, then the tower is the starting walk-up', () => {
    expect(empireLevel(emptyEstate())).toBe(0);
    expect(towerStyleFor(0).id).toBe('walkup');
  });

  it('given the unlock ladder, when read, then each style needs more upgrades than the last and every one has a distinct look', () => {
    for (let i = 1; i < TOWER_STYLES.length; i += 1) expect(TOWER_STYLES[i].at).toBeGreaterThan(TOWER_STYLES[i - 1].at);
    const looks = new Set(TOWER_STYLES.map((s) => `${s.window}|${s.surface}|${s.facades[0][0]}`));
    expect(looks.size).toBe(TOWER_STYLES.length);
  });

  it('given district 1 alone (25 levels), when maxed, then the player has seen at least four looks', () => {
    expect(styleIndexFor(5 * MAX_PLOT_LEVEL)).toBeGreaterThanOrEqual(4);
  });

  it('given 2 levels built, when progress is read, then it counts the upgrades left to the next look', () => {
    const p = styleProgress(withLevels([1, 1]));
    expect(p.style.id).toBe('walkup');
    expect(p.next?.id).toBe('brownstone');
    expect(p.toNext).toBe(TOWER_STYLES[1].at - 2);
    expect(p.progress01).toBeCloseTo(2 / TOWER_STYLES[1].at);
  });

  it('given a finished district, when the next one starts empty, then the look is not stripped back', () => {
    const before = empireLevel(withLevels([5, 5, 5, 5, 5], 1));
    const after = empireLevel(withLevels([0, 0, 0, 0, 0], 2));
    expect(after).toBeGreaterThanOrEqual(before);
  });
});
