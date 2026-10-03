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
import { normalizeClassroomPressure } from '@/shared/utils/classroomPressure';
import type { ClassroomPressure } from '@/shared/types/classroom';
import type { VocabQuizVariant } from '@/shared/types/vocabQuiz';
import {
  CLASSROOM_GAME_TTL,
  getClassroomGame,
  withClassroomGameLock,
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
export function setClassroomGameMode(
  gameCode: string,
  gameMode: SwitchableClassroomMode,
  vocabQuizVariant?: VocabQuizVariant
): Promise<boolean> {
  // Same queue as the roster writers — a join mid-switch must not drop the new mode.
  return withClassroomGameLock(gameCode, () => setClassroomGameModeUnlocked(gameCode, gameMode, vocabQuizVariant));
}

async function setClassroomGameModeUnlocked(
  gameCode: string,
  gameMode: SwitchableClassroomMode,
  vocabQuizVariant?: VocabQuizVariant
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

    // The variant is rewritten on EVERY switch, so Boss -> Quiz (same gameMode) cannot keep a stale boss.
    const { vocabQuizVariant: _stale, ...rest } = game.settings ?? {};
    game.settings = {
      ...rest,
      gameMode,
      ...(gameMode === 'vocab-quiz' && vocabQuizVariant === 'boss' ? { vocabQuizVariant } : {}),
    };

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

/**
 * Write the teacher's pressure dials onto a live room.
 *
 * The dials cannot ride `createClassroomGame` — that handler whitelists every
 * settings key and is owned by another change — so they land here instead,
 * the same way the in-lobby mode switch does: the lobby emits once the room
 * exists, and `startGame` later reads them back off this record.
 *
 * The value is NORMALIZED before it is stored: the server is the source of
 * truth for what the dials mean, and a partial or hand-rolled payload must
 * land as valid fields plus the loud defaults, never as raw client junk.
 *
 * The settings type lives in classroomGameManager (separate ownership), so
 * the write goes through a local intersection — runtime spread carries the
 * field either way.
 */
export function setClassroomPressureSettings(
  gameCode: string,
  pressure: ClassroomPressure
): Promise<boolean> {
  return withClassroomGameLock(gameCode, async () => {
    try {
      const redis = getRedisClient();
      if (!redis) {
        logger.error('CLASSROOM_GAME', `No Redis client; cannot set pressure on ${gameCode}`);
        return false;
      }
      const game = await getClassroomGame(gameCode);
      if (!game) {
        logger.warn('CLASSROOM_GAME', `Cannot set pressure: game ${gameCode} not found`);
        return false;
      }

      type SettingsWithPressure = ClassroomGameSettings & { pressure?: ClassroomPressure };
      const settings: SettingsWithPressure = { ...(game.settings ?? {}) };
      settings.pressure = normalizeClassroomPressure(pressure);
      game.settings = settings;

      await redis.setex(
        `classroom_game:${gameCode}`,
        CLASSROOM_GAME_TTL,
        JSON.stringify(game)
      );
      logger.info('CLASSROOM_GAME', `Game ${gameCode} pressure dials updated`);
      return true;
    } catch (error) {
      logger.error('CLASSROOM_GAME', `Failed to set pressure for ${gameCode}: ${error}`);
      return false;
    }
  });
}
