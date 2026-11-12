import { collectFriendPresence, type PresenceGame } from '@/backend/modules/friendPresence';
import type { FriendPresence } from '@/shared/types/friends';

type SharedScope = typeof globalThis & {
  __lcAuthUserConnections?: Map<string, { gameCode: string; username: string }>;
  __lcGameLookup?: (code: string) => unknown;
};

/** Friends' room presence from the socket process's in-memory state (same Node process, one replica). */
export function readServerPresence(ids: readonly string[]): FriendPresence[] {
  const scope = globalThis as SharedScope;
  const conns = scope.__lcAuthUserConnections;
  const lookup = scope.__lcGameLookup;
  if (!conns || !lookup) return ids.map((userId) => ({ userId, status: null }));
  return collectFriendPresence(ids, {
    connection: (id) => conns.get(id) ?? null,
    game: (code) => (lookup(code) as PresenceGame | null) ?? null,
  });
}
