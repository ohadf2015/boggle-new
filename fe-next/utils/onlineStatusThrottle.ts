/**
 * Throttle for profiles.last_seen_at "online status" writes.
 *
 * `useFriends` is mounted by several always-present components (GlobalBottomNav,
 * HeaderMobileMenu, FriendsActivityFeed, ...). Each instance runs its OWN
 * setInterval calling updateOnlineStatus(), so a single authed user emits N
 * concurrent profiles UPDATEs every cycle (write amplification). Those writes
 * also feed the Supabase Realtime WAL decoder. A module-level (shared) throttle
 * collapses all concurrent callers to at most one write per window.
 *
 * The window MUST stay below the 5-minute "is online" threshold in
 * backend/utils/socialHelpers.ts, or an active user could appear offline. 90s
 * gives a comfortable margin while cutting writes ~N×.
 */
export const ONLINE_STATUS_MIN_WRITE_INTERVAL_MS = 90 * 1000;

/**
 * Pure predicate: should an online-status write proceed given the current time
 * and the timestamp of the last committed write? Extracted for deterministic
 * testing; the caller owns the `lastWrite` state.
 */
export function shouldWriteOnlineStatus(
  now: number,
  lastWrite: number,
  minIntervalMs: number = ONLINE_STATUS_MIN_WRITE_INTERVAL_MS,
): boolean {
  // lastWrite <= 0 is the "never written this session" sentinel — always allow,
  // regardless of the absolute clock value.
  if (lastWrite <= 0) return true;
  return now - lastWrite >= minIntervalMs;
}
