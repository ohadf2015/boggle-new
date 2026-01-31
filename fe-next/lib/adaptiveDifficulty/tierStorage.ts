/**
 * Tier Storage Module
 *
 * LocalStorage persistence for adaptive difficulty tier state.
 * SSR-safe with typeof window checks.
 */

import type { DifficultyTier } from '@/types/difficulty';

const TIER_STORAGE_KEY = 'lexiclash_difficulty_tier';

/**
 * Tier state stored in localStorage
 */
export interface TierState {
  tier: DifficultyTier;
  updatedAt: string;
}

/**
 * Get current difficulty tier from localStorage
 * Returns 'normal' if no stored value or on error
 *
 * @returns Current tier (defaults to 'normal')
 */
export function getCurrentTier(): DifficultyTier {
  // SSR safety - return default if window not available
  if (typeof window === 'undefined') {
    return 'normal';
  }

  try {
    const stored = localStorage.getItem(TIER_STORAGE_KEY);
    if (!stored) {
      return 'normal';
    }

    const state: TierState = JSON.parse(stored);

    // Validate tier field exists
    if (!state.tier) {
      return 'normal';
    }

    return state.tier;
  } catch (error) {
    // Parse error or invalid data - return default
    return 'normal';
  }
}

/**
 * Save difficulty tier to localStorage
 * Includes timestamp for tracking when tier was last updated
 *
 * @param tier - Difficulty tier to save
 */
export function saveTier(tier: DifficultyTier): void {
  // SSR safety - do nothing if window not available
  if (typeof window === 'undefined') {
    return;
  }

  const state: TierState = {
    tier,
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(TIER_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    // Handle QuotaExceededError or other storage errors silently
    console.error('Failed to save tier:', error);
  }
}

/**
 * Clear stored tier from localStorage
 * Used for testing or reset scenarios
 */
export function clearTierStorage(): void {
  // SSR safety - do nothing if window not available
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(TIER_STORAGE_KEY);
}
