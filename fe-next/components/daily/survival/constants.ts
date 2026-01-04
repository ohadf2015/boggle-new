/**
 * Daily Word Hunt Survival Mode Constants
 */

/**
 * Maximum number of attempts to guess the target word
 */
export const MAX_ATTEMPTS = 10;

/**
 * Initial life points at game start
 */
export const INITIAL_LIFE = 100;

/**
 * Life drain rate in points per second
 * At 1.2 points/sec, gives approximately 83 seconds total survival time
 */
export const LIFE_DRAIN_RATE = 1.2;

/**
 * Life points lost for submitting a word not on the board
 */
export const INVALID_WORD_PENALTY = 5;

/**
 * Life points lost for submitting a word not in the dictionary
 */
export const NOT_IN_DICTIONARY_PENALTY = 4;

/**
 * Threshold for showing shop hint (half of initial life)
 */
export const HALF_LIFE_THRESHOLD = 50;

/**
 * Minimum tokens required to show shop hint
 */
export const MIN_TOKENS_FOR_HINT = 60;

/**
 * Duration to show feedback overlay in milliseconds
 */
export const FEEDBACK_OVERLAY_DURATION = 3000;

/**
 * Duration to auto-dismiss shop hint in milliseconds
 */
export const SHOP_HINT_DISMISS_DELAY = 5000;
