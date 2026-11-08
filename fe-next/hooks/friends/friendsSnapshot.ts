import {
  getFriends,
  getPendingRequests,
  getOutgoingRequests,
  getPendingChallenges,
  updateOnlineStatus,
  type Friend,
  type FriendRequest,
  type FriendChallenge,
} from '@/utils/friends';

/**
 * One friends fetch for the whole page.
 *
 * useFriends is mounted by the bottom tab bar AND the header menu (and the
 * friends page, results, leaderboards). Each instance fetched 4 tables on
 * mount and every 30 s, and pinged online status every 2 min, so a phone sat
 * on any page made 8+ Supabase round trips (16 with CORS preflights, to
 * ap-south-1) every 30 s. Instances now share one snapshot:
 *  - a routine fetch (mount, poll, tab visible) reuses a snapshot younger than
 *    SNAPSHOT_TTL_MS or the one in flight;
 *  - a forced fetch (after a friend action or a realtime event) always fetches,
 *    but instances forced by the same event share one request.
 */
export const SNAPSHOT_TTL_MS = 20_000;
export const FORCED_DEDUPE_MS = 1_000;
export const ONLINE_PING_MIN_GAP_MS = 60_000;

export interface FriendsSnapshot {
  friends: Friend[];
  pendingRequests: FriendRequest[];
  outgoingRequests: FriendRequest[];
  pendingChallenges: FriendChallenge[];
}

let current: { userId: string; startedAt: number; promise: Promise<FriendsSnapshot> } | null = null;
let lastOnlinePing: { userId: string; at: number } | null = null;

export function loadFriendsSnapshot(userId: string, opts: { force?: boolean } = {}): Promise<FriendsSnapshot> {
  const now = Date.now();
  const maxAge = opts.force ? FORCED_DEDUPE_MS : SNAPSHOT_TTL_MS;
  if (current && current.userId === userId && now - current.startedAt < maxAge) return current.promise;

  const promise = Promise.all([
    getFriends(userId),
    getPendingRequests(userId),
    getOutgoingRequests(userId),
    getPendingChallenges(userId),
  ]).then(([friends, pendingRequests, outgoingRequests, pendingChallenges]) => ({
    friends,
    pendingRequests,
    outgoingRequests,
    pendingChallenges,
  }));
  const entry = { userId, startedAt: now, promise };
  current = entry;
  // A failed fetch must not be served from cache to the next caller.
  promise.catch(() => {
    if (current === entry) current = null;
  });
  return promise;
}

/** Online-status heartbeat, at most once per ONLINE_PING_MIN_GAP_MS per user across instances. */
export function pingOnlineStatus(userId: string | undefined): void {
  if (!userId) return;
  const now = Date.now();
  if (lastOnlinePing && lastOnlinePing.userId === userId && now - lastOnlinePing.at < ONLINE_PING_MIN_GAP_MS) return;
  lastOnlinePing = { userId, at: now };
  void Promise.resolve(updateOnlineStatus(userId)).catch(() => {});
}

export function resetFriendsSnapshotForTests(): void {
  current = null;
  lastOnlinePing = null;
}
