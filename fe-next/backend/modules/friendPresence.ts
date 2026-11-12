import type { FriendPresence, FriendPresenceStatus } from '@/shared/types/friends';

export interface PresenceGame {
  gameState: string;
  isPrivate?: boolean;
  isClassroom?: boolean;
  isRanked?: boolean;
  tournamentId?: string | null;
  allowLateJoin?: boolean;
  users: Record<string, unknown>;
}

export interface PresenceDeps {
  connection: (authUserId: string) => { gameCode: string; username: string } | null;
  game: (gameCode: string) => PresenceGame | null;
}

/** What a friend may see about the room this player sits in. */
export function presenceForGame(
  game: PresenceGame | null,
  username: string,
  gameCode: string,
): { status: FriendPresenceStatus; gameCode?: string } {
  if (!game || !Object.prototype.hasOwnProperty.call(game.users ?? {}, username)) return { status: null };
  if (game.isClassroom) return { status: null };
  if (game.isPrivate) return { status: 'private' };
  const restricted = !!game.isRanked || !!game.tournamentId;
  if (game.gameState === 'waiting') return restricted ? { status: 'in_lobby' } : { status: 'in_lobby', gameCode };
  if (game.gameState === 'in-progress' && !restricted && game.allowLateJoin !== false) {
    return { status: 'playing', gameCode };
  }
  return { status: 'playing' };
}

export function collectFriendPresence(friendIds: readonly string[], deps: PresenceDeps): FriendPresence[] {
  return friendIds.map((userId) => {
    const conn = deps.connection(userId);
    if (!conn) return { userId, status: null };
    return { userId, ...presenceForGame(deps.game(conn.gameCode), conn.username, conn.gameCode) };
  });
}
