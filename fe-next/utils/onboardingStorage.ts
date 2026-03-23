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
} as const;

export interface OnboardingData {
  avatarId: string;
  displayName: string;
  selectedMode: 'single' | 'multi' | 'daily' | 'home' | null;
  completedAt: string; // ISO timestamp
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
