import { describe, it, expect } from 'vitest';
import { WORD_TOWER_ACHIEVEMENTS, newlyUnlocked, type AchievementStats } from '../achievements';

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

describe('expanded feat roster (more to chase)', () => {
  const unlocks = (over: Partial<AchievementStats>) => newlyUnlocked({ ...base, ...over }, new Set()).map((a) => a.id);

  it('has unique ids and a richer spread of feats', () => {
    const ids = WORD_TOWER_ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(WORD_TOWER_ACHIEVEMENTS.length).toBeGreaterThanOrEqual(12);
    for (const a of WORD_TOWER_ACHIEVEMENTS) {
      expect(a.icon.length).toBeGreaterThan(0);
      expect(a.nameKey).toMatch(/^wordTower\.ach\./);
    }
  });

  it('unlocks the new combo / word / floor / altitude feats at their thresholds', () => {
    expect(unlocks({ longestCombo: 8 })).toContain('comboGod');
    expect(unlocks({ longestWord: 9 })).toContain('wordWizard');
    expect(unlocks({ floors: 25 })).toContain('skylineKing');
    expect(unlocks({ floors: 100 })).toContain('centurion');
    expect(unlocks({ heightM: 800 })).toContain('galaxyClass');
    expect(unlocks({ heightM: 2000 })).toContain('deepSpace');
  });

  it('does not unlock the high-bar feats one step early', () => {
    const low = unlocks({ longestCombo: 7, longestWord: 8, floors: 24, heightM: 799 });
    for (const id of ['comboGod', 'wordWizard', 'skylineKing', 'galaxyClass', 'deepSpace']) {
      expect(low).not.toContain(id);
    }
  });
});
