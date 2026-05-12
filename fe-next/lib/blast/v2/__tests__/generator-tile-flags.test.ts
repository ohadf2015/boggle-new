import { describe, it, expect } from 'vitest';
import { rollTileFlags } from '../generator/tile-flags';
import { seededPRNG } from '../prng';
import { mechanicsForLevel } from '../mechanic-flags';
import type { CellId } from '../types';

describe('rollTileFlags', () => {
  it('level 1 has no flags', () => {
    const prng = seededPRNG(42);
    const mechanics = mechanicsForLevel(1);
    const cellIds: CellId[] = ['c0r0', 'c0r1', 'c1r0', 'c1r1'];
    const flags = rollTileFlags(cellIds, mechanics, 1, prng);
    expect(Object.keys(flags).length).toBe(0);
  });

  it('level 3+ rolls coins ~20%', () => {
    const cellIds: CellId[] = [];
    for (let i = 0; i < 100; i++) cellIds.push(`c0r${i}` as CellId);
    const prng = seededPRNG(99);
    const mechanics = mechanicsForLevel(3);
    const flags = rollTileFlags(cellIds, mechanics, 3, prng);
    const coinCount = Object.values(flags).filter((f) => f.includes('coin')).length;
    expect(coinCount).toBeGreaterThan(10);
    expect(coinCount).toBeLessThan(40);
  });

  it('level 8+ guarantees frozen tile', () => {
    const cellIds: CellId[] = ['c0r0', 'c0r1', 'c1r0'];
    const prng = seededPRNG(42);
    const mechanics = mechanicsForLevel(8);
    const flags = rollTileFlags(cellIds, mechanics, 8, prng);
    const hasFrozen = Object.values(flags).some((f) => f.includes('frozen'));
    expect(hasFrozen).toBe(true);
  });

  it('level 15+ rolls double-bonus ~5%', () => {
    const cellIds: CellId[] = [];
    for (let i = 0; i < 100; i++) cellIds.push(`c0r${i}` as CellId);
    const prng = seededPRNG(77);
    const mechanics = mechanicsForLevel(15);
    const flags = rollTileFlags(cellIds, mechanics, 15, prng);
    const bonusCount = Object.values(flags).filter((f) => f.includes('double_bonus')).length;
    expect(bonusCount).toBeGreaterThan(0);
    expect(bonusCount).toBeLessThan(20);
  });

  it('frozen tile does not duplicate', () => {
    const cellIds: CellId[] = ['c0r0', 'c0r1'];
    const prng = seededPRNG(55);
    const mechanics = mechanicsForLevel(8);
    const flags = rollTileFlags(cellIds, mechanics, 8, prng);
    for (const tileFlags of Object.values(flags)) {
      const frozenCount = tileFlags.filter((f) => f === 'frozen').length;
      expect(frozenCount).toBeLessThanOrEqual(1);
    }
  });
});
