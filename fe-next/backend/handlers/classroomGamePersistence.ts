/**
 * Classroom Game Persistence
 *
 * Persists classroom MP game scores to `practice_sessions` and awards
 * education XP via the `award_education_xp` RPC. Extracted from
 * classroomGameHandler.ts so the data path can be unit-tested in isolation.
 *
 * F-05: When a game covers multiple lessons, XP is split evenly across
 *       all lessonIds instead of being attributed to lessonIds[0] only.
 * F-06: `mode` column stores the real game mode (classic/wordHunt/blast)
 *       and `classroom_id` is populated so analytics can distinguish
 *       classroom MP games from solo practice. `practice_type` remains
 *       'solo_board' because of the CHECK constraint from migration 058.
 */

import { getSupabase } from '../modules/supabase/client.js';
import { getRedisClient } from '../redisClient.js';
import type { ClassroomGame } from '../modules/classroomGameManager.js';
import logger from '../utils/logger.js';

type PlayerScore = { userId: string; score: number; wordsFound?: string[] };

/**
 * Per-player reward summary returned from persistClassroomGameScores.
 * The classroomGameEnded broadcast uses this to tell each client how much
 * XP the server awarded, so the frontend can drive LevelUpCelebration /
 * AchievementUnlockModal via a level-diff detector.
 */
export type ClassroomGameReward = {
  userId: string;
  xpEarned: number;
  lessonIds: string[];
};

export async function persistClassroomGameScores(
  game: ClassroomGame | null | undefined,
  playerScores?: PlayerScore[]
): Promise<ClassroomGameReward[]> {
  if (!game) return [];

  // Idempotency guard: only persist once per game using Redis SET NX
  const redis = getRedisClient();
  if (redis) {
    const idempotencyKey = `classroom_game_persisted:${game.gameCode}`;
    const acquired = await redis.set(idempotencyKey, '1', 'EX', 86400, 'NX');
    if (!acquired) {
      logger.info(
        'CLASSROOM_GAME',
        `Scores for game ${game.gameCode} already persisted — skipping duplicate`
      );
      return [];
    }
  }

  const supabase = getSupabase();
  if (!supabase) {
    logger.warn('CLASSROOM_GAME', 'Supabase not configured, skipping score persistence');
    return [];
  }

  const lessonIds = game.lessonIds ?? [];
  if (lessonIds.length === 0) {
    logger.warn(
      'CLASSROOM_GAME',
      `Game ${game.gameCode} has no lesson IDs, skipping persistence`
    );
    return [];
  }

  const rewards: ClassroomGameReward[] = [];

  // Anchor the session row to the first lesson to avoid inflating
  // `board_sessions` counts in analytics views. Multi-lesson attribution
  // is handled at the XP layer below (F-05).
  const primaryLessonId = lessonIds[0];
  const gameMode = game.settings?.gameMode ?? 'classic';

  for (const player of game.players) {
    let xpEarned = 0;
    try {
      const playerScore = playerScores?.find(ps => ps.userId === player.userId);
      const score = playerScore?.score ?? 0;
      const wordsFound = playerScore?.wordsFound ?? [];

      const { error: sessionError } = await supabase
        .from('practice_sessions')
        .insert({
          student_id: player.userId,
          lesson_id: primaryLessonId,
          classroom_id: game.classroomId, // F-06
          practice_type: 'solo_board',     // constrained by 058 CHECK
          mode: gameMode,                  // F-06: real mode
          total_score: score,
          score,
          words_found: wordsFound,
          completed_at: new Date().toISOString(),
        });

      if (sessionError) {
        logger.error(
          'CLASSROOM_GAME',
          `Failed to create practice session for ${player.userId}: ${sessionError.message}`
        );
        continue;
      }

      // F-05: Split XP across all lessons covered by this game.
      if (score > 0) {
        const totalXp = Math.max(10, Math.floor(score / 10));
        const perLessonXp = Math.floor(totalXp / lessonIds.length);
        if (perLessonXp === 0) {
          rewards.push({ userId: player.userId, xpEarned: 0, lessonIds });
          continue;
        }
        xpEarned = totalXp;

        for (const lessonId of lessonIds) {
          const { error: xpError } = await supabase.rpc('award_education_xp', {
            p_student_id: player.userId,
            p_xp_amount: perLessonXp,
            p_lesson_id: lessonId,
          });

          if (xpError) {
            logger.error(
              'CLASSROOM_GAME',
              `Failed to award XP for ${player.userId} on lesson ${lessonId}: ${xpError.message}`
            );
          } else {
            logger.info(
              'CLASSROOM_GAME',
              `Awarded ${perLessonXp} XP to ${player.userId} for lesson ${lessonId} (game ${game.gameCode})`
            );
          }
        }
      }
    } catch (error) {
      logger.error(
        'CLASSROOM_GAME',
        `Error persisting score for player ${player.userId}: ${error}`
      );
    }
    rewards.push({ userId: player.userId, xpEarned, lessonIds });
  }

  return rewards;
}
