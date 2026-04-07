import {
  getDailyQuests,
  DAILY_QUEST_POOL,
  DAILY_QUEST_COMPLETION_BONUS,
  checkAllDailyQuestsComplete,
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

  describe('world filtering', () => {
    it('should exclude bossDefeat and mechanicUse quests for world 1 players', () => {
      // Try many dates to ensure we'd normally hit these types
      const allQuests: DailyQuest[] = [];
      for (let d = 1; d <= 30; d++) {
        allQuests.push(...getDailyQuests(`2026-03-${String(d).padStart(2, '0')}`, 1));
      }
      const types = allQuests.map(q => q.type);
      expect(types).not.toContain('bossDefeat');
      expect(types).not.toContain('mechanicUse');
    });

    it('should include bossDefeat and mechanicUse quests for world 2+ players', () => {
      const allQuests: DailyQuest[] = [];
      for (let d = 1; d <= 30; d++) {
        allQuests.push(...getDailyQuests(`2026-03-${String(d).padStart(2, '0')}`, 5));
      }
      const types = new Set(allQuests.map(q => q.type));
      expect(types.has('bossDefeat')).toBe(true);
      expect(types.has('mechanicUse')).toBe(true);
    });

    it('should default to no filtering (world 10) when currentWorld omitted', () => {
      // Default = world 10, all quest types eligible
      const allQuests: DailyQuest[] = [];
      for (let d = 1; d <= 30; d++) {
        allQuests.push(...getDailyQuests(`2026-03-${String(d).padStart(2, '0')}`));
      }
      const types = new Set(allQuests.map(q => q.type));
      expect(types.has('bossDefeat')).toBe(true);
    });
  });

  describe('checkAllDailyQuestsComplete', () => {
    it('should return true when all 3 quests meet their targets', () => {
      const quests = getDailyQuests('2026-03-14');
      const progress: Record<string, number> = {};
      for (const q of quests) {
        progress[q.id] = q.target;
      }
      expect(checkAllDailyQuestsComplete(quests, progress)).toBe(true);
    });

    it('should return true when progress exceeds targets', () => {
      const quests = getDailyQuests('2026-03-14');
      const progress: Record<string, number> = {};
      for (const q of quests) {
        progress[q.id] = q.target + 10;
      }
      expect(checkAllDailyQuestsComplete(quests, progress)).toBe(true);
    });

    it('should return false when one quest is incomplete', () => {
      const quests = getDailyQuests('2026-03-14');
      const progress: Record<string, number> = {};
      for (const q of quests) {
        progress[q.id] = q.target;
      }
      progress[quests[2].id] = quests[2].target - 1;
      expect(checkAllDailyQuestsComplete(quests, progress)).toBe(false);
    });

    it('should return false when progress is empty', () => {
      const quests = getDailyQuests('2026-03-14');
      expect(checkAllDailyQuestsComplete(quests, {})).toBe(false);
    });

    it('should return false when quests array is not exactly 3', () => {
      const quests = getDailyQuests('2026-03-14').slice(0, 2);
      const progress: Record<string, number> = {};
      for (const q of quests) {
        progress[q.id] = q.target;
      }
      expect(checkAllDailyQuestsComplete(quests, progress)).toBe(false);
    });

    it('should export DAILY_QUEST_COMPLETION_BONUS as 50', () => {
      expect(DAILY_QUEST_COMPLETION_BONUS).toBe(50);
    });
  });
});
