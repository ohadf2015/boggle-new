import { getCacheClient } from '@/backend/cache/redisCache';
import logger from '@/utils/logger';

/**
 * Read a live classroom game by its code, from a Next route.
 *
 * Why this exists rather than importing `backend/modules/classroomGameManager`: that module
 * imports its dependencies with Node-ESM `.js` specifiers (`'../utils/logger.js'`), which the
 * `tsx` server resolves and webpack does not — importing it from an API route fails the
 * production build with "Module not found: Can't resolve '../utils/logger.js'".
 *
 * And why `getCacheClient` rather than `getRedisClient`: `getRedisClient()` returns the
 * client that `initRedis()` assigned, and `initRedis()` runs in the Socket.IO server's
 * bootstrap. A Next route lives in a different module registry, so that client is always
 * null there and every lookup answered "no live game" — verified against a running server,
 * where the mocked unit tests happily passed. `getCacheClient()` connects on first use,
 * which is why the other Redis-backed API routes already use it.
 *
 * The key is duplicated as a consequence, so it is pinned by
 * `__tests__/classroomGameLookup.test.ts`, which fails if the two definitions drift.
 */
export const CLASSROOM_GAME_KEY_PREFIX = 'classroom_game:';

export function classroomGameKey(gameCode: string): string {
  return `${CLASSROOM_GAME_KEY_PREFIX}${gameCode}`;
}

export interface LiveClassroomGame {
  classroomId: string;
  lessonIds: string[];
  teacherName: string;
}

/**
 * Returns null for "no such live game" AND for any failure (Redis down, malformed JSON).
 * Callers treat both the same way: fall through to the next interpretation of the code.
 * Never throws — a classroom code that resolves fine must not be blocked by this lookup.
 */
export async function lookupLiveClassroomGame(
  gameCode: string
): Promise<LiveClassroomGame | null> {
  try {
    const redis = getCacheClient();
    if (!redis) return null;

    const raw = await redis.get(classroomGameKey(gameCode));
    if (!raw) return null;

    const game = JSON.parse(raw) as Partial<LiveClassroomGame>;
    if (!game?.classroomId) return null;

    return {
      classroomId: game.classroomId,
      lessonIds: game.lessonIds ?? [],
      teacherName: game.teacherName ?? '',
    };
  } catch (err) {
    logger.error('lookupLiveClassroomGame failed:', err);
    return null;
  }
}
