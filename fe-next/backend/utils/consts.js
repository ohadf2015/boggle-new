/**
 * Backend Constants
 * CommonJS version of shared game constants for Node.js backend use
 *
 * IMPORTANT: These values must stay in sync with shared/constants/gameConstants.ts
 * Any changes here should be reflected in the shared TypeScript version.
 */

// ==================== Difficulty Settings ====================

/**
 * Board size configurations for each difficulty level
 * Matches shared/constants/gameConstants.ts
 */
const DIFFICULTIES = {
  EASY: { nameKey: 'difficulty.easy', rows: 5, cols: 5 },
  MEDIUM: { nameKey: 'difficulty.medium', rows: 7, cols: 7 },
  HARD: { nameKey: 'difficulty.hard', rows: 11, cols: 11 },
};

const DEFAULT_DIFFICULTY = 'MEDIUM';

// ==================== Timer Settings ====================

const DIFFICULTY_TIMERS = {
  EASY: 60,     // 1 minute
  MEDIUM: 60,   // 1 minute
  HARD: 120,    // 2 minutes
};

const DEFAULT_TIMER = 60;
const MIN_TIMER = 30;
const MAX_TIMER = 600;

function getRecommendedTimer(difficulty) {
  return DIFFICULTY_TIMERS[difficulty] || DEFAULT_TIMER;
}

// ==================== Word Length Settings ====================

const DEFAULT_MIN_WORD_LENGTH = 2;
const MIN_WORD_LENGTH = 2;
const MAX_WORD_LENGTH = 50;

// ==================== Room Settings ====================

const MAX_PLAYERS_PER_ROOM = 50;
const MAX_ROOM_NAME_LENGTH = 50;
const ROOM_CODE_LENGTH = 4;

// ==================== Avatar Constants ====================

const AVATAR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788',
  '#FF8FAB', '#6BCF7F', '#FFB347', '#9D84B7', '#FF6F61'
];

const AVATAR_EMOJIS = [
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
  '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔',
  '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺',
  '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞'
];

function generateRandomAvatar() {
  return {
    color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    emoji: AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)]
  };
}

// ==================== Scoring Constants ====================

const WORD_SCORES = {
  2: 1,
  3: 1,
  4: 2,
  5: 3,
  6: 4,
  7: 5,
  8: 6,
};

function calculateWordScore(wordLength) {
  if (wordLength < 2) return 0;
  if (wordLength <= 8) return WORD_SCORES[wordLength] || 1;
  return 7 + (wordLength - 9);
}

// ==================== Connection Constants ====================

const HEARTBEAT_INTERVAL_MS = 30000;
const PRESENCE_TIMEOUT_MS = 60000;
const RECONNECTION_TIMEOUT_MS = 30000;
const STALE_GAME_TIMEOUT_MS = 30 * 60 * 1000;

// ==================== Exports ====================

module.exports = {
  // Difficulty
  DIFFICULTIES,
  DEFAULT_DIFFICULTY,
  DIFFICULTY_TIMERS,
  getRecommendedTimer,

  // Timer
  DEFAULT_TIMER,
  MIN_TIMER,
  MAX_TIMER,

  // Word length
  DEFAULT_MIN_WORD_LENGTH,
  MIN_WORD_LENGTH,
  MAX_WORD_LENGTH,

  // Room
  MAX_PLAYERS_PER_ROOM,
  MAX_ROOM_NAME_LENGTH,
  ROOM_CODE_LENGTH,

  // Avatar
  AVATAR_COLORS,
  AVATAR_EMOJIS,
  generateRandomAvatar,

  // Scoring
  WORD_SCORES,
  calculateWordScore,

  // Connection
  HEARTBEAT_INTERVAL_MS,
  PRESENCE_TIMEOUT_MS,
  RECONNECTION_TIMEOUT_MS,
  STALE_GAME_TIMEOUT_MS,
};
