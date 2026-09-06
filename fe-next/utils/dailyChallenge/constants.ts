/**
 * Daily Challenge Constants
 *
 * All constants used across daily challenge modules
 */

import type { Language } from '@/types';

// ==========================================
// Core Constants
// ==========================================

// Epoch date for puzzle numbering (first daily challenge)
// Puzzle #1 = 2025-12-30, Puzzle #2 = 2025-12-31
export const DAILY_CHALLENGE_EPOCH = new Date('2025-12-30T00:00:00Z');

// Salt for seeding (prevents reverse-engineering grids)
export const SEED_SALT = 'lexiclash-daily-v1';

// Default game duration for daily challenge (in seconds)
export const DAILY_CHALLENGE_DURATION = 120;

// Minimum number of same-length words to embed (excluding target word)
export const MIN_SAME_LENGTH_WORDS = 5;

// Maximum letter count for target words. 7 keeps targets in the fun-to-reveal
// 5-7 band; the 6×6 daily board has room for a 7-letter target plus its
// same-length decoys (verified against MIN_SAME_LENGTH_WORDS).
export const MAX_TARGET_WORD_LENGTH = 7;

// ==========================================
// Hebrew Letter Normalization
// ==========================================

// Hebrew final letters mapping to regular forms
// Final letters should not appear on the grid - only regular forms
export const HEBREW_FINAL_TO_REGULAR: Record<string, string> = {
  'ך': 'כ', // final kaf → kaf
  'ם': 'מ', // final mem → mem
  'ן': 'נ', // final nun → nun
  'ף': 'פ', // final pe → pe
  'ץ': 'צ', // final tsade → tsade
};

// Precompiled once at module load — avoids recompiling a RegExp on every
// normalizeHebrewFinalLetters() call (was `new RegExp(...)` inside the loop).
const HEBREW_FINAL_REPLACERS: ReadonlyArray<readonly [RegExp, string]> =
  Object.entries(HEBREW_FINAL_TO_REGULAR).map(
    ([final, regular]) => [new RegExp(final, 'g'), regular] as const
  );

/**
 * Normalize Hebrew final letters to regular forms for grid display
 * Final letters (ך, ם, ן, ף, ץ) are replaced with their regular forms
 */
export function normalizeHebrewFinalLetters(text: string): string {
  let normalized = text;
  for (const [pattern, regular] of HEBREW_FINAL_REPLACERS) {
    normalized = normalized.replace(pattern, regular);
  }
  return normalized;
}

// ==========================================
// Storage Keys
// ==========================================

export const DAILY_STORAGE_KEY = 'lexiclash_daily';
export const WORD_HUNT_STORAGE_KEY = 'lexiclash_word_hunt';
// Marks that the player bailed out of today's Word Hunt mid-game. Gates re-entry
// behind a rewarded ad (native) without saving a result. Scoped per language+day.
export const WORD_HUNT_FORFEIT_KEY = 'lexiclash_word_hunt_forfeit';
export const WORD_WHEEL_STORAGE_KEY = 'lexiclash_word_wheel';
export const DAILY_STREAK_KEY = 'lexiclash_daily_streak';
export const GUEST_DAILY_PLAYER_KEY = 'lexiclash_guest_daily_player';
export const GUEST_FINGERPRINT_KEY = 'lexiclash_guest_fingerprint';
export const SIGNUP_MODAL_DISMISSED_KEY = 'lexiclash_signup_dismissed';
export const PENDING_DAILY_RESULT_KEY = 'lexiclash_pending_daily_result';
export const FIRST_COMPLETION_KEY = 'lexiclash_first_daily_completion';
export const WINNER_ONBOARDING_KEY = 'lexiclash_winner_onboarding';
export const GAME_LANGUAGE_KEY = 'lexiclash_daily_game_language';
export const TRAINING_GATEWAY_SEEN_KEY = 'lexiclash_training_gateway_seen';
export const KEEP_PLAYING_DISMISSED_KEY = 'lexiclash_keepPlaying_dismissed';

/**
 * Get storage key for Word Hunt result by language and date
 */
export const getWordHuntResultKey = (lang: Language, date: string): string =>
  `${WORD_HUNT_STORAGE_KEY}_${lang}_${date}`;

/**
 * Get storage key for Word Wheel result by language and date
 */
export const getWordWheelResultKey = (lang: Language, date: string): string =>
  `${WORD_WHEEL_STORAGE_KEY}_${lang}_${date}`;

/**
 * Get storage key for daily coin award by date and language
 */
export const getDailyCoinAwardKey = (date: string, lang: Language): string =>
  `lexiclash_daily_coin_award_${date}_${lang}`;

// ==========================================
// Share Emojis
// ==========================================

/**
 * Length labels for share recaps — digits, never emoji.
 */
export const LENGTH_EMOJI: Record<number, string> = {
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
};

/**
 * Get emoji for a word length
 */
export function getWordLengthEmoji(length: number): string {
  if (length >= 7) return LENGTH_EMOJI[7];
  return LENGTH_EMOJI[length] || LENGTH_EMOJI[3];
}

// ==========================================
// Word Frequency Tiers
// ==========================================

/**
 * Common word frequency tiers (lower = more common)
 * Words found less frequently are considered rarer
 */
export const WORD_FREQUENCY_TIERS: Record<Language, Record<string, number>> = {
  en: {
    // Tier 1: Very common (frequency 1)
    'THE': 1, 'AND': 1, 'FOR': 1, 'ARE': 1, 'BUT': 1, 'NOT': 1, 'YOU': 1, 'ALL': 1,
    'CAN': 1, 'HER': 1, 'WAS': 1, 'ONE': 1, 'OUR': 1, 'OUT': 1, 'DAY': 1, 'HAD': 1,
    // Tier 2: Common (frequency 2)
    'CAT': 2, 'DOG': 2, 'RUN': 2, 'SUN': 2, 'FUN': 2, 'BIG': 2, 'TOP': 2, 'MAN': 2,
    'RED': 2, 'BOX': 2, 'CUP': 2, 'PEN': 2, 'CAR': 2, 'BUS': 2, 'MAP': 2, 'KEY': 2,
    // Tier 3: Less common (frequency 3)
    'MOON': 3, 'STAR': 3, 'BIRD': 3, 'FISH': 3, 'TREE': 3, 'BOOK': 3, 'DOOR': 3, 'HAND': 3,
    'FOOT': 3, 'HEAD': 3, 'ROCK': 3, 'SAND': 3, 'BOAT': 3, 'GAME': 3, 'WOLF': 3, 'BEAR': 3,
    // Tier 4: Uncommon (frequency 4) - these are considered rare
    'HAWK': 4, 'FROG': 4, 'DEER': 4, 'DUCK': 4, 'JADE': 4, 'RUBY': 4, 'SILK': 4, 'WOOL': 4,
    'CAVE': 4, 'PEAK': 4, 'POND': 4, 'REEF': 4, 'MYTH': 4, 'BARD': 4, 'MAGE': 4, 'SAGE': 4,
    // Tier 5: Rare (frequency 5) - these are very rare
    'LYNX': 5, 'FLUX': 5, 'APEX': 5, 'VOID': 5, 'ECHO': 5, 'QUIZ': 5, 'MAZE': 5, 'GRID': 5,
    'SWAN': 5, 'CROW': 5, 'MOTH': 5, 'WASP': 5, 'CRAB': 5, 'SEAL': 5, 'TOAD': 5, 'BREW': 5,
  },
  he: {},
  sv: {},
  ja: {},
  es: {},
  fr: {},
  de: {},
  ru: {},
};
