/**
 * In-place edits to a live classroom game's settings.
 *
 * Separate from `classroomGameManager` on purpose. That module is the room's
 * LIFECYCLE — create, join, leave, status, teardown — and it is 471 lines. This
 * is the one thing a teacher may change about a room that already exists, and
 * the only caller so far is the in-lobby mode switch.
 *
 * The TTL is imported rather than retyped: a second `14400` here would be a
 * dual source of truth (recurring pitfall class 1) that nobody would notice
 * until a room expired four hours early.
 */

import { getRedisClient } from '../redisClient';
import logger from '../utils/logger';
import {
  CLASSROOM_GAME_TTL,
  getClassroomGame,
  type ClassroomGameSettings,
} from './classroomGameManager';

/** The mode a switchable classroom room may be pointed at. */
export type SwitchableClassroomMode = NonNullable<ClassroomGameSettings['gameMode']>;

/**
 * Point an existing room at a different game, keeping its code.
 *
 * This is the half of the switch the SERVER reads: `startVocabQuizForClassroom`
 * gates on `settings.gameMode` off this record, so a Classic→Vocab Quiz switch
 * that never reached Redis would start a letter grid instead of a quiz. The
 * board modes are read from the host's `startGame` payload, which the client
 * half of the switch updates in the same call.
 *
 * Returns false — and logs — rather than throwing, so a caller can tell the
 * teacher something true instead of the switch failing in silence.
 */
export async function setClassroomGameMode(
  gameCode: string,
  gameMode: SwitchableClassroomMode
): Promise<boolean> {
  try {
    const redis = getRedisClient();
    if (!redis) {
      logger.error('CLASSROOM_GAME', `No Redis client; cannot switch ${gameCode} to ${gameMode}`);
      return false;
    }
    const game = await getClassroomGame(gameCode);
    if (!game) {
      logger.warn('CLASSROOM_GAME', `Cannot switch mode: game ${gameCode} not found`);
      return false;
    }

    game.settings = { ...(game.settings ?? {}), gameMode };

    await redis.setex(
      `classroom_game:${gameCode}`,
      CLASSROOM_GAME_TTL,
      JSON.stringify(game)
    );
    logger.info('CLASSROOM_GAME', `Game ${gameCode} switched to ${gameMode} (same code)`);
    return true;
  } catch (error) {
    logger.error('CLASSROOM_GAME', `Failed to switch mode for ${gameCode}: ${error}`);
    return false;
  }
}

export default setClassroomGameMode;
