import { describe, it, expect } from 'vitest';
import { xpForLevel, levelFromXp, levelProgress, levelBeforeGrant, MAX_LEVEL } from '../levelCurve';

describe('xpForLevel', () => {
  it('level 1 needs no XP', () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(0)).toBe(0);
  });

  it('uses exponent 1.4 up to level 25', () => {
    expect(xpForLevel(2)).toBe(Math.round(100 * Math.pow(2, 1.4)));
    expect(xpForLevel(25)).toBe(Math.round(100 * Math.pow(25, 1.4)));
  });

  it('switches exponent at 26, 51 and 76', () => {
    expect(xpForLevel(26)).toBe(Math.round(100 * Math.pow(26, 1.45)));
    expect(xpForLevel(51)).toBe(Math.round(100 * Math.pow(51, 1.5)));
    expect(xpForLevel(76)).toBe(Math.round(100 * Math.pow(76, 1.55)));
  });

  it('is strictly increasing to the max level', () => {
    for (let l = 2; l <= MAX_LEVEL; l++) {
      expect(xpForLevel(l)).toBeGreaterThan(xpForLevel(l - 1));
    }
  });
});

describe('levelFromXp', () => {
  it('starts at level 1', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(-5)).toBe(1);
    expect(levelFromXp(xpForLevel(2) - 1)).toBe(1);
  });

  it('reaches a level exactly at its threshold', () => {
    for (const l of [2, 10, 25, 26, 50, 51, 75, 76, 100]) {
      expect(levelFromXp(xpForLevel(l))).toBe(l);
      expect(levelFromXp(xpForLevel(l) - 1)).toBe(l - 1);
    }
  });

  it('caps at the max level', () => {
    expect(levelFromXp(1e9)).toBe(MAX_LEVEL);
  });
});

describe('levelProgress', () => {
  it('reports progress inside a level', () => {
    const start = xpForLevel(5);
    const next = xpForLevel(6);
    const half = start + Math.floor((next - start) / 2);
    const p = levelProgress(half);
    expect(p.level).toBe(5);
    expect(p.xpIntoLevel).toBe(half - start);
    expect(p.xpForNext).toBe(next - start);
    expect(p.pct).toBeGreaterThanOrEqual(49);
    expect(p.pct).toBeLessThanOrEqual(51);
    expect(p.isMax).toBe(false);
  });

  it('is 0% at a fresh level and for new players', () => {
    expect(levelProgress(0)).toEqual({ level: 1, xpIntoLevel: 0, xpForNext: xpForLevel(2), pct: 0, isMax: false });
    expect(levelProgress(xpForLevel(3)).pct).toBe(0);
  });

  it('never rounds up to 100% before the level is reached', () => {
    const p = levelProgress(xpForLevel(4) - 1);
    expect(p.level).toBe(3);
    expect(p.pct).toBeLessThan(100);
  });

  it('is full and flagged at max level', () => {
    const p = levelProgress(xpForLevel(MAX_LEVEL) + 5000);
    expect(p.level).toBe(MAX_LEVEL);
    expect(p.isMax).toBe(true);
    expect(p.pct).toBe(100);
  });
});

describe('levelBeforeGrant', () => {
  it('is the level the player had before the granted XP landed', () => {
    const total = xpForLevel(3) + 10;
    expect(levelBeforeGrant(total, 50)).toBe(2);
    expect(levelBeforeGrant(total, 5)).toBe(3);
    expect(levelBeforeGrant(10, 500)).toBe(1);
  });
});
