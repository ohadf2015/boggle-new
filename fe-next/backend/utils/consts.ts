/**
 * Backend Constants
 * CommonJS version of shared game constants for Node.js backend use
 *
 * IMPORTANT: These values must stay in sync with shared/constants/gameConstants.ts
 * Any changes here should be reflected in the shared TypeScript version.
 */

import type { DifficultyLevel, Avatar } from '@/shared/types';

// ==================== Type Definitions ====================

interface DifficultyConfig {
  nameKey: string;
  rows: number;
  cols: number;
}

interface DifficultySettings {
  EASY: DifficultyConfig;
  MEDIUM: DifficultyConfig;
  HARD: DifficultyConfig;
}

interface DifficultyTimers {
  EASY: number;
  MEDIUM: number;
  HARD: number;
}

interface WordScores {
  [length: number]: number;
}

// ==================== Difficulty Settings ====================

/**
 * Board size configurations for each difficulty level
 * Matches shared/constants/gameConstants.ts
 */
export const DIFFICULTIES: DifficultySettings = {
  EASY: { nameKey: 'difficulty.easy', rows: 5, cols: 5 },
  MEDIUM: { nameKey: 'difficulty.medium', rows: 7, cols: 7 },
  HARD: { nameKey: 'difficulty.hard', rows: 9, cols: 9 },
};

export const DEFAULT_DIFFICULTY: DifficultyLevel = 'MEDIUM';

// ==================== Timer Settings ====================
// Timer scales proportionally with board cell count for balanced gameplay

export const DIFFICULTY_TIMERS: DifficultyTimers = {
  EASY: 60,     // 1 minute - 5x5 board (25 cells)
  MEDIUM: 120,  // 2 minutes - 7x7 board (49 cells)
  HARD: 180,    // 3 minutes - 9x9 board (81 cells)
};

export const DEFAULT_TIMER = 60;
export const MIN_TIMER = 30;
export const MAX_TIMER = 600;

export function getRecommendedTimer(difficulty: DifficultyLevel): number {
  return DIFFICULTY_TIMERS[difficulty] || DEFAULT_TIMER;
}

// ==================== Word Length Settings ====================

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

// Character avatar image IDs - must match utils/avatarConfig.ts AVATARS
export const AVATAR_IMAGE_IDS: string[] = [
  'broccoli-bob', 'drippy-drop', 'sunny-steve', 'cloudy-carl',
  'octo-otto', 'pizza-pete', 'prickly-pat', 'melon-molly',
  'avo-alex', 'frosty-frank', 'flaky-fred', 'eggy-ed',
  'slimy-sam', 'starry-stella', 'shroom-shelly', 'donut-danny', 'jelly-jen'
];

export function generateRandomAvatar(): Avatar {
  return {
    color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    emoji: AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)],
    avatarImage: AVATAR_IMAGE_IDS[Math.floor(Math.random() * AVATAR_IMAGE_IDS.length)]
  };
}

// ==================== Scoring Constants ====================

export const WORD_SCORES: WordScores = {
  2: 1,
  3: 1,
  4: 2,
  5: 3,
  6: 4,
  7: 5,
  8: 6,
};

export function calculateWordScore(wordLength: number): number {
  if (wordLength < 2) return 0;
  if (wordLength <= 8) return WORD_SCORES[wordLength] || 1;
  return 7 + (wordLength - 9);
}

// ==================== Connection Constants ====================

export const HEARTBEAT_INTERVAL_MS = 30000;
export const PRESENCE_TIMEOUT_MS = 60000;
export const RECONNECTION_TIMEOUT_MS = 30000;
export const STALE_GAME_TIMEOUT_MS = 30 * 60 * 1000;
