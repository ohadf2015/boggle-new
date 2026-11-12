/**
 * Every real student who sat in a classroom room, however they came in.
 *
 * `players` only holds students who joined from the class page; the join link,
 * QR and typed room code reach the room through the ordinary `join` socket and
 * never touched it, so a full room reported a roster of zero. The `join` handler
 * calls this for every seat, which covers both doors. A guest with no account is
 * recorded as `guest:<guest token hash>` (stable per browser); a guest with no token,
 * the teacher's practice seat and a spectator over the seat cap are not recorded.
 */
import { getRedisClient } from '../redisClient';
import logger from '../utils/logger';
import { CLASSROOM_GAME_TTL, getClassroomGame, withClassroomGameLock } from './classroomGameManager';
import type { ClassroomGame } from './classroomGameTypes';

export { classroomRosterCount } from './classroomRosterCount';

type InHand = Pick<ClassroomGame, 'teacherId'> & Partial<Pick<ClassroomGame, 'rosterUserIds'>>;

export async function recordClassroomRosterEntry(
  gameCode: string,
  inHand: InHand | null | undefined,
  userId: string | null | undefined,
): Promise<void> {
  if (!inHand || !userId || userId === inHand.teacherId) return;
  if (inHand.rosterUserIds?.includes(userId)) return;
  try {
    await withClassroomGameLock(gameCode, async () => {
      const redis = getRedisClient();
      if (!redis) {
        logger.error('CLASSROOM_GAME', `No Redis client; roster entry for ${gameCode} not recorded`);
        return;
      }
      const game = await getClassroomGame(gameCode);
      if (!game || game.rosterUserIds?.includes(userId)) return;
      game.rosterUserIds = [...(game.rosterUserIds ?? []), userId];
      await redis.setex(`classroom_game:${gameCode}`, CLASSROOM_GAME_TTL, JSON.stringify(game));
    });
  } catch (error) {
    logger.error('CLASSROOM_GAME', `Failed to record roster entry for ${gameCode}: ${(error as Error).message}`);
  }
}
