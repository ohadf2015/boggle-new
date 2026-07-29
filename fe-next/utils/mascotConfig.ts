/**
 * Mascot trigger thresholds — single source of truth for emotional state logic.
 * Game balance decisions live here, not scattered in JSX.
 */

/** Seconds remaining when panic mascot appears during gameplay */
export const PANIC_TIMER_THRESHOLD = 30;

/** Combo level at which onfire mascot appears during gameplay */
export const ONFIRE_COMBO_THRESHOLD = 3;

/**
 * Word hunt efficiency score (0–1) above which flexing mascot shows on results.
 * efficiencyScore = wordsFound / totalPossibleWords (backend-computed).
 */
export const FLEXING_SCORE_THRESHOLD = 0.6;

/**
 * Word hunt efficiency score (0–1) below which encouraging mascot shows on results.
 * Players below this threshold get a supportive Lexi, not a celebrating one.
 */
export const ENCOURAGING_SCORE_THRESHOLD = 0.4;

/**
 * Achievement progress percentage (0–100) above which mindblown mascot shows
 * in the AchievementProgressTracker.
 */
export const MINDBLOWN_PROGRESS_THRESHOLD = 80;
