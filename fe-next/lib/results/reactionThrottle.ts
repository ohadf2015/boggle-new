/**
 * Podium emoji-reaction throttle.
 *
 * The old 2000ms window made the button feel broken — a second tap within two
 * seconds silently no-op'd with no haptic or visual. A party game wants players
 * spamming hearts at each other, so the window is snappy and the caller is
 * expected to give feedback (local bubble + haptic) on every allowed send.
 */
export const REACTION_THROTTLE_MS = 700;

/** Pure decision: may a reaction be sent at `now` given the `lastSentAt`? */
export function canSendReaction(
  now: number,
  lastSentAt: number,
  throttleMs: number = REACTION_THROTTLE_MS
): boolean {
  return now - lastSentAt >= throttleMs;
}
