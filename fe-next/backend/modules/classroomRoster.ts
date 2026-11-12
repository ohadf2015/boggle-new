/**
 * Every real student who sat in a classroom room, however they came in.
 *
 * `players` only holds students who joined from the class page; the join link,
 * QR and typed room code reach the room through the ordinary `join` socket and
 * never touched it, so a full room reported a roster of zero. The `join` handler
 * calls this for every account seat, which covers both doors. A guest seat with
 * no account (and a spectator over the seat cap) is not recorded or counted: its
 * only identity is a token hash the client sends, which it can mint freely.
 */
import { getRedisClient } from '../redisClient';
import logger from '../utils/logger';
import { CLASSROOM_GAME_TTL, getClassroomGame, withClassroomGameLock } from './classroomGameManager';
import type { ClassroomGame } from './classroomGameTypes';
import { MAX_PLAYERS_PER_ROOM } from '@/shared/constants/gameConstants';

export { classroomRosterCount } from './classroomRosterCount';

/** Students rotating through one session; past this a growing roster is abuse, not a class. */
export const CLASSROOM_ROSTER_CAP = MAX_PLAYERS_PER_ROOM * 3;

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
      if ((game.rosterUserIds?.length ?? 0) >= CLASSROOM_ROSTER_CAP) {
        logger.warn('CLASSROOM_GAME', `Roster for ${gameCode} hit its cap of ${CLASSROOM_ROSTER_CAP}; ${userId} not recorded`);
        return;
      }
      game.rosterUserIds = [...(game.rosterUserIds ?? []), userId];
      await redis.setex(`classroom_game:${gameCode}`, CLASSROOM_GAME_TTL, JSON.stringify(game));
    });
  } catch (error) {
    logger.error('CLASSROOM_GAME', `Failed to record roster entry for ${gameCode}: ${(error as Error).message}`);
  }
}
