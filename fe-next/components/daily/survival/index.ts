/**
 * Daily Word Hunt Survival Mode Module
 *
 * Extracted types and constants from DailyWordHuntSurvival.tsx
 * for better maintainability and reusability.
 *
 * Module structure:
 * - types.ts     - All interfaces and types
 * - constants.ts - Game constants and thresholds
 */

// Types
export type {
  DailyWordHuntSurvivalProps,
  WordDiscovery,
  TargetAttempt,
  SurvivalGameResult,
  AccumulatedClue,
} from './types';

// Constants
export {
  MAX_ATTEMPTS,
  INITIAL_LIFE,
  LIFE_DRAIN_RATE,
  INVALID_WORD_PENALTY,
  NOT_IN_DICTIONARY_PENALTY,
  HALF_LIFE_THRESHOLD,
  MIN_TOKENS_FOR_HINT,
  FEEDBACK_OVERLAY_DURATION,
  SHOP_HINT_DISMISS_DELAY,
} from './constants';
