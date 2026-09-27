/**
 * Mascot trigger thresholds — single source of truth for emotional state logic.
 * Game balance decisions live here, not scattered in JSX.
 */

/** Seconds remaining when panic mascot appears during gameplay */
export const PANIC_TIMER_THRESHOLD = 30;

/** Combo level at which onfire mascot appears during gameplay */
export const ONFIRE_COMBO_THRESHOLD = 3;

/**
 * Achievement progress percentage (0–100) above which mindblown mascot shows
 * in the AchievementProgressTracker.
 */
export const MINDBLOWN_PROGRESS_THRESHOLD = 80;
