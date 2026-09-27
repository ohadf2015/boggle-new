/**
 * Reorder landing cards for a brand-new player so the modes they actually
 * FINISH come first.
 *
 * A newcomer judges the whole game by their first mode. Completion rate for
 * players in their first 24 hours (PostHog, 30d to 2026-08-07,
 * `game_started` -> `game_completed`):
 *
 *   word-wheel  56.1%  (n=66)    <- daily quest
 *   survival    52.8%  (n=53)    <- daily quest
 *   classic     45.1%  (n=656)   <- practice / arena
 *   word-hunt   33.4%  (n=290)   <- daily quest
 *   blast       31.0%  (n=200)
 *   wheel-rush  30.0%  (n=140)
 *
 * `blast` is force-promoted to sit directly after `arena` by
 * `placeBlastAfterArena`, which is right for players who already know the game
 * but hands a newcomer the mode most of them bounce off as an early impression.
 * This demotes it below the higher-completing cards for newcomers only.
 *
 * `connections` measured worst (11.1%) but on only n=9 starts — too little to
 * act on, so it is deliberately left where it is.
 *
 * See docs/onboarding/2026-08-07-onboarding-friction-audit.md.
 */

/** Cards a newcomer completes least often, worst last. */
const NEWCOMER_DEMOTED = ['blast'] as const;

export function orderModesForNewcomer<T extends string>(order: readonly T[]): T[] {
  const demoted = order.filter((m) => (NEWCOMER_DEMOTED as readonly string[]).includes(m));
  if (demoted.length === 0) return [...order];
  const kept = order.filter((m) => !(NEWCOMER_DEMOTED as readonly string[]).includes(m));
  return [...kept, ...demoted];
}
