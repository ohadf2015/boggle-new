/**
 * Students who tried to join a classroom game after the teacher ended it.
 *
 * One Redis set per class, members are student keys (auth id, or a per-game
 * guest key), so the teacher's dashboard can say "N students tried to join
 * after your game ended". Written from both doors that refuse an ended game:
 * the REST join (`/api/education/classroom/join`) and the socket refusals
 * (`captureJoinRefusal`, SESSION_ENDED). Cleared when the class has a live game
 * again. Never throws: this is a courtesy count, not a gate.
 */
import { getCacheClient } from '@/backend/cache/redisCache';
import logger from '@/utils/logger';

/** Long enough that a teacher who opens HQ the next school day still sees it. */
export const ENDED_CODE_TRIES_TTL_SECONDS = 48 * 60 * 60;

export function endedCodeTriesKey(classroomId: string): string {
  return `classroom_ended_code_tries:${classroomId}`;
}

/**
 * Stable-ish identity for one late student: their auth id, else the name they
 * typed for this game, else the socket. Guests retrying under the same name
 * count once.
 */
export function lateJoinStudentKey(args: {
  actorId?: string | null;
  gameCode: string;
  username?: string | null;
  socketId?: string | null;
}): string {
  if (args.actorId) return args.actorId;
  const name = typeof args.username === 'string' ? args.username.trim().toLowerCase().slice(0, 40) : '';
  if (name) return `guest:${args.gameCode}:${name}`;
  return `socket:${args.socketId || 'unknown'}`;
}

export async function recordEndedCodeTry(classroomId: string, studentId: string): Promise<void> {
  try {
    const redis = getCacheClient();
    await redis.sadd(endedCodeTriesKey(classroomId), studentId);
    await redis.expire(endedCodeTriesKey(classroomId), ENDED_CODE_TRIES_TTL_SECONDS);
  } catch (err) {
    logger.warn('ended code try not recorded:', err);
  }
}

export async function countEndedCodeTries(classroomId: string): Promise<number> {
  try {
    return await getCacheClient().scard(endedCodeTriesKey(classroomId));
  } catch (err) {
    logger.warn('ended code tries unreadable:', err);
    return 0;
  }
}

export async function clearEndedCodeTries(classroomId: string): Promise<void> {
  try {
    await getCacheClient().del(endedCodeTriesKey(classroomId));
  } catch (err) {
    logger.warn('ended code tries not cleared:', err);
  }
}
