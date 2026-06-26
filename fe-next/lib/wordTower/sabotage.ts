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

/** Max floors a single ASYNC wrecking-ball attack can remove from a rival's
 *  restored tower. Higher than the live per-hit floor (it's a one-shot raid that
 *  has to feel weighty), but capped so it never gut-punches a defender — and it
 *  only ever touches SESSION state, never the protected personal-best. */
export const WRECK_MAX_FLOORS_PER_ATTACK = 4;
/** Meters of attacker lead that buys one extra floor of async wreck damage. */
export const WRECK_LEAD_PER_FLOOR_M = 80;
/** Scrambles handed to a defender when they absorb async wrecks at session
 *  start — turns "I got hit" into "I got paid + I'll retaliate", per the
 *  research on keeping async PvP feeling fair to BOTH sides. */
export const WRECK_COMPENSATION_SCRAMBLES = 1;
/** Metres lost per sabotaged floor on the rival rail (used for display and damage calc). */
export const SABOTAGE_M_PER_FLOOR = 8;

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

/**
 * Earn wrecking-ball charges from PROGRESSION events — reaching a new height
 * zone or unlocking an achievement (the founder's brief: "earned on a new place
 * or an achievement"). The caller passes the cumulative count of earn-events
 * seen this run plus how many it has already credited; we grant only the new
 * delta and return the updated credited count to persist.
 *
 * Uses a credited-count (not a cumulative max) so SPEND-then-EARN is correct: a
 * charge spent on a wreck doesn't get phantom-re-granted the next time the same
 * totals are re-evaluated.
 */
export function wreckingBallEarn(
  currentCharges: number,
  opts: { totalEarnEvents: number; credited: number },
): { charges: number; credited: number } {
  const newlyEarned = Math.max(0, opts.totalEarnEvents - opts.credited);
  return {
    charges: Math.min(SABOTAGE_TOKEN_CAP, currentCharges + newlyEarned),
    credited: opts.totalEarnEvents,
  };
}

/**
 * Floors a single async wrecking-ball attack removes from the target's restored
 * tower, scaled by the attacker's height lead and clamped to
 * {@link WRECK_MAX_FLOORS_PER_ATTACK}. Always at least 1 — an attack the player
 * spent a charge on must visibly land something. Pure so the server can re-clamp
 * the client-claimed damage with the identical formula.
 */
export function asyncWreckDamageFloors(attackerHeightM: number, targetHeightM: number): number {
  const lead = Math.max(0, attackerHeightM - targetHeightM);
  const fromLead = 1 + Math.floor(lead / WRECK_LEAD_PER_FLOOR_M);
  return Math.max(1, Math.min(WRECK_MAX_FLOORS_PER_ATTACK, fromLead));
}

/**
 * Convert a rival's height in metres to a display block count for the smash scene.
 * Returns a clamped value between minBlocks and maxBlocks for visual consistency
 * (we don't want a 1m tower or a 500m tower represented as 1000 blocks).
 * The rendered height is purely visual — damage N is always from sabotageFloorsFor().
 */
export function heightToBlocks(heightM: number, minBlocks = 4, maxBlocks = 10): number {
  const blocksFromHeight = Math.ceil(heightM / SABOTAGE_M_PER_FLOOR);
  return Math.max(minBlocks, Math.min(maxBlocks, blocksFromHeight));
}
