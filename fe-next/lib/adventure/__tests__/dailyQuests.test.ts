import {
  getDailyQuests,
  DAILY_QUEST_POOL,
  type DailyQuest,
} from '../dailyQuests';

describe('dailyQuests', () => {
  it('should have at least 12 quests in the pool', () => {
    expect(DAILY_QUEST_POOL.length).toBeGreaterThanOrEqual(12);
  });

  it('should have unique IDs in the pool', () => {
    const ids = DAILY_QUEST_POOL.map(q => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should return exactly 3 daily quests', () => {
    const quests = getDailyQuests('2026-03-14');
    expect(quests).toHaveLength(3);
  });

  it('should return same quests for same date', () => {
    const q1 = getDailyQuests('2026-03-14');
    const q2 = getDailyQuests('2026-03-14');
    expect(q1.map(q => q.id)).toEqual(q2.map(q => q.id));
  });

  it('should return different quests for different dates', () => {
    const q1 = getDailyQuests('2026-03-14');
    const q2 = getDailyQuests('2026-03-15');
    // At least 1 should differ (very unlikely all 3 match from different seeds)
    const ids1 = q1.map(q => q.id).join(',');
    const ids2 = q2.map(q => q.id).join(',');
    expect(ids1).not.toBe(ids2);
  });

  it('should have valid rewards on all quests', () => {
    for (const q of DAILY_QUEST_POOL) {
      expect(q.rewardGold).toBeGreaterThan(0);
      expect(q.target).toBeGreaterThan(0);
    }
  });

  it('should return 3 distinct quests (no duplicates)', () => {
    const quests = getDailyQuests('2026-03-14');
    const ids = quests.map(q => q.id);
    expect(new Set(ids).size).toBe(3);
  });
});
