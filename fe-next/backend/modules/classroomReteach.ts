/**
 * Narrow a live room to the words the class missed, keeping its code.
 *
 * The board is dealt and graded from this record's `vocabularyWords`
 * (`gameStartHandler` + `buildClassroomSummary`), never from the teacher's
 * sessionStorage, so a reteach written only on the client replays the full lesson.
 */

import { getRedisClient } from '../redisClient';
import logger from '../utils/logger';
import { CLASSROOM_GAME_TTL, getClassroomGame, withClassroomGameLock } from './classroomGameManager';
import type { ClassroomGame } from './classroomGameTypes';
import { narrowForReteach, restoreFullLesson } from './classroomReteachRound';

type Change = (game: ClassroomGame) => { words: string[] | null; write: boolean };

function updateRoom(gameCode: string, label: string, change: Change): Promise<string[] | null> {
  return withClassroomGameLock(gameCode, async () => {
    try {
      const redis = getRedisClient();
      if (!redis) {
        logger.error('CLASSROOM_GAME', `No Redis client; cannot ${label} ${gameCode}`);
        return null;
      }
      const game = await getClassroomGame(gameCode);
      if (!game) {
        logger.warn('CLASSROOM_GAME', `Cannot ${label}: game ${gameCode} not found`);
        return null;
      }
      const { words, write } = change(game);
      if (!words) {
        logger.warn('CLASSROOM_GAME', `${label} for ${gameCode} matched no lesson word`);
        return null;
      }
      if (write) await redis.setex(`classroom_game:${gameCode}`, CLASSROOM_GAME_TTL, JSON.stringify(game));
      logger.info('CLASSROOM_GAME', `Game ${gameCode} ${label}: ${words.length} words`);
      return words;
    } catch (error) {
      logger.error('CLASSROOM_GAME', `Failed to ${label} ${gameCode}: ${error}`);
      return null;
    }
  });
}

/** The applied words in the record's own spelling, or null when nothing was written. */
export function setClassroomReteachWords(gameCode: string, words: string[]): Promise<string[] | null> {
  return updateRoom(gameCode, 'reteach', (game) => {
    const applied = narrowForReteach(game, words);
    return { words: applied, write: !!applied };
  });
}

export function restoreClassroomFullLesson(gameCode: string): Promise<string[] | null> {
  return updateRoom(gameCode, 'restore full lesson', (game) => {
    const write = restoreFullLesson(game);
    return { words: game.vocabularyWords ?? [], write };
  });
}

export default setClassroomReteachWords;
