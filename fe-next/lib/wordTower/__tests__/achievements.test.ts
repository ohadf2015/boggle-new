import { describe, it, expect } from 'vitest';
import { newlyUnlocked, type AchievementStats } from '../achievements';

const base: AchievementStats = { heightM: 0, floors: 0, longestWord: 0, longestCombo: 0, passedRival: false };

describe('newlyUnlocked', () => {
  it('unlocks feats the stats satisfy', () => {
    const ids = newlyUnlocked({ ...base, floors: 1 }, new Set()).map((a) => a.id);
    expect(ids).toContain('firstFloor');
  });

  it('does not re-unlock already-unlocked feats', () => {
    const ids = newlyUnlocked({ ...base, floors: 12 }, new Set(['firstFloor'])).map((a) => a.id);
    expect(ids).toContain('tenFloors');
    expect(ids).not.toContain('firstFloor');
  });

  it('respects each threshold', () => {
    expect(newlyUnlocked({ ...base, heightM: 99 }, new Set()).map((a) => a.id)).not.toContain('skyHigh');
    expect(newlyUnlocked({ ...base, heightM: 100 }, new Set()).map((a) => a.id)).toContain('skyHigh');
    expect(newlyUnlocked({ ...base, longestWord: 7 }, new Set()).map((a) => a.id)).toContain('wordsmith');
    expect(newlyUnlocked({ ...base, longestCombo: 5 }, new Set()).map((a) => a.id)).toContain('comboKing');
    expect(newlyUnlocked({ ...base, passedRival: true }, new Set()).map((a) => a.id)).toContain('rivalCrusher');
  });

  it('returns nothing for an empty run', () => {
    expect(newlyUnlocked(base, new Set())).toEqual([]);
  });
});
