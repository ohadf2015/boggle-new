import { getCacheClient } from '@/backend/cache/redisCache';
import { classroomGameKey } from '@/lib/education/classroomGameLookup';
import logger from '@/utils/logger';

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

export { recordEndedCodeTry, countEndedCodeTries, clearEndedCodeTries } from '@/lib/education/endedCodeTries';
