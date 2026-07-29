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
 * Slower life drain rate for new players (first 3 daily challenges)
 * At 0.8 points/sec, gives approximately 125 seconds total survival time
 */
export const NEW_PLAYER_LIFE_DRAIN_RATE = 0.8;

/**
 * Number of daily challenges before player is no longer considered "new"
 */
export const NEW_PLAYER_THRESHOLD = 3;

/**
 * Minimum life floor for new players (percentage).
 * New players' life will never drain below this value,
 * so first-timers can't lose via the timer alone.
 * Kept low (critical zone) so the bar doesn't look frozen.
 */
export const NEW_PLAYER_LIFE_FLOOR = 5;

/**
 * Life bonus awarded for discovering long words
 * Key is word length, value is life points restored
 */
export const LONG_WORD_LIFE_BONUS: Record<number, number> = {
  5: 3,  // +3 life for 5-letter words
  6: 5,  // +5 life for 6-letter words
  7: 8,  // +8 life for 7+ letter words
};

/**
 * Get life bonus for a word based on length
 */
export function getLifeBonusForWord(wordLength: number): number {
  if (wordLength >= 7) return LONG_WORD_LIFE_BONUS[7];
  return LONG_WORD_LIFE_BONUS[wordLength] || 0;
}

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
 * Minimum tokens required to auto-unlock a clue
 * With new pricing (1-3 tokens), this triggers after finding a 4-letter word
 */
export const MIN_TOKENS_FOR_HINT = 1;

/**
 * Duration to show feedback overlay in milliseconds
 */
export const FEEDBACK_OVERLAY_DURATION = 1200;

/**
 * Delay before gray (non-clue) letters fade to '?' in the feedback overlay.
 * Gray letters flash briefly so the player sees what they guessed,
 * then fade out to keep focus on green/yellow clue letters.
 */
export const GRAY_LETTER_FADE_DELAY = 400;

/**
 * Duration to auto-dismiss shop hint in milliseconds
 * @deprecated Shop has been removed - clues auto-unlock now
 */
export const SHOP_HINT_DISMISS_DELAY = 5000;

/**
 * Duration to show clue unlock celebration in milliseconds
 */
export const CLUE_UNLOCK_CELEBRATION_DURATION = 1500;

/**
 * Language-based life drain rate multipliers.
 * Japanese kanji compounds are harder to type/find, so drain is slower.
 * Hebrew is slightly slower due to RTL input complexity.
 */
export const LANGUAGE_DRAIN_MULTIPLIER: Record<string, number> = {
  en: 1.0,
  sv: 1.0,
  es: 1.0,
  he: 0.85,  // 15% slower — RTL input adds friction
  ja: 0.7,   // 30% slower — kanji compounds are harder to find/type
};

/**
 * Get drain rate multiplier for a language
 */
export function getLanguageDrainMultiplier(language: string): number {
  return LANGUAGE_DRAIN_MULTIPLIER[language] ?? 1.0;
}
