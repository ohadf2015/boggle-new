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

// ==================== Scoring — re-exported from canonical source ====================

export {
  WORD_SCORES,
  calculateWordScore,
  calculateWordScoreByLength,
} from '@/shared/utils/scoring';
