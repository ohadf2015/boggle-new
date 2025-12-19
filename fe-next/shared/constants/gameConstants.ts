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
  MEDIUM: { nameKey: 'difficulty.medium', rows: 7, cols: 7 },
  HARD: { nameKey: 'difficulty.hard', rows: 11, cols: 11 },
};

export const DEFAULT_DIFFICULTY = 'MEDIUM' as const;

export type DifficultyLevel = keyof typeof DIFFICULTIES;

// ==================== Timer Settings ====================

/**
 * Recommended timer durations per difficulty (in seconds)
 * Larger boards need more time to explore effectively
 */
export const DIFFICULTY_TIMERS: Record<DifficultyLevel, number> = {
  EASY: 60,     // 1 minute - small board, quick games
  MEDIUM: 60,   // 1 minute - default, fast-paced
  HARD: 120,    // 2 minutes - larger board
};

export const DEFAULT_TIMER = 60; // 1 minute
export const MIN_TIMER = 30;     // 30 seconds minimum
export const MAX_TIMER = 600;    // 10 minutes maximum

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

/**
 * Generate a random avatar with emoji and color
 */
export function generateRandomAvatar(): { emoji: string; color: string } {
  return {
    color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)] ?? '#FF6B6B',
    emoji: AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)] ?? '🎮'
  };
}

// ==================== Scoring Constants ====================

/**
 * Word score calculation based on word length
 * Points increase significantly for longer words
 */
export const WORD_SCORES: Record<number, number> = {
  2: 1,   // 2 letters
  3: 1,   // 3 letters
  4: 2,   // 4 letters
  5: 3,   // 5 letters
  6: 4,   // 6 letters
  7: 5,   // 7 letters
  8: 6,   // 8 letters
  // 9+ letters: 7 + (length - 9) bonus
};

/**
 * Calculate points for a word based on its length
 */
export function calculateWordScore(wordLength: number): number {
  if (wordLength < 2) return 0;
  if (wordLength <= 8) return WORD_SCORES[wordLength] || 1;
  return 7 + (wordLength - 9); // Bonus for very long words
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
