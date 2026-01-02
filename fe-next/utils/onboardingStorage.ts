/**
 * LocalStorage utilities for onboarding state management
 * Tracks whether user has completed onboarding and stores their preferences
 */

import { setStoredUsername, setStoredAvatarId } from '@/utils/profileStorage';

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
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED) === 'true';
};

/**
 * Mark onboarding as completed and save user data
 */
export const markOnboardingComplete = (data: Omit<OnboardingData, 'completedAt'>): void => {
  if (typeof window === 'undefined') return;

  const completeData: OnboardingData = {
    ...data,
    completedAt: new Date().toISOString(),
  };

  localStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
  localStorage.setItem(STORAGE_KEYS.ONBOARDING_DATA, JSON.stringify(completeData));

  // Also save to keys used by multiplayer flow for profile persistence
  setStoredUsername(data.displayName);
  setStoredAvatarId(data.avatarId);
};

/**
 * Get saved onboarding data
 */
export const getOnboardingData = (): OnboardingData | null => {
  if (typeof window === 'undefined') return null;

  const data = localStorage.getItem(STORAGE_KEYS.ONBOARDING_DATA);
  if (!data) return null;

  try {
    return JSON.parse(data) as OnboardingData;
  } catch {
    return null;
  }
};

/**
 * Clear onboarding data (for testing/debugging)
 */
export const clearOnboardingData = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
  localStorage.removeItem(STORAGE_KEYS.ONBOARDING_DATA);
};

/**
 * Mark onboarding as skipped (user dismissed without completing)
 */
export const markOnboardingSkipped = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
  // Don't save data since user skipped
};
