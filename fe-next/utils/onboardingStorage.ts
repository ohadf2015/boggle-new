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
  selectedMode: 'single' | 'multi' | 'daily' | null;
  completedAt: string; // ISO timestamp
}

/**
 * Check if user has completed onboarding
 */
export const hasCompletedOnboarding = (): boolean => {
  return getFromLocalStorage(STORAGE_KEYS.ONBOARDING_COMPLETED) === 'true';
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
 */
export const markOnboardingSkipped = (): void => {
  saveToLocalStorage(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
  // Don't save data since user skipped
};
