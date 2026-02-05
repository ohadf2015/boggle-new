/**
 * Daily Challenge Pre-fetch Utilities
 *
 * Pre-fetches daily challenge status from server with localStorage fallback.
 * Used by landing page to show streak and completion status before user enters.
 */

import type { Language } from '@/types';
import { getDailyChallengeDate, getPuzzleNumber } from './dateUtils';
import { getWordHuntStatusToday, getTodaysWordHuntResult } from './storage';
import { getDailyStreak } from './streaks';
import { getGuestFingerprint } from './guestPlayer';
import type { DailyChallengeStatus } from '@/utils/playerStats/types';

/**
 * Server response from check-played endpoint
 */
interface ServerCheckPlayedResponse {
  hasPlayed: boolean;
  result?: {
    solved: boolean;
    attemptsUsed: number;
    targetWord: string;
    completedAt?: string;
  };
  streak?: {
    currentStreak: number;
    longestStreak: number;
  };
}

/**
 * Prefetch daily challenge status with server + localStorage support
 *
 * Strategy:
 * 1. Return localStorage data immediately (for fast initial render)
 * 2. For authenticated users, fetch from server in background
 * 3. Server data takes precedence if available
 *
 * @param language - The game language to check
 * @param playerId - Authenticated user ID (optional)
 * @returns Promise resolving to daily challenge status
 */
export async function prefetchDailyStatus(
  language: Language,
  playerId?: string | null
): Promise<DailyChallengeStatus> {
  const date = getDailyChallengeDate();
  const puzzleNumber = getPuzzleNumber(date);

  // Get localStorage data first (always available, fast)
  const localStatus = getWordHuntStatusToday(language);
  const localStreak = getDailyStreak();

  const baseStatus: DailyChallengeStatus = {
    hasPlayed: !!localStatus,
    hasSolved: localStatus?.solved ?? null,
    currentStreak: localStreak.currentStreak,
    longestStreak: localStreak.longestStreak,
    puzzleNumber,
    puzzleDate: date,
    loading: false,
    fromServer: false,
  };

  // For guest users or when no playerId, return localStorage data only
  if (!playerId) {
    return baseStatus;
  }

  // For authenticated users, try to fetch from server
  try {
    const response = await fetch(
      `/api/daily-challenge/word-hunt/check-played/${date}/${language}?playerId=${playerId}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        // Short timeout to not block landing page
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) {
      // Server error - fall back to localStorage
      return baseStatus;
    }

    const data: ServerCheckPlayedResponse = await response.json();

    // Merge server data with local data (server wins)
    return {
      hasPlayed: data.hasPlayed,
      hasSolved: data.result?.solved ?? null,
      currentStreak: data.streak?.currentStreak ?? localStreak.currentStreak,
      longestStreak: data.streak?.longestStreak ?? localStreak.longestStreak,
      puzzleNumber,
      puzzleDate: date,
      loading: false,
      fromServer: true,
    };
  } catch (error) {
    // Network error or timeout - fall back to localStorage
    return baseStatus;
  }
}

/**
 * Get quick localStorage-only status for immediate display
 * No network requests, always synchronous
 */
export function getQuickDailyStatus(language: Language): DailyChallengeStatus {
  const date = getDailyChallengeDate();
  const puzzleNumber = getPuzzleNumber(date);
  const localStatus = getWordHuntStatusToday(language);
  const localStreak = getDailyStreak();

  return {
    hasPlayed: !!localStatus,
    hasSolved: localStatus?.solved ?? null,
    currentStreak: localStreak.currentStreak,
    longestStreak: localStreak.longestStreak,
    puzzleNumber,
    puzzleDate: date,
    loading: false,
    fromServer: false,
  };
}
