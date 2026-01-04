/**
 * Daily Challenge Utilities
 *
 * This is a barrel export that provides backward compatibility with the original
 * monolithic dailyChallenge.ts file. All functionality has been split into
 * smaller, focused modules for better maintainability.
 *
 * Module structure:
 * - types.ts          - All interfaces and types
 * - constants.ts      - Constants, storage keys, emojis
 * - prng.ts           - Seeded PRNG utilities
 * - dateUtils.ts      - Date calculations
 * - storage.ts        - localStorage operations
 * - streaks.ts        - Streak tracking
 * - shareUtils.ts     - Share text generation
 * - wordRarity.ts     - Word rarity utilities
 * - guestPlayer.ts    - Guest player management
 * - signupConversion.ts - Signup conversion tracking
 * - wordLists.ts      - Word lists and helper functions
 * - gridGeneration.ts - Grid generation and word embedding
 */

// Types
export type {
  DailyPuzzle,
  WordHuntResult,
  DailyChallengeResult,
  StoredDailyResult,
  StoredWordHuntResult,
  DailyStreak,
  GuestDailyPlayer,
  DailyTargetWord,
  ConversionTrigger,
  PendingDailyResult,
  WinnerOnboardingData,
  TranslationFn,
  ShareTranslationFn,
} from './types';

// Constants
export {
  DAILY_CHALLENGE_EPOCH,
  SEED_SALT,
  DAILY_CHALLENGE_DURATION,
  HEBREW_FINAL_TO_REGULAR,
  normalizeHebrewFinalLetters,
  DAILY_STORAGE_KEY,
  WORD_HUNT_STORAGE_KEY,
  DAILY_STREAK_KEY,
  GUEST_DAILY_PLAYER_KEY,
  GUEST_FINGERPRINT_KEY,
  SIGNUP_MODAL_DISMISSED_KEY,
  PENDING_DAILY_RESULT_KEY,
  FIRST_COMPLETION_KEY,
  WINNER_ONBOARDING_KEY,
  LENGTH_EMOJI,
  getWordLengthEmoji,
  WORD_FREQUENCY_TIERS,
  MIN_SAME_LENGTH_WORDS,
} from './constants';

// PRNG
export { mulberry32, hashString } from './prng';

// Date utilities
export {
  getDailyChallengeDate,
  formatDateForDaily,
  getPuzzleNumber,
  getDateForPuzzleNumber,
  getSecondsUntilNextDaily,
  getYesterdayDate,
  formatCountdown,
} from './dateUtils';

// Storage
export {
  hasPlayedToday,
  getTodaysResult,
  saveDailyResult,
  getAllDailyResults,
  hasPlayedWordHuntToday,
  getTodaysWordHuntResult,
  saveWordHuntResult,
  clearWordHuntResultForRetry,
  markWordHuntResultSubmitted,
  getAllWordHuntResults,
} from './storage';

// Streaks
export {
  getDailyStreak,
  updateDailyStreak,
  getStreakMilestone,
  isStreakAtRisk,
  getStreakMilestoneMessage,
} from './streaks';

// Share utilities
export {
  generateShareableResult,
  generateWordHuntShareableResult,
  getWordHuntShareTextForPlatform,
  getShareTextForPlatform,
  generateChallengeUrl,
  parseChallengeParam,
} from './shareUtils';

// Word rarity
export { getWordRarity, getRarityLabel, findRarestWord } from './wordRarity';

// Guest player
export {
  getGuestDailyPlayer,
  updateGuestDailyPlayer,
  getGuestFingerprint,
} from './guestPlayer';

// Signup conversion
export {
  wasSignupModalDismissedRecently,
  recordSignupModalDismissed,
  isFirstDailyCompletion,
  markFirstDailyCompletion,
  getConversionTrigger,
  setPendingDailyResult,
  getPendingDailyResult,
  clearPendingDailyResult,
  setWinnerOnboarding,
  getWinnerOnboarding,
  clearWinnerOnboarding,
  getAllGuestDailyResults,
  syncGuestDailyResultsToAccount,
} from './signupConversion';

// Word lists
export {
  BONUS_WORD_LISTS,
  TARGET_WORD_LISTS,
  SAME_LENGTH_HELPER_WORDS,
  calculateLetterOverlapScore,
  getSameLengthWords,
} from './wordLists';

// Grid generation
export {
  generateDailyGrid,
  generateDailyPuzzle,
  generateDailyPuzzleAsync,
  regenerateDailyPuzzle,
  getTodaysDailyPuzzle,
  isWordOnGrid,
  selectDailyTargetWord,
  getTodaysTargetWord,
} from './gridGeneration';
