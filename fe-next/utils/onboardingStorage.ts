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
import {
  ONBOARDING_FLAG_KEY,
  ONBOARDING_FLAG_VALUES,
  readReturningSignals,
} from '@/utils/returningVisitor';

const STORAGE_KEYS = {
  ONBOARDING_COMPLETED: ONBOARDING_FLAG_KEY,
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
  return value !== null && ONBOARDING_FLAG_VALUES.includes(value);
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
 * Persist in-progress FTUE identity (name + avatar id + edited flag) WITHOUT
 * marking onboarding complete. Lets a mid-FTUE OAuth signup carry the crafted
 * name/avatar into createNewProfile, while a user who abandons mid-profile is
 * NOT wrongly treated as having finished onboarding (isFirstTimeUser stays true).
 * Merges over any existing blob so selectedMode/completedAt aren't clobbered.
 */
export const savePendingOnboardingProfile = (
  data: Pick<OnboardingData, 'displayName' | 'avatarId' | 'nameEdited'>
): void => {
  const existing = getOnboardingData();
  const merged: OnboardingData = {
    avatarId: data.avatarId,
    displayName: data.displayName,
    selectedMode: existing?.selectedMode ?? null,
    completedAt: existing?.completedAt ?? '',
    nameEdited: data.nameEdited,
  };
  saveJsonToLocalStorage(STORAGE_KEYS.ONBOARDING_DATA, merged);
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
// Preserves a multiplayer room code (and optional host name) across the
// onboarding flow so users who click an invite link before completing FTUE
// can join after. Stored as JSON with a 24h TTL.

const PENDING_ROOM_KEY = 'lexiclash_pending_room_invite';
const INVITE_TTL_MS = 24 * 60 * 60 * 1000;
const INVITE_EVENT = 'invite-changed';

export interface PendingRoomInvite {
  code: string;
  hostName?: string;
  ts: number;
}

const emitInviteChanged = (): void => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(INVITE_EVENT));
};

/** Save a room code (and optional host display name) so post-onboarding redirect can pick it up. */
export const savePendingRoomInvite = (roomCode: string, hostName?: string): void => {
  if (typeof window === 'undefined') return;
  const payload: PendingRoomInvite = { code: roomCode, hostName, ts: Date.now() };
  sessionStorage.setItem(PENDING_ROOM_KEY, JSON.stringify(payload));
  emitInviteChanged();
};

/** Read pending invite without consuming it. Returns null if expired or absent. */
export const getPendingRoomInvite = (): PendingRoomInvite | null => {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(PENDING_ROOM_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingRoomInvite;
    if (parsed && typeof parsed === 'object' && parsed.code) {
      if (typeof parsed.ts === 'number' && Date.now() - parsed.ts > INVITE_TTL_MS) {
        sessionStorage.removeItem(PENDING_ROOM_KEY);
        return null;
      }
      return parsed;
    }
  } catch {
    // Legacy plain-string payload — wrap and return.
    return { code: raw, ts: Date.now() };
  }
  return null;
};

/** Retrieve (and clear) the pending invite room code. */
export const consumePendingRoomInvite = (): string | null => {
  const invite = getPendingRoomInvite();
  if (!invite) return null;
  sessionStorage.removeItem(PENDING_ROOM_KEY);
  emitInviteChanged();
  return invite.code;
};

/** Check if a (non-expired) pending room invite exists. */
export const hasPendingRoomInvite = (): boolean => {
  return getPendingRoomInvite() !== null;
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
  // browser clients used localStorage. Both are checked, and only a *live* session
  // counts (see readReturningSignals — the same code the homepage pre-paint script runs).
  let storage: Storage | null = null;
  try {
    storage = window.localStorage;
  } catch {
    storage = null;
  }
  const cookie = typeof document !== 'undefined' ? document.cookie : '';
  return readReturningSignals(storage, cookie, ONBOARDING_FLAG_KEY, ONBOARDING_FLAG_VALUES, true);
};

/**
 * THE returning-visitor predicate (completed/skipped onboarding, or a live
 * Supabase session). PageClient uses it to decide onboarding; the homepage
 * pre-paint script (utils/returningVisitor.ts HOME_TREE_SCRIPT) runs the same
 * logic before paint to pick the fresh vs returning tree.
 */
export const isReturningVisitor = (): boolean => hasCompletedOnboarding() || hasSupabaseSession();
