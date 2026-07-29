/**
 * Shared DB row → domain type transformers for adventure API routes.
 * Used by /api/adventure/progress and /api/adventure/state.
 */

import type { PlayerProgression, LevelCompletion, LevelAttempt } from '@/types/adventure';

export function transformProgression(
  dbRow: Record<string, unknown> | null,
  completions: LevelCompletion[]
): PlayerProgression {
  if (!dbRow) {
    return {
      userId: '',
      playerLevel: 1,
      xp: 0,
      currentWorld: 1,
      currentLevel: 1,
      totalStars: 0,
      gold: 0,
      upgrades: {},
      skillPoints: 0,
      skillTree: {},
      runeFragments: 0,
      runes: [],
      endlessHighFloor: 0,
      completions,
      chapterQuestProgress: {},
      wordAlbum: [],
      wordAlbumClaimedMilestones: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    userId: dbRow.user_id as string,
    playerLevel: dbRow.player_level as number,
    xp: dbRow.xp as number,
    currentWorld: dbRow.current_world as number,
    currentLevel: dbRow.current_level as number,
    totalStars: dbRow.total_stars as number,
    gold: (dbRow.gold as number) ?? 0,
    upgrades: (dbRow.upgrades as Record<string, number>) ?? {},
    skillPoints: (dbRow.skill_points as number) ?? 0,
    skillTree: (dbRow.skill_tree as Record<string, number>) ?? {},
    runeFragments: (dbRow.rune_fragments as number) ?? 0,
    runes: (dbRow.runes as Array<{ runeId: string; equipped: boolean }>) ?? [],
    chapterQuestProgress: (dbRow.chapter_quest_progress as Record<string, number>) ?? {},
    wordAlbum: (dbRow.word_album as string[]) ?? [],
    wordAlbumClaimedMilestones: (dbRow.word_album_claimed_milestones as number[]) ?? [],
    endlessHighFloor: (dbRow.endless_high_floor as number) ?? 0,
    completions,
    createdAt: dbRow.created_at as string,
    updatedAt: dbRow.updated_at as string,
  };
}

export function transformCompletion(dbRow: Record<string, unknown>): LevelCompletion {
  return {
    world: dbRow.world as number,
    level: dbRow.level as number,
    stars: dbRow.stars as 0 | 1 | 2 | 3,
    bestScore: dbRow.best_score as number,
    bestWords: dbRow.best_words as number,
    completedAt: dbRow.completed_at as string,
  };
}

export function transformAttempt(dbRow: Record<string, unknown>): LevelAttempt {
  return {
    world: dbRow.world as number,
    level: dbRow.level as number,
    bestWords: dbRow.best_words as number,
    bestScore: dbRow.best_score as number,
    bestTimeRemaining: dbRow.best_time_remaining as number,
    objectiveProgress: dbRow.objective_progress as Record<string, number>,
    attemptCount: dbRow.attempt_count as number,
    consecutiveFailures: dbRow.consecutive_failures as number,
    firstAttemptAt: dbRow.first_attempt_at as string,
    lastAttemptAt: dbRow.last_attempt_at as string,
  };
}
