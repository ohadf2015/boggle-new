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
import { matchKey } from './classroomSummary';

/** The applied words in the record's own spelling, or null when nothing was written. */
export function setClassroomReteachWords(gameCode: string, words: string[]): Promise<string[] | null> {
  return withClassroomGameLock(gameCode, async () => {
    try {
      const redis = getRedisClient();
      if (!redis) {
        logger.error('CLASSROOM_GAME', `No Redis client; cannot reteach ${gameCode}`);
        return null;
      }
      const game = await getClassroomGame(gameCode);
      if (!game) {
        logger.warn('CLASSROOM_GAME', `Cannot reteach: game ${gameCode} not found`);
        return null;
      }

      const language = game.language ?? 'en';
      const wanted = new Set(words.map((w) => matchKey(w, language)));
      const seen = new Set<string>();
      const applied = (game.vocabularyWords ?? []).filter((word) => {
        const key = matchKey(word, language);
        if (!wanted.has(key) || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      if (applied.length === 0) {
        logger.warn('CLASSROOM_GAME', `Reteach for ${gameCode} matched no lesson word`);
        return null;
      }

      const { targetWord, ...settings } = game.settings ?? {};
      const keepTarget = targetWord && seen.has(matchKey(targetWord, language));
      const next = {
        ...game,
        vocabularyWords: applied,
        settings: keepTarget ? { ...settings, targetWord } : settings,
      };
      await redis.setex(`classroom_game:${gameCode}`, CLASSROOM_GAME_TTL, JSON.stringify(next));
      logger.info('CLASSROOM_GAME', `Game ${gameCode} narrowed to ${applied.length} reteach words`);
      return applied;
    } catch (error) {
      logger.error('CLASSROOM_GAME', `Failed to reteach ${gameCode}: ${error}`);
      return null;
    }
  });
}

export default setClassroomReteachWords;
