import { getCacheClient } from '@/backend/cache/redisCache';
import { classroomGameKey } from '@/lib/education/classroomGameLookup';
import logger from '@/utils/logger';

const TRIES_TTL_SECONDS = 12 * 60 * 60;

function triesKey(classroomId: string): string {
  return `classroom_ended_code_tries:${classroomId}`;
}

/** The class an ended session code belonged to, while its record still lives (4h TTL). */
export async function lookupEndedClassroomSession(gameCode: string): Promise<{ classroomId: string } | null> {
  try {
    const raw = await getCacheClient().get(classroomGameKey(gameCode));
    if (!raw) return null;
    const game = JSON.parse(raw) as { classroomId?: string; status?: string; endedAt?: string };
    if (!game?.classroomId) return null;
    if (game.status !== 'ended' && !game.endedAt) return null;
    return { classroomId: game.classroomId };
  } catch (err) {
    logger.warn('ended session lookup failed:', err);
    return null;
  }
}

export async function recordEndedCodeTry(classroomId: string, studentId: string): Promise<void> {
  try {
    const redis = getCacheClient();
    await redis.sadd(triesKey(classroomId), studentId);
    await redis.expire(triesKey(classroomId), TRIES_TTL_SECONDS);
  } catch (err) {
    logger.warn('ended code try not recorded:', err);
  }
}

export async function countEndedCodeTries(classroomId: string): Promise<number> {
  try {
    return await getCacheClient().scard(triesKey(classroomId));
  } catch (err) {
    logger.warn('ended code tries unreadable:', err);
    return 0;
  }
}

export async function clearEndedCodeTries(classroomId: string): Promise<void> {
  try {
    await getCacheClient().del(triesKey(classroomId));
  } catch (err) {
    logger.warn('ended code tries not cleared:', err);
  }
}
