import { describe, it, expect } from 'vitest';
import { deedTier, DEED_DROPS_PER_LEVEL } from '../deedTier';

describe('deedTier — the stamped banner a big blow earns', () => {
  it('given a small word on a fresh foe, then it stays a normal hit', () => {
    expect(deedTier({ word: 'cat', pts: 10, hpBefore: 170, maxHp: 170 })).toBeNull();
    expect(deedTier({ word: 'stone', pts: 30, hpBefore: 200, maxHp: 200 })).toBeNull();
  });

  it('given a word that takes 40%+ of the remaining HP, then it is CRUSHED', () => {
    expect(deedTier({ word: 'goat', pts: 40, hpBefore: 80, maxHp: 170 })).toBe('crushed');
  });

  it('given a word that nearly empties the bar, then it is OBLITERATED', () => {
    expect(deedTier({ word: 'stone', pts: 60, hpBefore: 70, maxHp: 170 })).toBe('obliterated');
  });

  it('given a long word, then length counts toward the deed even on a full bar', () => {
    expect(deedTier({ word: 'teacher', pts: 60, hpBefore: 200, maxHp: 200 })).toBe('crushed');
    expect(deedTier({ word: 'escalope', pts: 120, hpBefore: 200, maxHp: 200 })).toBe('obliterated');
  });

  it('given the killing blow, then no deed (the kill beat owns that moment)', () => {
    expect(deedTier({ word: 'stone', pts: 60, hpBefore: 60, maxHp: 170 })).toBeNull();
    expect(deedTier({ word: 'stone', pts: 90, hpBefore: 60, maxHp: 170 })).toBeNull();
  });

  it('given a chip on the last sliver, then no deed (it is a big share of nothing)', () => {
    expect(deedTier({ word: 'cat', pts: 10, hpBefore: 12, maxHp: 200 })).toBeNull();
    // A tutorial-size 4-letter word (20 of a 140 bar) never stamps, however low the foe is.
    expect(deedTier({ word: 'kilo', pts: 20, hpBefore: 40, maxHp: 140 })).toBeNull();
  });

  it('given no target or no damage, then no deed', () => {
    expect(deedTier({ word: 'stone', pts: 0, hpBefore: 60, maxHp: 170 })).toBeNull();
    expect(deedTier({ word: 'stone', pts: 30, hpBefore: 0, maxHp: 170 })).toBeNull();
  });

  it('caps the hint drops so a deed is a spike, not an economy', () => {
    expect(DEED_DROPS_PER_LEVEL).toBe(2);
  });
});

describe('deedTier — calibration', () => {
  it('given an ordinary 5-letter opener on a fresh hunt foe, then it stays a normal hit', () => {
    expect(deedTier({ word: 'chest', pts: 50, hpBefore: 140, maxHp: 140 })).toBeNull();
  });
});

describe('deedTier — the foe raises the stakes', () => {
  it('given the same blow, then a world boss earns a bigger deed than a tutorial foe', () => {
    const blow = { word: 'abune', pts: 50, hpBefore: 100 };
    expect(deedTier({ ...blow, maxHp: 210 })).toBe('crushed');
    expect(deedTier({ ...blow, maxHp: 200, foe: 'boss' })).toBe('obliterated');
  });
  it('given an elite, then it weighs in between', () => {
    expect(deedTier({ word: 'stone', pts: 45, hpBefore: 125, maxHp: 125, foe: 'elite' })).toBe('crushed');
    expect(deedTier({ word: 'stone', pts: 45, hpBefore: 125, maxHp: 125 })).toBeNull();
  });
});

describe('deedTier — the boss opener', () => {
  it('given an ordinary 5-letter opener on a full world boss, then it stays a normal hit', () => {
    expect(deedTier({ word: 'tesla', pts: 50, hpBefore: 200, maxHp: 200, foe: 'boss' })).toBeNull();
  });
});
