import { describe, it, expect } from 'vitest';
import { potionUsable } from '../potionUsable';

const base = { playing: true, inFight: false, hp: 3, maxHp: 5 };

describe('potionUsable', () => {
  it('given the level is not playing, then no potion can be drunk', () => {
    expect(potionUsable('time', { ...base, playing: false })).toBe(false);
  });

  it('given hearts are full, when the potion is heal, then it is NOT usable (it would be wasted)', () => {
    expect(potionUsable('heal', { ...base, hp: 5, maxHp: 5 })).toBe(false);
  });

  it('given a missing heart, when the potion is heal, then it is usable', () => {
    expect(potionUsable('heal', base)).toBe(true);
  });

  it('given a fight, then heal follows the fight hearts, not the run hearts', () => {
    expect(potionUsable('heal', { ...base, hp: 5, inFight: true, fightHp: 2, fightMaxHp: 5 })).toBe(true);
    expect(potionUsable('heal', { ...base, hp: 1, inFight: true, fightHp: 5, fightMaxHp: 5 })).toBe(false);
  });

  it('given no fight, when the potion is cleanse, then it is not usable', () => {
    expect(potionUsable('cleanse', base)).toBe(false);
    expect(potionUsable('cleanse', { ...base, inFight: true, fightHp: 5, fightMaxHp: 5 })).toBe(true);
  });

  it('given a playing level, then time and insight are always usable', () => {
    expect(potionUsable('time', { ...base, hp: 5 })).toBe(true);
    expect(potionUsable('insight', { ...base, hp: 5 })).toBe(true);
  });
});
