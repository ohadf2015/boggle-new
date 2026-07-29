/**
 * World Mastery System
 *
 * Calculates per-world mastery tier (0-5) based on 5 criteria:
 * 1. All 7 levels completed (any stars)
 * 2. All 7 levels 3-starred
 * 3. All chapter quests completed
 * 4. Boss defeated with 50%+ health
 * 5. 3+ flash challenges completed in this world
 */

import type {
  MasteryTier,
  MasteryCriteria,
  WorldMastery,
  LevelCompletion,
  ChapterQuestProgress,
} from '@/types/adventure';
import { LEVELS_PER_WORLD } from './constants';
import { getQuestsForChapter } from './questConfig';

/**
 * Convert progression's chapterQuestProgress (Record<string, number>)
 * into the ChapterQuestProgress[] format expected by mastery calculation.
 */
export function convertQuestProgress(
  progressMap: Record<string, number> | undefined,
): ChapterQuestProgress[] {
  if (!progressMap) return [];
  return Object.entries(progressMap).map(([questId, current]) => ({
    questId,
    current,
    // Quest target lookup is done inside calculateMasteryCriteria via getQuestsForChapter,
    // so we mark complete if current > 0 — the actual completion check uses the quest config target.
    // We need to check against the quest's target to be accurate.
    isComplete: false, // placeholder — overridden below
    rewardClaimed: false,
  }));
}

/**
 * Convert progression quest map with accurate completion status.
 * Checks each quest's current count against its target from config.
 */
export function convertQuestProgressWithTargets(
  worldId: number,
  progressMap: Record<string, number> | undefined,
): ChapterQuestProgress[] {
  if (!progressMap) return [];
  const result: ChapterQuestProgress[] = [];
  for (let ch = 1; ch <= 3; ch++) {
    for (const quest of getQuestsForChapter(worldId, ch)) {
      const current = progressMap[quest.id] ?? 0;
      result.push({
        questId: quest.id,
        current,
        isComplete: current >= quest.target,
        rewardClaimed: false,
      });
    }
  }
  return result;
}

/**
 * Check if the boss level (level 7) was defeated with 3 stars in this world.
 * Used as a proxy for "boss defeated with high health" when detailed boss health isn't tracked.
 */
export function deriveBossHighHealth(worldId: number, completions: LevelCompletion[]): boolean {
  const bossCompletion = completions.find(c => c.world === worldId && c.level === LEVELS_PER_WORLD);
  return bossCompletion != null && bossCompletion.stars === 3;
}

/**
 * Calculate mastery criteria for a specific world
 */
export function calculateMasteryCriteria(
  worldId: number,
  completions: LevelCompletion[],
  questProgress: ChapterQuestProgress[],
  bossHighHealth: boolean,
  flashChallengesCompleted: number,
): MasteryCriteria {
  const worldCompletions = completions.filter(c => c.world === worldId);
  const completedLevels = worldCompletions.filter(c => c.stars >= 1).length;
  const perfectLevels = worldCompletions.filter(c => c.stars === 3).length;

  // Check all chapter quests for this world
  const worldQuestIds = new Set<string>();
  for (let ch = 1; ch <= 3; ch++) {
    for (const q of getQuestsForChapter(worldId, ch)) {
      worldQuestIds.add(q.id);
    }
  }
  const completedQuests = questProgress.filter(
    p => worldQuestIds.has(p.questId) && p.isComplete
  );
  const allQuestsCompleted = worldQuestIds.size > 0 && completedQuests.length >= worldQuestIds.size;

  return {
    allLevelsCompleted: completedLevels >= LEVELS_PER_WORLD,
    allLevelsPerfect: perfectLevels >= LEVELS_PER_WORLD,
    allQuestsCompleted,
    bossHighHealth,
    flashChallengesMastered: flashChallengesCompleted >= 3,
  };
}

/**
 * Calculate mastery tier from criteria (each fulfilled criterion = +1 tier, cap at 5)
 */
export function calculateMasteryTier(criteria: MasteryCriteria): MasteryTier {
  const count = [
    criteria.allLevelsCompleted,
    criteria.allLevelsPerfect,
    criteria.allQuestsCompleted,
    criteria.bossHighHealth,
    criteria.flashChallengesMastered,
  ].filter(Boolean).length;

  return Math.min(count, 5) as MasteryTier;
}

/**
 * Calculate full world mastery state
 */
export function calculateWorldMastery(
  worldId: number,
  completions: LevelCompletion[],
  questProgress: ChapterQuestProgress[],
  bossHighHealth: boolean,
  flashChallengesCompleted: number,
): WorldMastery {
  const criteria = calculateMasteryCriteria(
    worldId, completions, questProgress, bossHighHealth, flashChallengesCompleted
  );
  return {
    worldId,
    tier: calculateMasteryTier(criteria),
    criteria,
  };
}
