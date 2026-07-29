/**
 * Per-level STRIKE budget — the Blast v2 lose condition.
 *
 * A "strike" is a CONFIRMED wrong guess (a structurally-valid path whose letters
 * are neither a theme word nor a real dictionary word). Run out of strikes with
 * theme words still remaining → the level is failed and must be retried; campaign
 * progress is preserved (the win-only `clear-level` RPC is never called on a loss).
 *
 * Why this is provably fair for ANY budget ≥ 1, with no solver dependency:
 * every shipped level is masterable via a theme-only submission sequence of
 * length `words.length` (CI-guaranteed by all-levels-solvable). A theme-only
 * player makes ZERO strikes, so a loss is unreachable by correct play — only
 * deliberate wrong guessing costs. Thinking time and bonus-word finding are
 * never punished.
 */

/** Below this level there is no budget (null = unlimited) — chill onboarding. */
export const STRIKE_UNLOCK_LEVEL = 6;

/** Most generous budget, granted at the unlock level. */
const MAX_STRIKES = 6;
/** Floor so deep levels stay tense but never cruel. */
const MIN_STRIKES = 3;
/** Tighten by one strike per this many levels past the unlock. */
const TIGHTEN_EVERY = 20;

/**
 * @returns the strike budget for a level, or `null` for "unlimited" (no loss
 * possible). Pure — safe to unit-test and to call from the reducer.
 */
export function computeStrikeBudget(levelNumber: number): number | null {
  if (levelNumber < STRIKE_UNLOCK_LEVEL) return null;
  const steps = Math.floor((levelNumber - STRIKE_UNLOCK_LEVEL) / TIGHTEN_EVERY);
  return Math.max(MIN_STRIKES, MAX_STRIKES - steps);
}
