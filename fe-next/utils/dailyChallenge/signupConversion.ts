/**
 * Signup Conversion Utilities
 *
 * Track and manage conversion triggers for daily challenge signup prompts
 */

import type { Language } from '@/types';
import type {
  WordHuntResult,
  ConversionTrigger,
  PendingDailyResult,
  WinnerOnboardingData,
} from './types';
import {
  SIGNUP_MODAL_DISMISSED_KEY,
  PENDING_DAILY_RESULT_KEY,
  FIRST_COMPLETION_KEY,
  WINNER_ONBOARDING_KEY,
  WORD_HUNT_STORAGE_KEY,
  DAILY_STREAK_KEY,
  GUEST_DAILY_PLAYER_KEY,
  GUEST_FINGERPRINT_KEY,
} from './constants';
import { getAllWordHuntResults } from './storage';
import { getGuestDailyPlayer } from './guestPlayer';

/**
 * Check if the signup modal has been dismissed recently
 * Returns true if dismissed within the last 3 days (avoid spamming)
 */
export function wasSignupModalDismissedRecently(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const dismissed = localStorage.getItem(SIGNUP_MODAL_DISMISSED_KEY);
    if (!dismissed) return false;

    const dismissedAt = parseInt(dismissed, 10);
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    return Date.now() - dismissedAt < threeDaysMs;
  } catch {
    return false;
  }
}

/**
 * Record that the signup modal was dismissed
 */
export function recordSignupModalDismissed(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(SIGNUP_MODAL_DISMISSED_KEY, String(Date.now()));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Check if this is the user's first daily challenge completion
 */
export function isFirstDailyCompletion(): boolean {
  if (typeof window === 'undefined') return true;

  try {
    return !localStorage.getItem(FIRST_COMPLETION_KEY);
  } catch {
    return true;
  }
}

/**
 * Mark that the user has completed at least one daily challenge
 */
export function markFirstDailyCompletion(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(FIRST_COMPLETION_KEY, 'true');
  } catch {
    // Ignore storage errors
  }
}

/**
 * Determine the appropriate conversion trigger based on result
 * Returns null if no trigger should fire (e.g., recently dismissed)
 */
export function getConversionTrigger(
  result: WordHuntResult,
  percentile?: number
): ConversionTrigger | null {
  // Don't show if recently dismissed
  if (wasSignupModalDismissedRecently()) {
    return null;
  }

  // Priority 1: First completion (onboarding moment)
  if (isFirstDailyCompletion()) {
    markFirstDailyCompletion();
    return 'firstCompletion';
  }

  // Priority 2: Streak at risk (loss aversion - strongest motivator)
  if (result.streakDays >= 3) {
    return 'streakAtRisk';
  }

  // Priority 3: Top percentile (competitive pride)
  if (result.solved && percentile !== undefined && percentile <= 10) {
    return 'topPercentile';
  }

  // Priority 4: Quick solve (skill pride)
  if (result.solved && result.attemptsUsed <= 3) {
    return 'quickSolve';
  }

  return null;
}

/**
 * Store the pending result before OAuth redirect
 * This will be retrieved after successful signup to auto-save
 */
export function setPendingDailyResult(data: Omit<PendingDailyResult, 'savedAt'>): void {
  if (typeof window === 'undefined') return;

  try {
    const pending: PendingDailyResult = {
      ...data,
      savedAt: Date.now(),
    };
    localStorage.setItem(PENDING_DAILY_RESULT_KEY, JSON.stringify(pending));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Get the pending result after OAuth callback
 * Returns null if no pending result or if expired (> 1 hour)
 */
export function getPendingDailyResult(): PendingDailyResult | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(PENDING_DAILY_RESULT_KEY);
    if (!stored) return null;

    const pending = JSON.parse(stored) as PendingDailyResult;

    // Expire after 1 hour (OAuth should complete quickly)
    const oneHourMs = 60 * 60 * 1000;
    if (Date.now() - pending.savedAt > oneHourMs) {
      clearPendingDailyResult();
      return null;
    }

    return pending;
  } catch {
    return null;
  }
}

/**
 * Clear the pending result (after successful save or on error)
 */
