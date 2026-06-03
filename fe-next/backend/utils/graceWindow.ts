/**
 * Post-game word-submit grace window
 *
 * When the server timer hits 0 the round transitions to 'finished' and the
 * authoritative game state stops accepting words. But a player's last-second
 * word is often already in flight — and on mobile / backgrounded tabs / laggy
 * links the client can take well over a second to even receive the `endGame`
 * and `timeUpdate(0)` events that tell it to stop. Without a forgiving cushion
 * those in-flight words bounce back as GAME_NOT_IN_PROGRESS, which players
 * experience as "it says game not in progress a lot".
 *
 * This is the single source of truth for that cushion so the word handler and
 * the distributed grace-period lock can never drift apart.
 */

/**
 * How long after a round finishes the server still accepts a word submission.
 * Env-overridable so we can tune per-environment without a redeploy.
 * Default widened from the original 1.5s to 3s after field reports of frequent
 * end-of-round rejections on mobile.
 */
export const WORD_SUBMIT_GRACE_PERIOD_MS = parseInt(
  process.env.WORD_SUBMIT_GRACE_PERIOD_MS || '3000',
  10,
);

/**
 * TTL for the per-player distributed lock that de-dupes grace-window
 * submissions across instances. Must always outlive the grace window itself,
 * otherwise the lock could expire mid-window and let a late word be processed
 * twice.
 */
export const GRACE_PERIOD_LOCK_TTL_MS = WORD_SUBMIT_GRACE_PERIOD_MS + 1000;
