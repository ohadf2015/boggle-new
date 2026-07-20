/**
 * Mascot trigger thresholds — single source of truth for emotional state logic.
 * Game balance decisions live here, not scattered in JSX.
 */

/** Seconds remaining when panic mascot appears during gameplay */
export const PANIC_TIMER_THRESHOLD = 30;

/** Combo level at which onfire mascot appears during gameplay */
export const ONFIRE_COMBO_THRESHOLD = 3;

/**
 * Score ratio (0–1) above which the flexing mascot appears (player doing well).
 */
export const FLEXING_SCORE_THRESHOLD = 0.7;

/**
 * Score ratio (0–1) below which the encouraging mascot appears (player struggling).
 */
export const ENCOURAGING_SCORE_THRESHOLD = 0.3;

/**
 * Achievement progress percentage (0–100) above which mindblown mascot shows
 * in the AchievementProgressTracker.
 */
export const MINDBLOWN_PROGRESS_THRESHOLD = 80;
