/**
 * Daily Challenge Local Storage Utilities
 *
 * All localStorage operations for daily challenges
 */

import type { Language } from '@/types';
import type { LetterFeedback } from '@/utils/wordHuntFeedback';
import type {
  DailyChallengeResult,
  StoredDailyResult,
  StoredWordHuntResult,
  WordHuntResult,
  DailyStreak,
} from './types';
import {
  DAILY_STORAGE_KEY,
  WORD_HUNT_STORAGE_KEY,
} from './constants';
import { getDailyChallengeDate } from './dateUtils';
import { updateDailyStreak } from './streaks';
import {
  getJsonFromLocalStorage,
  saveJsonToLocalStorage,
  removeFromLocalStorage,
  getFromLocalStorage,
} from '@/utils/storageHelpers';

// ==========================================
// Legacy Daily Challenge Storage
// ==========================================

/**
 * Check if user has already played today's daily challenge
 */
export function hasPlayedToday(language: Language): boolean {
  const today = getDailyChallengeDate();
  const key = `${DAILY_STORAGE_KEY}_${language}_${today}`;
  return getFromLocalStorage(key) !== null;
}

/**
 * Get the stored result for today's daily (if exists)
 */
export function getTodaysResult(language: Language): StoredDailyResult | null {
  const today = getDailyChallengeDate();
  const key = `${DAILY_STORAGE_KEY}_${language}_${today}`;
  return getJsonFromLocalStorage<StoredDailyResult | null>(key, null);
}

/**
 * Save the result of today's daily challenge
 */
export function saveDailyResult(result: DailyChallengeResult): void {
  const today = getDailyChallengeDate();
  const key = `${DAILY_STORAGE_KEY}_${result.language}_${today}`;

  const storedResult: StoredDailyResult = {
    date: today,
    puzzleNumber: result.puzzleNumber,
    result,
    completedAt: new Date().toISOString(),
  };

  saveJsonToLocalStorage(key, storedResult);
}

/**
 * Get all stored daily results (for history)
 */
export function getAllDailyResults(language: Language): StoredDailyResult[] {
  if (typeof window === 'undefined') return [];

  const results: StoredDailyResult[] = [];
  const prefix = `${DAILY_STORAGE_KEY}_${language}_`;

  // Note: localStorage.key() iteration is a special case not covered by storage helpers
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      const result = getJsonFromLocalStorage<StoredDailyResult | null>(key, null);
      if (result) {
        results.push(result);
      }
    }
  }

  // Sort by date descending
  return results.sort((a, b) => b.date.localeCompare(a.date));
}

// ==========================================
// Word Hunt Storage
// ==========================================

/**
 * Check if user has already played today's Word Hunt
 */
export function hasPlayedWordHuntToday(language: Language): boolean {
  const today = getDailyChallengeDate();
  const key = `${WORD_HUNT_STORAGE_KEY}_${language}_${today}`;
  return getFromLocalStorage(key) !== null;
}

/**
 * Get Word Hunt win/loss status for today
 * Returns null if not played, otherwise { solved: boolean }
 * Used by cards/banners to show distinct win vs loss indicators
 */
export function getWordHuntStatusToday(language: Language): { solved: boolean } | null {
  const result = getTodaysWordHuntResult(language);
  if (!result) return null;
  return { solved: result.result.solved };
}

/**
 * Get the stored Word Hunt result for today (if exists)
 * Returns null if the stored result has invalid data (e.g., attemptsUsed outside 1-10)
 */
export function getTodaysWordHuntResult(language: Language): StoredWordHuntResult | null {
  const today = getDailyChallengeDate();
  const key = `${WORD_HUNT_STORAGE_KEY}_${language}_${today}`;
  const stored = getJsonFromLocalStorage<StoredWordHuntResult | null>(key, null);

  // Validate attemptsUsed is within valid range (1-10)
  // Old/corrupted data may have invalid values that cause sync errors
  if (stored?.result) {
    const { attemptsUsed } = stored.result;
    if (attemptsUsed !== undefined && (attemptsUsed < 1 || attemptsUsed > 10)) {
      console.warn('[Storage] Invalid attemptsUsed:', attemptsUsed, '- discarding stale data');
      return null;
    }
  }

  return stored;
}

/**
 * Save the result of today's Word Hunt
 * Also updates the daily streak for Word Hunt completions (only for authenticated users)
 * @param result - The word hunt result to save
 * @param isAuthenticated - Whether the user is authenticated. Streak only updates for authenticated users.
 */
