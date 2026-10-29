import { createHash } from 'crypto';
import { getRedisClient } from '../redisClient';
import logger from '../utils/logger';
import {
  CLASSROOM_GAME_TTL,
  getClassroomGame,
  withClassroomGameLock,
  type ClassroomGame,
} from './classroomGameManager';

export { LOBBY_LOCK_EVENTS, ROOM_LOCKED } from '@/shared/types/classroomLobbyLock';

interface JoinIdentity {
  users: Record<string, unknown>;
  username: string;
  authUserId: string | undefined;
  guestTokenHash?: string;
  hasSocket: boolean;
  /** The padlock lives on the lobby; a running round answers to the late-join switch instead. */
  inRound?: boolean;
}

type LockRecord = Pick<ClassroomGame, 'teacherId' | 'settings'>;

// Settings reach students (activeClassroomGames, classroomGameStarted); the guest hash is a seat credential, so store a digest of it.
const guestSeat = (tokenHash: string) => `g:${createHash('sha256').update(tokenHash).digest('hex').slice(0, 24)}`;

/** Durable identities, because a phone asleep past the disconnect grace is dropped from the live roster. */
export function lockSeatsOf(users: Array<{ authUserId?: string | null; guestTokenHash?: string | null }>): string[] {
  return users.flatMap((u) => (u.authUserId ? [`a:${u.authUserId}`] : u.guestTokenHash ? [guestSeat(u.guestTokenHash)] : []));
}

/** Only a brand-new seat is refused; the teacher and anyone seated before the lock always get back in. */
export function isLockedOut(record: LockRecord | null, who: JoinIdentity): boolean {
  if (!record?.settings?.lobbyLocked || who.inRound) return false;
  if (who.authUserId && who.authUserId === record.teacherId) return false;
  const seats = record.settings.lobbyLockedSeats ?? [];
  if (who.authUserId && seats.includes(`a:${who.authUserId}`)) return false;
  if (who.guestTokenHash && seats.includes(guestSeat(who.guestTokenHash))) return false;
  return !who.users[who.username] && !who.hasSocket;
}

export function isRecordJoinLockedOut(
  record: LockRecord & Pick<ClassroomGame, 'players' | 'status'>,
  userId: string,
  liveUsers: Array<{ authUserId?: string | null }>
): boolean {
  if (liveUsers.some((u) => u.authUserId === userId)) return false;
  const onRecord = (record.players ?? []).some((p) => p.userId === userId);
  return isLockedOut(record, { users: {}, username: '', authUserId: userId, hasSocket: onRecord, inRound: record.status === 'playing' });
}

export function setClassroomLobbyLocked(gameCode: string, locked: boolean, seats: string[] = []): Promise<boolean> {
  return withClassroomGameLock(gameCode, async () => {
    try {
      const redis = getRedisClient();
      if (!redis) {
        logger.error('CLASSROOM_GAME', `No Redis client; cannot set lobby lock on ${gameCode}`);
        return false;
      }
      const game = await getClassroomGame(gameCode);
      if (!game) {
        logger.warn('CLASSROOM_GAME', `Cannot set lobby lock: game ${gameCode} not found`);
        return false;
      }
      const { lobbyLockedSeats: _old, ...rest } = game.settings ?? {};
      game.settings = locked ? { ...rest, lobbyLocked: true, lobbyLockedSeats: seats } : { ...rest, lobbyLocked: false };
      await redis.setex(`classroom_game:${gameCode}`, CLASSROOM_GAME_TTL, JSON.stringify(game));
      logger.info('CLASSROOM_GAME', `Game ${gameCode} lobby ${locked ? 'locked' : 'unlocked'}`);
      return true;
    } catch (error) {
      logger.error('CLASSROOM_GAME', `Failed to set lobby lock for ${gameCode}: ${error}`);
      return false;
    }
  });
}
