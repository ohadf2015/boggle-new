/**
 * LocalStorage utilities for onboarding state management
 * Tracks whether user has completed onboarding and stores their preferences
 */

import { setStoredUsername, setStoredAvatarId } from '@/utils/profileStorage';
import {
  getFromLocalStorage,
  saveToLocalStorage,
  removeFromLocalStorage,
  getJsonFromLocalStorage,
  saveJsonToLocalStorage,
} from '@/utils/storageHelpers';

const STORAGE_KEYS = {
  ONBOARDING_COMPLETED: 'lexiclash_onboarding_completed',
  ONBOARDING_DATA: 'lexiclash_onboarding_data',
  BOTS_GAME_PLAYED: 'lexiclash_bots_game_played',
} as const;

export interface OnboardingData {
  avatarId: string;
  displayName: string;
  selectedMode: 'single' | 'multi' | 'daily' | 'home' | null;
  completedAt: string; // ISO timestamp
  // True when the user actually changed the name input from the auto-suggestion.
  // Used by createNewProfile to decide whether to force the customize modal.
  nameEdited?: boolean;
}

/**
 * Check if user has completed or skipped onboarding
 */
export const hasCompletedOnboarding = (): boolean => {
  const value = getFromLocalStorage(STORAGE_KEYS.ONBOARDING_COMPLETED);
  return value === 'true' || value === 'skipped';
};

/**
 * Check if user only skipped onboarding (dismissed without completing)
 * Useful for showing re-engagement prompts
 */
export const wasOnboardingSkipped = (): boolean => {
  return getFromLocalStorage(STORAGE_KEYS.ONBOARDING_COMPLETED) === 'skipped';
};

/**
 * Mark onboarding as completed and save user data
 */
export const markOnboardingComplete = (data: Omit<OnboardingData, 'completedAt'>): void => {
  const completeData: OnboardingData = {
    ...data,
    completedAt: new Date().toISOString(),
  };

  saveToLocalStorage(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
  saveJsonToLocalStorage(STORAGE_KEYS.ONBOARDING_DATA, completeData);

  // Also save to keys used by multiplayer flow for profile persistence
  setStoredUsername(data.displayName);
  setStoredAvatarId(data.avatarId);
};

/**
 * Get saved onboarding data
 */
export const getOnboardingData = (): OnboardingData | null => {
  return getJsonFromLocalStorage<OnboardingData | null>(STORAGE_KEYS.ONBOARDING_DATA, null);
};

/**
 * Clear onboarding data (for testing/debugging)
 */
export const clearOnboardingData = (): void => {
  removeFromLocalStorage(STORAGE_KEYS.ONBOARDING_COMPLETED);
  removeFromLocalStorage(STORAGE_KEYS.ONBOARDING_DATA);
};

/**
 * Mark onboarding as skipped (user dismissed without completing)
 * Stores 'skipped' instead of 'true' so we can re-engage later
 */
export const markOnboardingSkipped = (): void => {
  saveToLocalStorage(STORAGE_KEYS.ONBOARDING_COMPLETED, 'skipped');
  // Don't save data since user skipped
};

/**
 * Check if this is a first-time user who should see the FTUE flow.
 * Returns true only if onboarding was never completed AND never skipped.
 */
export const isFirstTimeUser = (): boolean => {
  return !hasCompletedOnboarding();
};

// ── Pending Room Invite ──────────────────────────────────────────────
// Preserves a multiplayer room code across the onboarding flow so users
// who click an invite link before completing FTUE can join after.

const PENDING_ROOM_KEY = 'lexiclash_pending_room_invite';

/** Save a room code so post-onboarding redirect can pick it up. */
export const savePendingRoomInvite = (roomCode: string): void => {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(PENDING_ROOM_KEY, roomCode);
};

/** Retrieve (and clear) a pending room invite code. */
export const consumePendingRoomInvite = (): string | null => {
  if (typeof window === 'undefined') return null;
  const code = sessionStorage.getItem(PENDING_ROOM_KEY);
  if (code) sessionStorage.removeItem(PENDING_ROOM_KEY);
  return code;
};

/** Check if a pending room invite exists without consuming it. */
export const hasPendingRoomInvite = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!sessionStorage.getItem(PENDING_ROOM_KEY);
};

/**
 * Check if a Supabase auth session exists in localStorage.
 * Supabase stores sessions under keys matching sb-<projectRef>-auth-token.
 * Used to skip FTUE for users with a real auth account on a cleared device.
 */
/**
 * Returning-player gate: flipped after the user's first Single-Player-vs-Bots
 * game finishes. Once true, subsequent entries to /singleplayer should route
 * to Quick Play instead of replaying the bots-vs-player flow.
 */
export const hasPlayedBotsGame = (): boolean => {
  return getFromLocalStorage(STORAGE_KEYS.BOTS_GAME_PLAYED) === 'true';
};

export const markBotsGamePlayed = (): void => {
  saveToLocalStorage(STORAGE_KEYS.BOTS_GAME_PLAYED, 'true');
};

export const clearBotsGamePlayed = (): void => {
  removeFromLocalStorage(STORAGE_KEYS.BOTS_GAME_PLAYED);
};

export const hasSupabaseSession = (): boolean => {
  if (typeof window === 'undefined') return false;
  // @supabase/ssr stores the session in a cookie, while older `@supabase/supabase-js`
  // browser clients used localStorage. We check both, but only count a *live* session:
  // Supabase v2 commonly leaves the literal string "null" or an object with no
  // access_token after signOut, which would false-positive a `!!getItem(key)` check
  // and cause new visitors to skip the FTUE flow entirely.
  const looksLive = (raw: string | null | undefined): boolean => {
    if (!raw) return false;
    try {
      const parsed = JSON.parse(raw);
      return !!(parsed && typeof parsed === 'object' && parsed.access_token);
    } catch {
      return false;
    }
  };

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
      if (looksLive(localStorage.getItem(key))) return true;
    }
  }

  if (typeof document !== 'undefined' && document.cookie) {
    for (const part of document.cookie.split(';')) {
      const eq = part.indexOf('=');
      if (eq < 0) continue;
      const name = part.slice(0, eq).trim();
      if (name.startsWith('sb-') && name.endsWith('-auth-token')) {
        try {
          const value = decodeURIComponent(part.slice(eq + 1).trim());
          if (looksLive(value)) return true;
        } catch {
          // ignore malformed cookie value
        }
      }
    }
  }
  return false;
};
