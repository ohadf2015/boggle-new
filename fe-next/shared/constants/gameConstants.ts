/**
 * Shared Game Constants
 * Single source of truth for game configuration used by both frontend and backend
 */

// ==================== Difficulty Settings ====================

export interface DifficultyConfig {
  nameKey: string;
  rows: number;
  cols: number;
}

export interface DifficultySettings {
  EASY: DifficultyConfig;
  MEDIUM: DifficultyConfig;
  HARD: DifficultyConfig;
}

/**
 * Board size configurations for each difficulty level
 * IMPORTANT: These values must match between frontend and backend
 */
export const DIFFICULTIES: DifficultySettings = {
  EASY: { nameKey: 'difficulty.easy', rows: 5, cols: 5 },
  MEDIUM: { nameKey: 'difficulty.medium', rows: 6, cols: 6 },
  HARD: { nameKey: 'difficulty.hard', rows: 7, cols: 7 },
};

export const DEFAULT_DIFFICULTY = 'MEDIUM' as const;

export type DifficultyLevel = keyof typeof DIFFICULTIES;

// ==================== Timer Settings ====================

/**
 * Recommended timer durations per difficulty (in seconds)
 * Larger boards need more time to explore effectively
 * Timer scales proportionally with board cell count for balanced gameplay
 */
export const DIFFICULTY_TIMERS: Record<DifficultyLevel, number> = {
  EASY: 60,     // 1 minute - 5x5 board (25 cells)
  MEDIUM: 90,   // 1.5 minutes - 6x6 board (36 cells)
  HARD: 120,    // 2 minutes - 7x7 board (49 cells)
};

export const DEFAULT_TIMER = 90; // 1.5 minutes (1:30) — classic MP default
export const MIN_TIMER = 30;     // 30 seconds minimum
export const MAX_TIMER = 600;    // 10 minutes maximum (aligned with backend clamp)
/** Default timer for Blast MP when host doesn't set an explicit timer */
export const BLAST_MP_DEFAULT_TIMER = 90;

/**
 * Get recommended timer for a difficulty level
 */
export function getRecommendedTimer(difficulty: DifficultyLevel | string): number {
  return DIFFICULTY_TIMERS[difficulty as DifficultyLevel] || DEFAULT_TIMER;
}

// ==================== Word Length Settings ====================

export interface MinWordLengthOption {
  value: number;
  labelKey: string;
}

export const MIN_WORD_LENGTH_OPTIONS: MinWordLengthOption[] = [
  { value: 2, labelKey: 'hostView.minWordLength2' },
  { value: 3, labelKey: 'hostView.minWordLength3' },
  { value: 4, labelKey: 'hostView.minWordLength4' },
];

export const DEFAULT_MIN_WORD_LENGTH = 2;
export const MIN_WORD_LENGTH = 2;
export const MAX_WORD_LENGTH = 50;

/**
 * Minimum TARGET word length by language for Daily Challenge word hunt
 * Most languages: 5 letters minimum — keeps targets vivid + dodges jargon-heavy 4-letter
 * dictionary fallbacks. Combined with MAX_TARGET_WORD_LENGTH=6 the window is [5,6].
 * Japanese kanji compounds: 2 characters minimum (kanji are complex)
 */
export const MIN_ANSWER_LENGTH: Record<string, number> = {
  en: 5,
  he: 5,
  sv: 5,
  ja: 2,
  es: 5,
};

/**
 * Get minimum TARGET word length for a language in Daily Word Hunt
 * @param language - Language code (en, he, sv, ja, es)
 * @returns Minimum target word length (5 for most languages, 2 for Japanese)
 */
export function getMinAnswerLength(language: string): number {
  return MIN_ANSWER_LENGTH[language] ?? 5;
}

/**
 * Minimum length for NON-TARGET discovered words in Word Hunt survival mode
 * 2-letter minimum allows short valid words (GO, IT, etc.)
 */
export const MIN_DISCOVERY_WORD_LENGTH = 2;

/**
 * Maximum length for discovery words in Word Hunt survival mode.
 * Caps at 8 letters to prevent absurdly long path-traced words that
 * happen to match obscure dictionary entries. Matches the max target
 * word length from WORD_LENGTH_RANGE.
 */
export const MAX_DISCOVERY_WORD_LENGTH = 8;

// ==================== Room Settings ====================

export const MAX_PLAYERS_PER_ROOM = 50;
export const MAX_ROOM_NAME_LENGTH = 50;
export const ROOM_CODE_LENGTH = 4;

// ==================== Avatar Constants ====================

export const AVATAR_COLORS: string[] = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788',
  '#FF8FAB', '#6BCF7F', '#FFB347', '#9D84B7', '#FF6F61'
];

export const AVATAR_EMOJIS: string[] = [
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
  '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔',
  '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺',
  '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞'
];

// Character avatar image IDs - must match utils/avatarConfig.ts AVATARS
export const AVATAR_IMAGE_IDS: string[] = [
  'broccoli-bob', 'drippy-drop', 'sunny-steve', 'cloudy-carl',
  'octo-otto', 'pizza-pete', 'prickly-pat', 'melon-molly',
  'avo-alex', 'frosty-frank', 'flaky-fred', 'eggy-ed',
  'slimy-sam', 'starry-stella', 'shroom-shelly', 'donut-danny', 'jelly-jen'
];

/**
 * Generate a random avatar with character image and legacy emoji/color
 */
export function generateRandomAvatar(): { emoji: string; color: string; avatarImage: string } {
  return {
    color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)] ?? '#FF6B6B',
    emoji: AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)] ?? '🎮',
    avatarImage: AVATAR_IMAGE_IDS[Math.floor(Math.random() * AVATAR_IMAGE_IDS.length)]
  };
}

// ==================== UI Constants ====================

/**
 * Neo-Brutalist color mapping based on word points
 * Used for visual hierarchy in word displays
 */
export const POINT_COLORS: Record<number, string> = {
  1: 'var(--neo-gray)',    // 2-3 letters (neutral, lowest value)
  2: 'var(--neo-cyan)',    // 4 letters
  3: 'var(--neo-cyan)',    // 5 letters
  4: 'var(--neo-orange)',  // 6 letters
  5: 'var(--neo-purple)',  // 7 letters
  6: 'var(--neo-purple)',  // 8 letters
  7: 'var(--neo-pink)',    // 9+ letters (premium/rare)
  8: 'var(--neo-pink)',    // 10+ letters
};

/**
 * Get color for a word score
 */
export function getPointColor(score: number): string {
  if (score >= 8) return POINT_COLORS[8] ?? 'var(--neo-pink)';
  return POINT_COLORS[score] ?? POINT_COLORS[1] ?? 'var(--neo-gray)';
}

// ==================== Connection Constants ====================

export const HEARTBEAT_INTERVAL_MS = 30000;      // 30 seconds
export const PRESENCE_TIMEOUT_MS = 60000;        // 1 minute
export const RECONNECTION_TIMEOUT_MS = 30000;    // 30 seconds
export const STALE_GAME_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
