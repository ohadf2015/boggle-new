import { describe, it, expect } from 'vitest';
import { canPlayLevel, rewardsFor, totalStarsOf, WORLD_SKIN_ITEM } from '../progress';
import { getCollectibleById } from '@/lib/adventure/collectibleConfig';

const done = (world: number, level: number, stars: number) => ({ world, level, stars });

describe('canPlayLevel', () => {
  it('opens world 1 level 1 to everyone', () => {
    expect(canPlayLevel([], 1, 1)).toBe(true);
  });

  it('requires the previous level cleared', () => {
    expect(canPlayLevel([], 1, 2)).toBe(false);
    expect(canPlayLevel([done(1, 1, 1)], 1, 2)).toBe(true);
  });

  it('opens the next world only after its boss falls', () => {
    const w1 = [1, 2, 3, 4, 5, 6].map((l) => done(1, l, 3));
    expect(canPlayLevel(w1, 2, 1)).toBe(false);
    expect(canPlayLevel([...w1, done(1, 7, 1)], 2, 1)).toBe(true);
  });
});

describe('rewardsFor', () => {
  it('gives a lore scroll on a first clear', () => {
    expect(rewardsFor({ world: 2, level: 3, prevStars: 0, stars: 1, isBoss: false })).toEqual(['lore-scroll-w2-l3']);
  });

  it('gives a rune fragment the first time a level hits 3 stars', () => {
    expect(rewardsFor({ world: 2, level: 3, prevStars: 2, stars: 3, isBoss: false })).toEqual(['rune-fragment']);
    expect(rewardsFor({ world: 2, level: 3, prevStars: 3, stars: 3, isBoss: false })).toEqual([]);
  });

  it('gives the boss trophy (which unlocks the world skin) on the first boss win', () => {
    expect(rewardsFor({ world: 4, level: 7, prevStars: 0, stars: 2, isBoss: true })).toEqual(['boss-trophy-w4']);
    expect(WORLD_SKIN_ITEM(4)).toBe('boss-trophy-w4');
  });

  it('only ever grants items that exist in the collection catalog', () => {
    for (let world = 1; world <= 10; world++) {
      for (let level = 1; level <= 7; level++) {
        const ids = rewardsFor({ world, level, prevStars: 0, stars: 3, isBoss: level === 7 });
        for (const id of ids) expect(getCollectibleById(id), id).toBeDefined();
      }
    }
  });

  it('gives nothing for a loss', () => {
    expect(rewardsFor({ world: 1, level: 1, prevStars: 0, stars: 0, isBoss: false })).toEqual([]);
  });
});

describe('totalStarsOf', () => {
  it('sums stars', () => {
    expect(totalStarsOf([done(1, 1, 3), done(1, 2, 2)])).toBe(5);
  });
});
