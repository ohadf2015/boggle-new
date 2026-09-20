/**
 * Thresholds must follow the board actually dealt. The authored design in
 * WORLD_ROWS (kind multipliers, twists, the 1.8/2.8 star steps) is preserved —
 * only the MAGNITUDE is re-derived from the board.
 */
import { describe, it, expect } from 'vitest';
import {
  getPlayLevel, parForBoard, tuneToBoard, isCombatKind,
  WORLD_COUNT, LEVELS_PER_WORLD, BOSS_LEVEL, ELITE_LEVEL,
} from '../levels';

// Measured over 150 dealt boards per size (scripts/adventure-calibrate.ts).
const MEDIAN_TOTAL: Record<number, number> = { 4: 6171, 5: 16357, 6: 30000 };
// Best scores real players posted per 90s on 2026-09-20 (21 runs, 11 users).
const HUMAN: Record<number, number> = { 4: 1217, 5: 1072, 6: 1072 };

describe('parForBoard', () => {
  it('given a 4x-richer board, when par is taken, then par only doubles', () => {
    expect(parForBoard(24000, 4) / parForBoard(6000, 4)).toBeCloseTo(2, 1);
  });

  it('given an unsolvable board, when par is taken, then it stays positive and finite', () => {
    expect(parForBoard(0, 4)).toBeGreaterThan(0);
    expect(Number.isFinite(parForBoard(0, 6))).toBe(true);
  });

  it('given every board size in the table, when par is taken, then each is supported', () => {
    for (const size of [4, 5, 6]) expect(parForBoard(MEDIAN_TOTAL[size], size)).toBeGreaterThan(0);
  });
});

describe('tuneToBoard', () => {
  const medianFor = (world: number, level: number) => {
    const lvl = getPlayLevel(world, level);
    return tuneToBoard(world, level, parForBoard(MEDIAN_TOTAL[lvl.size], lvl.size));
  };

  it('given a tuned level, when read, then the authored star steps are preserved', () => {
    const t = medianFor(1, 1);
    expect(t.stars[1] / t.stars[0]).toBeCloseTo(1.8, 1);
    expect(t.stars[2] / t.stars[0]).toBeCloseTo(2.8, 1);
  });

  it('given a richer board, when tuned, then every threshold rises', () => {
    const lean = tuneToBoard(5, 1, parForBoard(7000, 5));
    const rich = tuneToBoard(5, 1, parForBoard(38000, 5));
    expect(rich.stars[0]).toBeGreaterThan(lean.stars[0]);
    expect(rich.stars[2]).toBeGreaterThan(lean.stars[2]);
  });

  it('given the authored kind multipliers, when tuned, then their RATIOS survive', () => {
    // Level kinds carry a designed difficulty ratio (chain 0.6 vs classic 1.0).
    // Tuning re-derives magnitude, so those ratios must be unchanged.
    for (let w = 1; w <= WORLD_COUNT; w++) {
      for (let l = 1; l <= LEVELS_PER_WORLD; l++) {
        const lvl = getPlayLevel(w, l);
        const tuned = tuneToBoard(w, l, parForBoard(MEDIAN_TOTAL[lvl.size], lvl.size));
        // r5() rounds each threshold to the nearest 5, so compare the scale
        // factors relatively rather than to an absolute epsilon.
        const lo = tuned.stars[0] / lvl.stars[0];
        const hi = tuned.stars[2] / lvl.stars[2];
        expect(Math.abs(lo - hi) / hi).toBeLessThan(0.05);
      }
    }
  });

  it('given a combat level, when tuned, then enemy HP is tuned with it and stays the 2nd star', () => {
    for (const [w, l] of [[3, ELITE_LEVEL], [10, BOSS_LEVEL]] as const) {
      const lvl = getPlayLevel(w, l);
      expect(isCombatKind(lvl.kind)).toBe(true);
      const tuned = tuneToBoard(w, l, parForBoard(MEDIAN_TOTAL[lvl.size], lvl.size));
      expect(tuned.enemyHp).toBeGreaterThan(0);
      expect(tuned.enemyHp).not.toBe(lvl.enemyHp);
      if (lvl.kind === 'boss') expect(tuned.enemyHp).toBe(tuned.stars[1]);
    }
  });

  it('given a non-combat level, when tuned, then it has no enemy HP', () => {
    expect(tuneToBoard(1, 1, parForBoard(MEDIAN_TOTAL[4], 4)).enemyHp).toBeUndefined();
  });

  it('given the whole ladder on median boards, when walked, then the floor is reachable and the ceiling is demanding', () => {
    for (let w = 1; w <= WORLD_COUNT; w++) {
      for (let l = 1; l <= LEVELS_PER_WORLD; l++) {
        const lvl = getPlayLevel(w, l);
        const t = medianFor(w, l);
        const human = HUMAN[lvl.size] * (lvl.seconds / 90);
        // Clearing (1 star) must stay well inside a real run, on EVERY kind.
        expect(t.stars[0]).toBeLessThan(human * 0.75);
        // The ceiling is asserted on `classic` only: chain (0.6) and hunt (0.7)
        // carry a deliberately lower score bar, and hunt does not even win on
        // score — it wins on targets found.
        if (lvl.kind === 'classic') expect(t.stars[2]).toBeGreaterThan(human * 0.7);
      }
    }
  });

  it('given the old hand-authored curve, when compared on a median board, then the ceiling actually rose', () => {
    // The bug: the hardest 3-star in the game (868) sat BELOW an average run.
    const before = getPlayLevel(10, 6);
    const after = medianFor(10, 6);
    expect(before.stars[2]).toBeLessThan(HUMAN[before.size]);
    expect(after.stars[2]).toBeGreaterThan(HUMAN[before.size]);
  });
});
