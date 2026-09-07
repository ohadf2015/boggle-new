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

/**
 * The teacher-chosen settings, as `backend/modules/classroomGameManager.ts`
 * writes them. Kept structurally identical rather than imported: that module
 * uses Node-ESM `.js` specifiers webpack cannot resolve (see above).
 */
export interface LiveClassroomGameSettings {
  timerMinutes?: number;
  boardSize?: 'small' | 'medium' | 'large';
  allowLateJoin?: boolean;
  gameMode?: 'classic' | 'blast' | 'word-hunt' | 'wheel-rush' | 'vocab-quiz';
  vocabQuizQuestionCount?: number;
  vocabQuizSeconds?: number;
}

export interface LiveClassroomGame {
  classroomId: string;
  lessonIds: string[];
  teacherName: string;
  /** Lesson titles, for the student-facing "what are we playing" summary. */
  lessonNames: string[];
  /**
   * What the teacher actually picked. The student's own client has no copy of
   * this — `lessonGameData` is written to the TEACHER's sessionStorage — so
   * without it a student's lobby renders classic defaults over a Vocab Quiz.
   */
  settings: LiveClassroomGameSettings;
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
      lessonNames: game.lessonNames ?? [],
      settings: game.settings ?? {},
    };
  } catch (err) {
    logger.error('lookupLiveClassroomGame failed:', err);
    return null;
  }
}
