/**
 * Wheel Rush Multiplayer Constants
 * Shared tuning knobs for wheel-rush MP mode.
 */

/** Default round duration in seconds. 60s = fast 1-minute rounds (design intent). Host can still override via timerSeconds. */
export const WHEEL_RUSH_DURATION_SEC = 60;

/** Steal-lock window: ms that first finder's word stays stealable before closing */
export const WHEEL_RUSH_LOCK_MS = 3_000;

/** Consolation score for a successful steal (claimant loses nothing — steal rewards speed) */
export const WHEEL_RUSH_STEAL_BONUS = 8;

/** First-finder multiplier applied on top of base word score */
export const WHEEL_RUSH_FIRST_FINDER_MULT = 1.2;

/** Fog-of-war: opponent words shown as count-only for this many ms after round start */
export const WHEEL_RUSH_FOG_MS = 10_000;

/** Min word length accepted (matches daily wheel) */
export const WHEEL_RUSH_MIN_WORD_LEN = 3;

/** Pangram bonus — uses all 7 letters */
export const WHEEL_RUSH_PANGRAM_BONUS = 50;
