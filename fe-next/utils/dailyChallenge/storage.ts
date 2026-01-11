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

// ==========================================
// Legacy Daily Challenge Storage
// ==========================================

/**
 * Check if user has already played today's daily challenge
 */
export function hasPlayedToday(language: Language): boolean {
  if (typeof window === 'undefined') return false;

  const today = getDailyChallengeDate();
  const key = `${DAILY_STORAGE_KEY}_${language}_${today}`;
  return localStorage.getItem(key) !== null;
}

/**
 * Get the stored result for today's daily (if exists)
 */
export function getTodaysResult(language: Language): StoredDailyResult | null {
  if (typeof window === 'undefined') return null;

  const today = getDailyChallengeDate();
  const key = `${DAILY_STORAGE_KEY}_${language}_${today}`;
  const stored = localStorage.getItem(key);

  if (!stored) return null;

  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Save the result of today's daily challenge
 */
export function saveDailyResult(result: DailyChallengeResult): void {
  if (typeof window === 'undefined') return;

  const today = getDailyChallengeDate();
  const key = `${DAILY_STORAGE_KEY}_${result.language}_${today}`;

  const storedResult: StoredDailyResult = {
    date: today,
    puzzleNumber: result.puzzleNumber,
    result,
    completedAt: new Date().toISOString(),
  };

  localStorage.setItem(key, JSON.stringify(storedResult));
}

/**
 * Get all stored daily results (for history)
 */
export function getAllDailyResults(language: Language): StoredDailyResult[] {
  if (typeof window === 'undefined') return [];

  const results: StoredDailyResult[] = [];
  const prefix = `${DAILY_STORAGE_KEY}_${language}_`;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          results.push(JSON.parse(stored));
        } catch {
          // Skip invalid entries
        }
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
  if (typeof window === 'undefined') return false;

  const today = getDailyChallengeDate();
  const key = `${WORD_HUNT_STORAGE_KEY}_${language}_${today}`;
  return localStorage.getItem(key) !== null;
}

/**
 * Get the stored Word Hunt result for today (if exists)
 */
export function getTodaysWordHuntResult(language: Language): StoredWordHuntResult | null {
  if (typeof window === 'undefined') return null;

  const today = getDailyChallengeDate();
  const key = `${WORD_HUNT_STORAGE_KEY}_${language}_${today}`;
  const stored = localStorage.getItem(key);

  if (!stored) return null;

  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
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

  const today = result.puzzleDate || getDailyChallengeDate();
  const key = `${WORD_HUNT_STORAGE_KEY}_${result.language}_${today}`;

  const storedResult: StoredWordHuntResult = {
    date: today,
    puzzleNumber: result.puzzleNumber,
    result,
    completedAt: new Date().toISOString(),
    submittedToServer: false, // Will be set to true after successful API submission
  };

  localStorage.setItem(key, JSON.stringify(storedResult));

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
  if (typeof window === 'undefined') return false;

  const today = getDailyChallengeDate();
  const key = `${WORD_HUNT_STORAGE_KEY}_${language}_${today}`;

  try {
    localStorage.removeItem(key);

    // Also clear the coin award flag so they can earn coins again
    const awardKey = `lexiclash_daily_coin_award_${today}_${language}`;
    localStorage.removeItem(awardKey);

    return true;
  } catch {
    return false;
  }
}

/**
 * Mark a Word Hunt result as successfully submitted to the server
 * Called after the API submission succeeds to prevent duplicate submissions
 */
export function markWordHuntResultSubmitted(language: Language): boolean {
  if (typeof window === 'undefined') return false;

  const today = getDailyChallengeDate();
  const key = `${WORD_HUNT_STORAGE_KEY}_${language}_${today}`;

  try {
    const stored = localStorage.getItem(key);
    if (!stored) return false;

    const storedResult: StoredWordHuntResult = JSON.parse(stored);
    storedResult.submittedToServer = true;
    localStorage.setItem(key, JSON.stringify(storedResult));

    return true;
  } catch {
    return false;
  }
}

/**
 * Get all stored Word Hunt results (for history)
 */
export function getAllWordHuntResults(language: Language): StoredWordHuntResult[] {
  if (typeof window === 'undefined') return [];

  const results: StoredWordHuntResult[] = [];
  const prefix = `${WORD_HUNT_STORAGE_KEY}_${language}_`;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          results.push(JSON.parse(stored));
        } catch {
          // Skip invalid entries
        }
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
