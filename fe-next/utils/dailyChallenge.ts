/**
 * Daily Challenge Utilities
 *
 * This file is a barrel re-export for backward compatibility.
 * All functionality has been modularized into the dailyChallenge/ subdirectory.
 *
 * @see ./dailyChallenge/index.ts for the complete export list
 * @see ./dailyChallenge/ for individual module implementations
 */

// Types
export type {
  DailyPuzzle,
  WordHuntResult,
  WordWheelResult,
  StoredWordWheelResult,
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
} from './dailyChallenge/types';

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
  GAME_LANGUAGE_KEY,
  TRAINING_GATEWAY_SEEN_KEY,
  KEEP_PLAYING_DISMISSED_KEY,
  LENGTH_EMOJI,
  getWordLengthEmoji,
  WORD_FREQUENCY_TIERS,
  MIN_SAME_LENGTH_WORDS,
  getWordHuntResultKey,
  getWordWheelResultKey,
  WORD_WHEEL_STORAGE_KEY,
  getDailyCoinAwardKey,
} from './dailyChallenge/constants';

// PRNG
export { mulberry32, hashString } from './dailyChallenge/prng';

// Date utilities
export {
  getDailyChallengeDate,
  formatDateForDaily,
  getPuzzleNumber,
  getDateForPuzzleNumber,
  getSecondsUntilNextDaily,
  getYesterdayDate,
  formatCountdown,
} from './dailyChallenge/dateUtils';

// Storage
export {
  hasPlayedToday,
  getTodaysResult,
  saveDailyResult,
  getAllDailyResults,
  hasPlayedWordHuntToday,
  getWordHuntStatusToday,
  getTodaysWordHuntResult,
  saveWordHuntResult,
  clearWordHuntResultForRetry,
  markWordHuntForfeitToday,
  hasWordHuntForfeitToday,
  clearWordHuntForfeitToday,
  markWordHuntResultSubmitted,
  getAllWordHuntResults,
  mapServerResultToStoredResult,
  hasPlayedWordWheelToday,
  getWordWheelStatusToday,
  getTodaysWordWheelResult,
  saveWordWheelResult,
  hasPlayedWordWheel,
  getWordWheelResultForDate,
} from './dailyChallenge/storage';
export type { ServerWordHuntResult } from './dailyChallenge/storage';

// Streaks
export {
  getDailyStreak,
  updateDailyStreak,
  getStreakMilestone,
  isStreakAtRisk,
  getStreakMilestoneMessage,
} from './dailyChallenge/streaks';

// Streak Freeze
export {
  updateDailyStreakWithFreeze,
  earnStreakFreeze,
  getFreezeCount,
  STREAK_FREEZE_KEY,
  MAX_FREEZES,
} from './dailyChallenge/streakFreeze';
export type { StreakWithFreezeResult } from './dailyChallenge/streakFreeze';

// Share utilities
export {
  generateShareableResult,
  generateWordHuntShareableResult,
  getWordHuntShareTextForPlatform,
  getShareTextForPlatform,
  generateChallengeUrl,
  parseChallengeParam,
} from './dailyChallenge/shareUtils';

// Word rarity
export { getWordRarity, getRarityLabel, findRarestWord } from './dailyChallenge/wordRarity';

// Guest player
export {
  getGuestDailyPlayer,
  updateGuestDailyPlayer,
  getGuestFingerprint,
} from './dailyChallenge/guestPlayer';

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
} from './dailyChallenge/signupConversion';

// Word lists
export {
  BONUS_WORD_LISTS,
  TARGET_WORD_LISTS,
  SAME_LENGTH_HELPER_WORDS,
  calculateLetterOverlapScore,
  getSameLengthWords,
} from './dailyChallenge/wordLists';

// Grid generation (client-safe functions only)
// NOTE: Server-only functions (generateDailyPuzzleAsync, regenerateDailyPuzzle)
// have been moved to gridGeneration.server.ts to prevent bundling server code into client.
// Import those directly from '@/utils/dailyChallenge/gridGeneration.server' in API routes.
export {
  generateDailyGrid,
  generateDailyPuzzle,
  getTodaysDailyPuzzle,
  isWordOnGrid,
  selectDailyTargetWord,
  getTodaysTargetWord,
} from './dailyChallenge/gridGeneration';

// Word Wheel generation
export {
  generateWordWheelPuzzle,
  isValidWordWheelWord,
} from './dailyChallenge/wordWheelGeneration';
export type { WordWheelPuzzle } from './dailyChallenge/wordWheelGeneration';

// Word Wheel scoring
export { scoreWord as scoreWordWheelWord } from './dailyChallenge/wordWheelScoring';
