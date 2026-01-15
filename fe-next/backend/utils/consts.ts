/**
 * Backend Constants
 *
 * Re-exports from shared/constants/gameConstants.ts + backend-specific constants.
 * This file maintains backward compatibility for imports but now references
 * the single source of truth in shared/constants.
 */

import type { DifficultyLevel, Avatar } from '@/shared/types';

// ==================== Re-exports from Shared Constants ====================
// Single source of truth: shared/constants/gameConstants.ts

export {
  // Difficulty settings
  DIFFICULTIES,
  DEFAULT_DIFFICULTY,
  DIFFICULTY_TIMERS,
  DEFAULT_TIMER,
  MIN_TIMER,
  MAX_TIMER,
  getRecommendedTimer,
  // Word length settings
  DEFAULT_MIN_WORD_LENGTH,
  MIN_WORD_LENGTH,
  MAX_WORD_LENGTH,
  // Avatar constants
  AVATAR_COLORS,
  AVATAR_EMOJIS,
  AVATAR_IMAGE_IDS,
  generateRandomAvatar,
  // Room settings
  MAX_PLAYERS_PER_ROOM,
  MAX_ROOM_NAME_LENGTH,
  ROOM_CODE_LENGTH,
  // Connection constants
  HEARTBEAT_INTERVAL_MS,
  PRESENCE_TIMEOUT_MS,
  RECONNECTION_TIMEOUT_MS,
  STALE_GAME_TIMEOUT_MS,
} from '@/shared/constants/gameConstants';

// Type re-exports for convenience
export type {
  DifficultyConfig,
  DifficultySettings,
} from '@/shared/constants/gameConstants';

// ==================== Backend-Specific Constants ====================

interface WordScores {
  [length: number]: number;
}

// ==================== Scoring Constants ====================

/**
 * @deprecated Use WORD_SCORES from '@/shared/utils/scoring' instead.
 * This lookup table is maintained here for backwards compatibility only.
 *
 * NOTE: The values in this table were INCORRECT and have been fixed in the shared module.
 * The shared module uses the formula: score = wordLength - 1
 * (2 letters = 1, 3 letters = 2, 4 letters = 3, etc.)
 */
export const WORD_SCORES: WordScores = {
  2: 1,
  3: 2,  // CORRECTED from 1 to 2
  4: 3,  // CORRECTED from 2 to 3
  5: 4,  // CORRECTED from 3 to 4
  6: 5,  // CORRECTED from 4 to 5
  7: 6,  // CORRECTED from 5 to 6
  8: 7,  // CORRECTED from 6 to 7
};

/**
 * @deprecated Use calculateWordScore from '@/shared/utils/scoring' instead.
 * This function had incorrect scoring and is kept only for backwards compatibility.
 *
 * For new code, import from:
 * ```typescript
 * import { calculateWordScore } from '@/shared/utils/scoring';
 * ```
 *
 * The shared version includes support for combo bonuses and fire round multipliers.
 */
export function calculateWordScore(wordLength: number): number {
  if (wordLength < 2) return 0;
  // Use correct formula: wordLength - 1
  return wordLength - 1;
}
