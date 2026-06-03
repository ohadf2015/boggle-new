/**
 * Word Tower — Sabotage tokens (pure).
 *
 * A multiplayer interference mechanic for the async versus mode: a clean run
 * of perfect crane drops earns a "Wrecking Ball" token; spending one knocks
 * a single floor off a rival's async tower. The receiver sees an incoming-
 * sabotage warning, takes the hit, and gets a cosy recovery beat.
 *
 * Design discipline:
 * - Earned by SKILL (perfect streak), not grind — avoids pay-to-grief
 * - One floor per hit — matches the wobble-hazard ceiling; never run-ending
 * - Token cap (3) — no stockpiling; spend or lose to a future cap raise
 *
 * Pure / renderer-agnostic so the same logic powers the HUD counter, the
 * targeting button, and the server-side authoritative earn check.
 */

/** Perfect drops needed to earn one sabotage token. */
export const SABOTAGE_PERFECT_THRESHOLD = 3;
/** Inventory cap — beyond this, additional earns are dropped. */
export const SABOTAGE_TOKEN_CAP = 3;
/** Floors removed per sabotage hit. Matches the wobble hazard for fairness. */
export const SABOTAGE_FLOORS_PER_HIT = 1;

/**
 * Award one token if the player's perfect-streak just crossed a multiple of
 * the threshold (and we're not already at cap). Idempotent on the same
 * streak number — the caller passes the streak length, not a delta, so
 * holding at the threshold doesn't keep granting.
 */
export function awardSabotageToken(currentTokens: number, perfectStreak: number): number {
  if (currentTokens >= SABOTAGE_TOKEN_CAP) return SABOTAGE_TOKEN_CAP;
  // Streak length determines TOTAL tokens deserved across the run; subtract
  // already-held to compute the delta. Capped at cap.
  const earned = Math.floor(perfectStreak / SABOTAGE_PERFECT_THRESHOLD);
  return Math.min(SABOTAGE_TOKEN_CAP, Math.max(currentTokens, earned));
}

/** Decrement token count by 1, floored at 0. */
export function spendSabotageToken(currentTokens: number): number {
  return Math.max(0, currentTokens - 1);
}

/** Targeting eligibility — needs a token AND at least one rival on the rail. */
export function canSabotage(tokens: number, rivalCount: number): boolean {
  return tokens > 0 && rivalCount > 0;
}

/** Constant per-hit floor count (capped). Function shape leaves room for a
 *  future "double damage during event" multiplier without changing callers. */
export function sabotageFloorsFor(): number {
  return SABOTAGE_FLOORS_PER_HIT;
}

/** True when watching a reward ad would result in a new token (i.e. under cap). */
export function canEarnViaAd(currentTokens: number): boolean {
  return currentTokens < SABOTAGE_TOKEN_CAP;
}

/** Grant one token earned via a reward-ad watch. Same cap ceiling as streak earn. */
export function awardSabotageTokenViaAd(currentTokens: number): number {
  return Math.min(SABOTAGE_TOKEN_CAP, currentTokens + 1);
}
