import { calculateMasteryTier, calculateMasteryCriteria, calculateWorldMastery, convertQuestProgressWithTargets, deriveBossHighHealth } from '../mastery';
import { getQuestsForChapter } from '../questConfig';
import type { LevelCompletion, ChapterQuestProgress, ChapterQuest } from '@/types/adventure';

describe('mastery', () => {
  const makeCompletions = (stars: (0 | 1 | 2 | 3)[]): LevelCompletion[] =>
    stars.map((s, i) => ({
      world: 1,
      level: i + 1,
      stars: s,
      bestScore: s * 100,
      bestWords: s * 5,
      completedAt: '2026-01-01T00:00:00Z',
    }));

  describe('calculateMasteryCriteria', () => {
    it('should detect all levels completed', () => {
      const completions = makeCompletions([1, 1, 1, 1, 1, 1, 1]);
      const criteria = calculateMasteryCriteria(1, completions, [], false, 0);
      expect(criteria.allLevelsCompleted).toBe(true);
      expect(criteria.allLevelsPerfect).toBe(false);
    });

    it('should detect all levels perfect', () => {
      const completions = makeCompletions([3, 3, 3, 3, 3, 3, 3]);
      const criteria = calculateMasteryCriteria(1, completions, [], false, 0);
      expect(criteria.allLevelsPerfect).toBe(true);
    });

    it('should not count incomplete worlds', () => {
      const completions = makeCompletions([3, 3, 3, 0, 0, 0, 0]);
      const criteria = calculateMasteryCriteria(1, completions, [], false, 0);
      expect(criteria.allLevelsCompleted).toBe(false);
    });

    it('should detect all quests completed', () => {
      const allW1Quests: ChapterQuest[] = [
        ...getQuestsForChapter(1, 1),
        ...getQuestsForChapter(1, 2),
        ...getQuestsForChapter(1, 3),
      ];
      const quests: ChapterQuestProgress[] = allW1Quests.map(q => ({
        questId: q.id,
        current: q.target,
        isComplete: true,
        rewardClaimed: true,
      }));
      const criteria = calculateMasteryCriteria(1, [], quests, false, 0);
      expect(criteria.allQuestsCompleted).toBe(true);
    });

    it('should detect boss high health', () => {
      const criteria = calculateMasteryCriteria(1, [], [], true, 0);
      expect(criteria.bossHighHealth).toBe(true);
    });

    it('should detect flash challenges mastered', () => {
      const criteria = calculateMasteryCriteria(1, [], [], false, 3);
      expect(criteria.flashChallengesMastered).toBe(true);
    });
  });

  describe('calculateMasteryTier', () => {
    it('should return 0 for empty criteria', () => {
      const criteria = {
        allLevelsCompleted: false,
        allLevelsPerfect: false,
        allQuestsCompleted: false,
        bossHighHealth: false,
        flashChallengesMastered: false,
      };
      expect(calculateMasteryTier(criteria)).toBe(0);
    });

    it('should count each fulfilled criterion as +1 tier', () => {
      expect(calculateMasteryTier({
        allLevelsCompleted: true,
        allLevelsPerfect: false,
        allQuestsCompleted: false,
        bossHighHealth: false,
        flashChallengesMastered: false,
      })).toBe(1);

      expect(calculateMasteryTier({
        allLevelsCompleted: true,
        allLevelsPerfect: true,
        allQuestsCompleted: true,
        bossHighHealth: false,
        flashChallengesMastered: false,
      })).toBe(3);
    });

    it('should cap at 5', () => {
      expect(calculateMasteryTier({
        allLevelsCompleted: true,
        allLevelsPerfect: true,
        allQuestsCompleted: true,
        bossHighHealth: true,
        flashChallengesMastered: true,
      })).toBe(5);
    });

    it('should return 2 for mixed non-adjacent criteria', () => {
      expect(calculateMasteryTier({
        allLevelsCompleted: false,
        allLevelsPerfect: false,
        allQuestsCompleted: true,
        bossHighHealth: false,
        flashChallengesMastered: true,
      })).toBe(2);
    });

    it('should return 4 with one criterion missing', () => {
      expect(calculateMasteryTier({
        allLevelsCompleted: true,
        allLevelsPerfect: true,
        allQuestsCompleted: true,
        bossHighHealth: true,
        flashChallengesMastered: false,
      })).toBe(4);
    });
  });

  describe('calculateWorldMastery', () => {
    it('should return tier 0 with empty data', () => {
      const mastery = calculateWorldMastery(1, [], [], false, 0);
      expect(mastery.worldId).toBe(1);
      expect(mastery.tier).toBe(0);
      expect(mastery.criteria.allLevelsCompleted).toBe(false);
    });

    it('should combine criteria into full mastery object', () => {
      const completions = makeCompletions([3, 3, 3, 3, 3, 3, 3]);
      const mastery = calculateWorldMastery(1, completions, [], true, 5);
      expect(mastery.worldId).toBe(1);
      expect(mastery.tier).toBeGreaterThanOrEqual(3);
      expect(mastery.criteria.allLevelsCompleted).toBe(true);
      expect(mastery.criteria.allLevelsPerfect).toBe(true);
      expect(mastery.criteria.bossHighHealth).toBe(true);
      expect(mastery.criteria.flashChallengesMastered).toBe(true);
    });

    it('should filter completions by world id', () => {
      const world2Completions: LevelCompletion[] = makeCompletions([3, 3, 3, 3, 3, 3, 3]).map(
        c => ({ ...c, world: 2 })
      );
      const mastery = calculateWorldMastery(1, world2Completions, [], false, 0);
      expect(mastery.criteria.allLevelsCompleted).toBe(false);
    });
  });

  describe('convertQuestProgressWithTargets', () => {
    it('should return empty array for undefined input', () => {
      expect(convertQuestProgressWithTargets(1, undefined)).toEqual([]);
    });

    it('should mark quests as complete when current >= target', () => {
      const quests = getQuestsForChapter(1, 1);
      const progressMap: Record<string, number> = {};
      for (const q of quests) {
        progressMap[q.id] = q.target; // exactly at target
      }
      const result = convertQuestProgressWithTargets(1, progressMap);
      const chapter1Results = result.filter(r => quests.some(q => q.id === r.questId));
      expect(chapter1Results.every(r => r.isComplete)).toBe(true);
    });

    it('should mark quests as incomplete when below target', () => {
      const progressMap: Record<string, number> = {};
      const result = convertQuestProgressWithTargets(1, progressMap);
      expect(result.every(r => !r.isComplete)).toBe(true);
    });
  });

  describe('deriveBossHighHealth', () => {
    it('should return true when boss level (7) has 3 stars', () => {
      const completions = makeCompletions([3, 3, 3, 3, 3, 3, 3]);
      expect(deriveBossHighHealth(1, completions)).toBe(true);
    });

    it('should return false when boss level has < 3 stars', () => {
      const completions = makeCompletions([3, 3, 3, 3, 3, 3, 1]);
      expect(deriveBossHighHealth(1, completions)).toBe(false);
    });

    it('should return false when boss level not completed', () => {
      const completions = makeCompletions([3, 3, 3, 3, 3, 3]);
      expect(deriveBossHighHealth(1, completions)).toBe(false);
    });
  });
});
