import { describe, it, expect } from 'vitest';
import { WORLD_LEVELS, getPlayLevel, isCombatKind, WORLD_COUNT, LEVELS_PER_WORLD } from '../levels';

const worlds = Array.from({ length: WORLD_COUNT }, (_, i) => i + 1);
const levels = Array.from({ length: LEVELS_PER_WORLD }, (_, i) => i + 1);

describe('WORLD_LEVELS table', () => {
  it('given the table, when read, then it has 10 worlds x 7 level specs', () => {
    expect(WORLD_LEVELS).toHaveLength(WORLD_COUNT);
    for (const w of WORLD_LEVELS) expect(w).toHaveLength(LEVELS_PER_WORLD);
  });

  it('given any world, when read, then L4 is an elite and L7 the boss', () => {
    for (const w of worlds) {
      expect(getPlayLevel(w, 4).kind).toBe('elite');
      expect(getPlayLevel(w, 7).kind).toBe('boss');
      expect(getPlayLevel(w, 7).isBoss).toBe(true);
      expect(getPlayLevel(w, 4).isBoss).toBe(false);
    }
  });

  it('given world 1, when read, then it teaches classic then hunt and never chains', () => {
    expect(getPlayLevel(1, 1).kind).toBe('classic');
    expect(getPlayLevel(1, 2).kind).toBe('hunt');
    expect(levels.map((l) => getPlayLevel(1, l).kind)).not.toContain('chain');
  });

  it('given worlds 2-4, when read, then each introduces one new kind (chain, fog, bomb)', () => {
    const kindsUpTo = (world: number) =>
      new Set(worlds.filter((w) => w <= world).flatMap((w) => levels.map((l) => getPlayLevel(w, l).kind)));
    expect(kindsUpTo(1).has('chain')).toBe(false);
    expect(kindsUpTo(2).has('chain')).toBe(true);
    expect(kindsUpTo(2).has('fog')).toBe(false);
    expect(kindsUpTo(3).has('fog')).toBe(true);
    expect(kindsUpTo(3).has('bomb')).toBe(false);
    expect(kindsUpTo(4).has('bomb')).toBe(true);
  });

  it('given every world, when read, then each declares a distinct twist', () => {
    const twists = worlds.map((w) => levels.map((l) => getPlayLevel(w, l).twist).find(Boolean));
    expect(twists.every(Boolean)).toBe(true);
    expect(new Set(twists).size).toBe(WORLD_COUNT);
  });

  it('given combat kinds, when read, then they carry enemy hp + id and bossHp mirrors it', () => {
    for (const w of worlds) {
      for (const l of [4, 7]) {
        const lvl = getPlayLevel(w, l);
        expect(isCombatKind(lvl.kind)).toBe(true);
        expect(lvl.enemyHp).toBeGreaterThan(0);
        expect(lvl.bossHp).toBe(lvl.enemyHp);
        expect(lvl.enemyId).toBe(l === 7 ? `boss-w${w}` : `elite-w${w}`);
      }
    }
    expect(getPlayLevel(1, 1).bossHp).toBe(0);
  });

  it('given hunt levels, when read, then they need at least 2 targets', () => {
    for (const w of worlds) for (const l of levels) {
      const lvl = getPlayLevel(w, l);
      if (lvl.kind === 'hunt') expect(lvl.huntCount).toBeGreaterThanOrEqual(2);
    }
  });

  it('given boards, when read, then worlds 1-3 are 4x4 and later worlds at least 5x5', () => {
    for (const l of levels) {
      expect(getPlayLevel(2, l).size).toBe(4);
      expect(getPlayLevel(6, l).size).toBeGreaterThanOrEqual(5);
    }
  });

  it('given the same slot in consecutive worlds, when compared, then elite and boss HP rise', () => {
    for (let w = 2; w <= WORLD_COUNT; w++) {
      expect(getPlayLevel(w, 7).enemyHp!).toBeGreaterThan(getPlayLevel(w - 1, 7).enemyHp!);
      expect(getPlayLevel(w, 4).enemyHp!).toBeGreaterThan(getPlayLevel(w - 1, 4).enemyHp!);
    }
  });
});
