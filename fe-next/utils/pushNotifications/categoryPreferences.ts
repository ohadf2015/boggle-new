/**
 * Notification Category Preferences
 * Manages per-category notification settings and push prompt display logic
 */

import {
  CATEGORY_PREFERENCES_KEY,
  DEFAULT_CATEGORY_PREFERENCES,
  PROMPT_DISMISSED_UNTIL_KEY,
  PROMPT_DISMISS_DAYS,
  MIN_GAMES_BEFORE_PROMPT,
  GAMES_PLAYED_EVENT,
  type NotificationCategoryPreferences,
} from './types';

const GAMES_PLAYED_KEY = 'lexiclash_games_played';

/**
 * Load category preferences from localStorage
 */
export function loadCategoryPreferences(): NotificationCategoryPreferences {
  if (typeof window === 'undefined') {
    return DEFAULT_CATEGORY_PREFERENCES;
  }

  try {
    const stored = localStorage.getItem(CATEGORY_PREFERENCES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        pushEnabled: parsed.pushEnabled ?? DEFAULT_CATEGORY_PREFERENCES.pushEnabled,
        dailyChallenge: parsed.dailyChallenge ?? DEFAULT_CATEGORY_PREFERENCES.dailyChallenge,
        streakWarning: parsed.streakWarning ?? DEFAULT_CATEGORY_PREFERENCES.streakWarning,
        friendInvites: parsed.friendInvites ?? DEFAULT_CATEGORY_PREFERENCES.friendInvites,
        weeklySummary: parsed.weeklySummary ?? DEFAULT_CATEGORY_PREFERENCES.weeklySummary,
      };
    }
  } catch {
    // Invalid JSON — use defaults
  }

  return DEFAULT_CATEGORY_PREFERENCES;
}

/**
 * Save category preferences to localStorage
 */
export function saveCategoryPreferences(
  preferences: NotificationCategoryPreferences
): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(CATEGORY_PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    // localStorage not available
  }
}

/**
 * Determine whether to show the push notification permission prompt
 * Criteria:
 * 1. Browser supports Notification API
 * 2. Permission is still 'default' (not granted or denied)
 * 3. User hasn't dismissed the prompt within the last PROMPT_DISMISS_DAYS
 * 4. User has played >= MIN_GAMES_BEFORE_PROMPT games
 */
export function shouldShowPushPrompt(): boolean {
  if (typeof window === 'undefined') return false;

  // Check browser support
  if (typeof window.Notification === 'undefined') return false;

  // Already granted or denied — no need to prompt
  if (Notification.permission !== 'default') return false;

  // Check dismissal cooldown
  try {
    const dismissedUntil = localStorage.getItem(PROMPT_DISMISSED_UNTIL_KEY);
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) {
      return false;
    }
  } catch {
    // localStorage unavailable — show prompt
  }

  // Check engagement threshold
  try {
    const gamesPlayed = parseInt(
      localStorage.getItem(GAMES_PLAYED_KEY) || '0',
      10
    );
    return gamesPlayed >= MIN_GAMES_BEFORE_PROMPT;
  } catch {
    return false;
  }
}

/**
 * Dismiss the push prompt for PROMPT_DISMISS_DAYS days
 */
/**
 * Increment the games-played counter so shouldShowPushPrompt can eventually trigger (N-16)
 */
export function incrementGamesPlayed(): void {
  if (typeof window === 'undefined') return;
  try {
    const current = parseInt(localStorage.getItem(GAMES_PLAYED_KEY) || '0', 10);
    localStorage.setItem(GAMES_PLAYED_KEY, String(current + 1));
  } catch {
    // localStorage not available
  }
  // Let a mounted PushNotificationPrompt re-check the threshold now —
  // its own mount effect only ran once, before this game was played.
  window.dispatchEvent(new Event(GAMES_PLAYED_EVENT));
}

export function dismissPushPrompt(): void {
  if (typeof window === 'undefined') return;

  try {
    const until = Date.now() + PROMPT_DISMISS_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(PROMPT_DISMISSED_UNTIL_KEY, String(until));
  } catch {
    // localStorage not available
  }
}