export function saveWordHuntResult(result: WordHuntResult, isAuthenticated: boolean = true): DailyStreak {
  if (typeof window === 'undefined') {
    return { currentStreak: 0, longestStreak: 0, lastPlayedDate: null, totalDailiesCompleted: 0 };
  }

  // Validate attemptsUsed before saving - prevent storing invalid data
  // Valid range is 1-10 (must have at least 1 attempt to complete a puzzle)
  const { attemptsUsed } = result;
  if (attemptsUsed < 1 || attemptsUsed > 10) {
    console.error('[Storage] Refusing to save invalid Word Hunt result - attemptsUsed:', attemptsUsed, '(must be 1-10)');
    // Return empty streak without saving - this prevents corrupted data from being stored
    return { currentStreak: 0, longestStreak: 0, lastPlayedDate: null, totalDailiesCompleted: 0 };
  }

  const today = result.puzzleDate || getDailyChallengeDate();
  const key = `${WORD_HUNT_STORAGE_KEY}_${result.language}_${today}`;

  const storedResult: StoredWordHuntResult = {
    date: today,
    puzzleNumber: result.puzzleNumber,
    result,
    completedAt: new Date().toISOString(),
    submittedToServer: false, // Will be set to true after successful API submission
  };

  saveJsonToLocalStorage(key, storedResult);

  // Update the daily streak only for authenticated users
  // Anonymous users don't get streak tracking - incentive to sign up
  if (isAuthenticated) {
    return updateDailyStreak(today);
  }

  // Return empty streak for anonymous users
  return { currentStreak: 0, longestStreak: 0, lastPlayedDate: null, totalDailiesCompleted: 0 };
}

/**
 * Clear today's Word Hunt result to allow retry
 * Used when player pays coins to retry the daily challenge
 * Returns true if successfully cleared
 */
export function clearWordHuntResultForRetry(language: Language): boolean {
  const today = getDailyChallengeDate();
  const key = `${WORD_HUNT_STORAGE_KEY}_${language}_${today}`;

  removeFromLocalStorage(key);

  // Also clear the coin award flag so they can earn coins again
  const awardKey = `lexiclash_daily_coin_award_${today}_${language}`;
  removeFromLocalStorage(awardKey);

  return true;
}

/**
 * Mark a Word Hunt result as successfully submitted to the server
 * Called after the API submission succeeds to prevent duplicate submissions
 */
export function markWordHuntResultSubmitted(language: Language): boolean {
  const today = getDailyChallengeDate();
  const key = `${WORD_HUNT_STORAGE_KEY}_${language}_${today}`;

  const storedResult = getJsonFromLocalStorage<StoredWordHuntResult | null>(key, null);
  if (!storedResult) return false;

  storedResult.submittedToServer = true;
  saveJsonToLocalStorage(key, storedResult);

  return true;
}

/**
 * Get all stored Word Hunt results (for history)
 * Filters out invalid results (e.g., attemptsUsed outside 1-10 range)
 */
export function getAllWordHuntResults(language: Language): StoredWordHuntResult[] {
  if (typeof window === 'undefined') return [];

  const results: StoredWordHuntResult[] = [];
  const prefix = `${WORD_HUNT_STORAGE_KEY}_${language}_`;

  // Note: localStorage.key() iteration is a special case not covered by storage helpers
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      const stored = getJsonFromLocalStorage<StoredWordHuntResult | null>(key, null);
      // Validate attemptsUsed is within valid range (1-10)
      if (stored?.result) {
        const { attemptsUsed } = stored.result;
        if (attemptsUsed !== undefined && (attemptsUsed < 1 || attemptsUsed > 10)) {
          console.warn('[Storage] Skipping invalid result for', key, '- attemptsUsed:', attemptsUsed);
          continue;
        }
        results.push(stored);
      }
    }
  }

  // Sort by date descending
  return results.sort((a, b) => b.date.localeCompare(a.date));
}

// ==========================================
// Server Result Mapping
// ==========================================

/**
 * Server result shape from check-played API endpoint
 * Matches the format returned by /api/daily-challenge/word-hunt/check-played
 */
export interface ServerWordHuntResult {
  solved: boolean;
  attemptsUsed: number;
  targetWord: string;
  attempts?: Array<{
    word: string;
    feedback: LetterFeedback[];
    timestamp: number;
  }>;
  wordsDiscovered?: Array<{
    word: string;
    timestamp: number;
    lifeGained: number;
    tokensGained: number;
  }>;
  lifeRemaining?: number;
  efficiencyScore?: number;
  completedAt?: string;
}

/**
 * Maps server result data to StoredWordHuntResult format
 * Used when reconstructing local storage from server data (e.g., after localStorage clear)
 */
export function mapServerResultToStoredResult(
  serverResult: ServerWordHuntResult,
  date: string,
  puzzleNumber: number,
  language: Language
): StoredWordHuntResult {
  const completedAt = serverResult.completedAt || new Date().toISOString();

  return {
    date,
    puzzleNumber,
    result: {
      puzzleNumber,
      puzzleDate: date,
      language,
      solved: serverResult.solved,
      attemptsUsed: serverResult.attemptsUsed,
      targetWord: serverResult.targetWord,
      attempts: serverResult.attempts || [],
      wordsDiscovered: serverResult.wordsDiscovered || [],
      lifeRemaining: serverResult.lifeRemaining || 0,
      clueTokensEarned: 0,
      clueTokensSpent: 0,
      hintsUnlocked: 0,
      efficiencyScore: serverResult.efficiencyScore || 0,
      streakDays: 0,
      completedAt,
    },
    completedAt,
    submittedToServer: true,
  };
}
