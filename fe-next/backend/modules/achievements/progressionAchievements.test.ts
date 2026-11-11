import { describe, it, expect } from 'vitest';
import {
  PROGRESSION_ACHIEVEMENTS,
  categoryFor,
  ACHIEVEMENT_TITLE_REWARDS,
  progressionAchievementsFor,
  achievementsForCount,
  COUNT_LADDERS,
} from './progressionAchievements';
import { ACHIEVEMENT_ICONS, checkLifetimeAchievements } from '../achievementManager';
import { ACHIEVEMENT_ICONS as CLIENT_ICONS } from '@/constants/achievementIcons';

describe('progression achievements', () => {
  it('adds about twenty new achievements across five categories', () => {
    const keys = Object.keys(PROGRESSION_ACHIEVEMENTS);
    expect(keys.length).toBeGreaterThanOrEqual(20);
    const cats = new Set(keys.map(k => PROGRESSION_ACHIEVEMENTS[k].category));
    expect([...cats].sort()).toEqual(['daily', 'progression', 'records', 'rivalry', 'social']);
  });

  it('every achievement, old and new, has a category', () => {
    for (const key of Object.keys(ACHIEVEMENT_ICONS)) expect(categoryFor(key)).toBeTruthy();
  });

  it('server and client icon maps both include the new keys', () => {
    for (const key of Object.keys(PROGRESSION_ACHIEVEMENTS)) {
      expect(ACHIEVEMENT_ICONS[key]).toBe(PROGRESSION_ACHIEVEMENTS[key].icon);
      expect(CLIENT_ICONS[key]).toBe(PROGRESSION_ACHIEVEMENTS[key].icon);
    }
  });

  it('level milestones grant once the level is reached', () => {
    // Given a level-26 player with LEVEL_10 already
    const got = progressionAchievementsFor({ currentLevel: 26 }, new Set(['LEVEL_10']));
    // Then 5 and 25 are new, 10 is not repeated, 50 not yet
    expect(got.sort()).toEqual(['LEVEL_25', 'LEVEL_5']);
  });

  it('lifetime check includes level milestones', () => {
    const got = checkLifetimeAchievements({ currentLevel: 10 }, []).map(a => a.key);
    expect(got).toEqual(expect.arrayContaining(['LEVEL_5', 'LEVEL_10']));
  });

  it('WORLD_RECORD is a records achievement the world-record cron can grant', async () => {
    const { WORLD_RECORD_ACHIEVEMENT } = await import('@/lib/records/worldRecordCron');
    expect(PROGRESSION_ACHIEVEMENTS[WORLD_RECORD_ACHIEVEMENT]?.category).toBe('records');
    expect(ACHIEVEMENT_ICONS[WORLD_RECORD_ACHIEVEMENT]).toBeTruthy();
  });

  it('title rewards point at real achievements', () => {
    for (const key of Object.keys(ACHIEVEMENT_TITLE_REWARDS)) expect(PROGRESSION_ACHIEVEMENTS[key]).toBeTruthy();
  });
});

describe('count ladders', () => {
  it('grants every rung reached, in order', () => {
    // Given 6 rival wins
    // Then the 1 and 5 rungs are earned, 25 is not
    expect(achievementsForCount(COUNT_LADDERS.rivalWins, 6)).toEqual(['RIVALRY_FIRST_WIN', 'RIVALRY_5_WINS']);
  });

  it('grants nothing at zero', () => {
    expect(achievementsForCount(COUNT_LADDERS.pings, 0)).toEqual([]);
  });

  it('every ladder key is a defined achievement', () => {
    for (const ladder of Object.values(COUNT_LADDERS)) {
      for (const [, key] of ladder) expect(PROGRESSION_ACHIEVEMENTS[key]).toBeTruthy();
    }
  });
});