export function clearPendingDailyResult(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(PENDING_DAILY_RESULT_KEY);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Set the winner onboarding flag after successful OAuth signup
 * This indicates the user needs to complete avatar/name selection
 */
export function setWinnerOnboarding(data: Omit<WinnerOnboardingData, 'savedAt'>): void {
  if (typeof window === 'undefined') return;

  try {
    const onboardingData: WinnerOnboardingData = {
      ...data,
      savedAt: Date.now(),
    };
    localStorage.setItem(WINNER_ONBOARDING_KEY, JSON.stringify(onboardingData));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Get the winner onboarding data
 * Returns null if no onboarding needed or if expired (> 1 hour)
 */
export function getWinnerOnboarding(): WinnerOnboardingData | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(WINNER_ONBOARDING_KEY);
    if (!stored) return null;

    const data = JSON.parse(stored) as WinnerOnboardingData;

    // Expire after 1 hour (should complete onboarding quickly)
    const oneHourMs = 60 * 60 * 1000;
    if (Date.now() - data.savedAt > oneHourMs) {
      clearWinnerOnboarding();
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

/**
 * Clear the winner onboarding flag (after completion or expiry)
 */
export function clearWinnerOnboarding(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(WINNER_ONBOARDING_KEY);
  } catch {
    // Ignore storage errors
  }
}

// ==========================================
// Guest Data Sync for Signup
// ==========================================

/**
 * Get all guest daily challenge results for syncing to authenticated account
 * Returns results from ALL languages that the guest has played
 */
export function getAllGuestDailyResults(): Array<{
  result: WordHuntResult;
  puzzleNumber: number;
  puzzleDate: string;
  language: Language;
}> {
  if (typeof window === 'undefined') return [];

  const allResults: Array<{
    result: WordHuntResult;
    puzzleNumber: number;
    puzzleDate: string;
    language: Language;
  }> = [];

  const languages: Language[] = ['en', 'he', 'sv', 'ja', 'es'];

  for (const language of languages) {
    const results = getAllWordHuntResults(language);
    for (const stored of results) {
      allResults.push({
        result: stored.result,
        puzzleNumber: stored.puzzleNumber,
        puzzleDate: stored.date,
        language,
      });
    }
  }

  // syncGuestDailyResultsToAccount replays these through /submit, and the
  // update_word_hunt_player_stats() DB trigger derives current_streak by
  // comparing each row's puzzle_date to the PREVIOUS row's last_played_date
  // (see migration 067) — it assumes rows arrive in chronological order.
  // getAllWordHuntResults() returns each language newest-first, and this loop
  // then concatenates language by language, so the combined list here was
  // date-scrambled (e.g. today's `en` row before yesterday's `he` row).
  // Replaying in that order corrupts the streak the guest is about to see —
  // exactly the wrong moment for it to reset. Sort oldest-first so replay
  // reproduces the same day-by-day history the trigger would have seen if
  // the player had been authenticated all along.
  return allResults.sort((a, b) => a.puzzleDate.localeCompare(b.puzzleDate));
}

/**
 * Sync all guest daily challenge results to authenticated account
 * Should be called after signup to ensure all progress is transferred
 * Returns the number of results successfully synced
 */
export async function syncGuestDailyResultsToAccount(
  userId: string,
  userProfile: { display_name: string | null; username: string; avatar_emoji: string | null; avatar_color: string | null; avatar_image: string | null }
): Promise<number> {
  if (typeof window === 'undefined') return 0;

  try {
    // Get all guest results from localStorage
    const allGuestResults = getAllGuestDailyResults();

    if (allGuestResults.length === 0) {
      return 0;
    }

    // Get guest player info for fallback
    const guestPlayer = await getGuestDailyPlayer();
    let successCount = 0;

    // Submit each result to the backend
    for (const { result, puzzleNumber, puzzleDate, language } of allGuestResults) {
      try {
        // Validate required fields before syncing
        if (!result || !puzzleDate || !puzzleNumber || !language) {
          continue;
        }

        if (result.solved === undefined || !result.attemptsUsed || !result.targetWord || !Array.isArray(result.attempts)) {
          continue;
        }

        const bodyData: Record<string, unknown> = {
          puzzleDate,
          puzzleNumber,
          language,
          playerId: userId,
          guestFingerprint: null, // Now authenticated, use player ID
          displayName: userProfile.display_name || userProfile.username,
          avatarEmoji: userProfile.avatar_emoji || guestPlayer?.avatarEmoji || '🎯',
          avatarColor: userProfile.avatar_color || guestPlayer?.avatarColor || '#6366f1',
          avatarImage: userProfile.avatar_image || undefined,
          solved: result.solved,
          attemptsUsed: result.attemptsUsed,
          targetWord: result.targetWord,
          attemptWords: result.attempts.map(a => ({
            word: a.word,
            feedback: Array.isArray(a.feedback) ? a.feedback.map(f => ({
              letter: f.letter,
              feedback: f.feedback,
              position: f.position,
            })) : [],
            timestamp: a.timestamp,
          })),
        };

        // Add survival mode fields if present
        if (result.wordsDiscovered) bodyData.wordsDiscovered = result.wordsDiscovered;
        if (result.lifeRemaining !== undefined) bodyData.lifeRemaining = result.lifeRemaining;
        if (result.clueTokensEarned !== undefined) bodyData.clueTokensEarned = result.clueTokensEarned;
        if (result.clueTokensSpent !== undefined) bodyData.clueTokensSpent = result.clueTokensSpent;
        if (result.hintsUnlocked !== undefined) bodyData.hintsUnlocked = result.hintsUnlocked;
        if (result.efficiencyScore !== undefined) bodyData.efficiencyScore = result.efficiencyScore;

        const response = await fetch('/api/daily-challenge/word-hunt/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyData),
        });

        if (response.ok) {
          successCount++;
        }
      } catch {
        // Continue with next result
      }
    }

    // Clear guest daily results from localStorage after successful sync
    if (successCount > 0) {
      clearAllGuestDailyResults();
    }

    return successCount;
  } catch {
    return 0;
  }
}

/**
 * Clear all guest daily challenge results from localStorage
 * Should be called after syncing to authenticated account
 */
function clearAllGuestDailyResults(): void {
  if (typeof window === 'undefined') return;

  try {
    const languages: Language[] = ['en', 'he', 'sv', 'ja', 'es'];

    for (const language of languages) {
      // Find and remove all Word Hunt results for this language
      const prefix = `${WORD_HUNT_STORAGE_KEY}_${language}_`;
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }

      // Remove all found keys
      for (const key of keysToRemove) {
        localStorage.removeItem(key);
      }
    }

    // Also clear streak data and other guest daily-related data
    localStorage.removeItem(DAILY_STREAK_KEY);
    localStorage.removeItem(GUEST_DAILY_PLAYER_KEY);
    localStorage.removeItem(GUEST_FINGERPRINT_KEY);
  } catch {
    // Ignore errors
  }
}
