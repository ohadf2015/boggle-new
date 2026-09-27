/**
 * Word Hunt guess-efficiency scoring — shared by MP (server) and SP (client) so
 * the "fewer guesses → bigger reward" curve can't drift between the two surfaces.
 *
 * Why this exists: solving the target ends the round, so a player who solves in
 * 1–2 guesses farms fewer board words and was scored BELOW a slow word-farmer.
 * That punishes skill. These helpers reward a fast clean solve instead.
 *
 * Spec: docs/2026-06-27-wordhunt-scoring-ux-spec.md
 */

/**
 * MP additive bonus, indexed by (attempts - 1), clamped to the last entry.
 * Calibrated so a guess-1 solve (140) tops a strong farm run
 * (~12 words × ~5 letters × 2 = ~120 pts), making fast solves genuinely high-score.
 */
export const HUNT_EFFICIENCY_BONUS = [140, 95, 60, 38, 22, 12] as const;

/**
 * SP exploration credit (0..200), indexed by (attempts - 1), clamped to last.
 * Used as a FLOOR — `max(wordPoints, credit)` — so a fast clean solve earns the
 * exploration ceiling without word-farming, but mid/late solvers still need words.
 */
export const HUNT_EXPLORATION_CREDIT = [200, 150, 100, 50, 20, 0] as const;

/** Celebration label keys, index 0 = best (guess 1). */
export const HUNT_SOLVE_TIER_KEYS = [
  'wordHunt.celebrate.tier1', // 1 guess  — Genius
  'wordHunt.celebrate.tier2', // 2        — Magnificent
  'wordHunt.celebrate.tier3', // 3        — Impressive
  'wordHunt.celebrate.tier4', // 4        — Splendid
  'wordHunt.celebrate.tier5', // 5        — Great
  'wordHunt.celebrate.tier6', // 6+       — Phew
] as const;

const LAST = HUNT_EFFICIENCY_BONUS.length - 1;

/** attempts → table index. 0/negative/NaN → best tier; large → floor. */
function tierIndex(attempts: number): number {
  const a = Math.max(1, Math.floor(attempts || 1));
  return Math.min(a - 1, LAST);
}

/** MP: extra points for solving the target in `attempts` same-length guesses. */
export function wordHuntEfficiencyBonus(attempts: number): number {
  return HUNT_EFFICIENCY_BONUS[tierIndex(attempts)];
}

/** SP: exploration-component floor for solving in `attempts` guesses (0..200). */
export function wordHuntExplorationCredit(attempts: number): number {
  return HUNT_EXPLORATION_CREDIT[tierIndex(attempts)];
}

export interface WordHuntSolveTier {
  /** 0 (best, guess 1) .. 5 */
  tier: number;
  labelKey: string;
  /** solved on the very first guess */
  isAce: boolean;
  /** MP efficiency bonus for this tier */
  bonus: number;
}

/** Celebration tier for a solve in `attempts` guesses. */
export function wordHuntSolveTier(attempts: number): WordHuntSolveTier {
  const tier = tierIndex(attempts);
  return {
    tier,
    labelKey: HUNT_SOLVE_TIER_KEYS[tier],
    isAce: tier === 0,
    bonus: HUNT_EFFICIENCY_BONUS[tier],
  };
}
