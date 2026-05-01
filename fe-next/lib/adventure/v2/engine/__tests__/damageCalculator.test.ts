import { describe, it, expect } from 'vitest';
import { calculateDamage } from '../damageCalculator';
import type { Tile } from '../../types';

const T = (letter: string, value: number, rarity: Tile['rarity'] = 'common'): Tile => ({
  id: 0,
  letter,
  letterValue: value,
  rarity,
});

describe('calculateDamage', () => {
  it('returns base = sum(letterValues) * length_multiplier for a 3-letter word', () => {
    const tiles = [T('C', 3), T('A', 1), T('T', 1)];
    expect(calculateDamage(tiles, { critRoll: 1.0, runeBonusSum: 0, heroAtk: 1 })).toBe(5);
  });

  it('applies length multiplier 1.3 for a 4-letter word', () => {
    const tiles = [T('S', 1), T('T', 1), T('A', 1), T('R', 1)];
    expect(calculateDamage(tiles, { critRoll: 1.0, runeBonusSum: 0, heroAtk: 1 })).toBe(5);
  });

  it('applies crit ×2', () => {
    const tiles = [T('C', 3), T('A', 1), T('T', 1)];
    expect(calculateDamage(tiles, { critRoll: 2.0, runeBonusSum: 0, heroAtk: 1 })).toBe(10);
  });

  it('applies rune bonus additively', () => {
    const tiles = [T('C', 3), T('A', 1), T('T', 1)];
    expect(calculateDamage(tiles, { critRoll: 1.0, runeBonusSum: 0.5, heroAtk: 1 })).toBe(7);
  });

  it('applies heroAtk multiplier', () => {
    const tiles = [T('C', 3), T('A', 1), T('T', 1)];
    expect(calculateDamage(tiles, { critRoll: 1.0, runeBonusSum: 0, heroAtk: 2 })).toBe(10);
  });

  it('uses ×3.5 for 8+ letter words', () => {
    const tiles = 'STORMING'.split('').map((l) => T(l, 1));
    expect(calculateDamage(tiles, { critRoll: 1.0, runeBonusSum: 0, heroAtk: 1 })).toBe(28);
  });

  it('returns 0 for words shorter than 3 letters', () => {
    expect(calculateDamage([T('A', 1), T('T', 1)], { critRoll: 1, runeBonusSum: 0, heroAtk: 1 })).toBe(0);
  });
});
