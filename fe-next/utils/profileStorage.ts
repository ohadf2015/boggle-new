/**
 * Consolidated profile storage utility
 *
 * This module provides a single source of truth for guest profile data
 * stored in localStorage/sessionStorage. It handles:
 * - Username and avatar ID storage
 * - Incognito mode fallback (localStorage → sessionStorage)
 * - Consistent key naming
 * - Type-safe get/set operations
 *
 * For authenticated users, profile data is stored in Supabase via AuthContext.
 * This module is specifically for guest/unauthenticated profile data persistence.
 */

import logger from '@/utils/logger';

// Storage key constants - single source of truth
export const PROFILE_STORAGE_KEYS = {
  USERNAME: 'boggle_username',
  AVATAR_ID: 'boggle_avatar_id',
} as const;

/**
 * Guest profile data structure
 */
export interface GuestProfileData {
  username: string | null;
  avatarId: string | null;
}

// ============================================================================
// Low-level storage helpers (with incognito mode support)
// ============================================================================

/**
 * Get a value from storage with fallback to sessionStorage for incognito mode
 */
function getFromStorage(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key) || sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Save a value to both localStorage and sessionStorage for redundancy
 */
function saveToStorage(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
    sessionStorage.setItem(key, value);
  } catch {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      // Storage completely blocked
      logger.warn(`Failed to save ${key} to storage`);
    }
  }
}

/**
 * Remove a value from both localStorage and sessionStorage
 */
function removeFromStorage(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  } catch {
    // Ignore errors on removal
  }
}

// ============================================================================
// Profile data accessors
// ============================================================================

/**
 * Get the stored guest username
 */
export function getStoredUsername(): string | null {
  return getFromStorage(PROFILE_STORAGE_KEYS.USERNAME);
}

/**
 * Set the guest username in storage
 * @param username - The username to store (will be trimmed)
 */
export function setStoredUsername(username: string): void {
  const trimmed = username.trim();
  if (trimmed) {
    saveToStorage(PROFILE_STORAGE_KEYS.USERNAME, trimmed);
  }
}

/**
 * Clear the stored username
 */
export function clearStoredUsername(): void {
  removeFromStorage(PROFILE_STORAGE_KEYS.USERNAME);
}

/**
 * Get the stored avatar ID
 */
export function getStoredAvatarId(): string | null {
  return getFromStorage(PROFILE_STORAGE_KEYS.AVATAR_ID);
}

/**
 * Set the guest avatar ID in storage
 * @param avatarId - The avatar ID to store
 */
export function setStoredAvatarId(avatarId: string): void {
  if (avatarId) {
    saveToStorage(PROFILE_STORAGE_KEYS.AVATAR_ID, avatarId);
  }
}

/**
 * Clear the stored avatar ID
 */
export function clearStoredAvatarId(): void {
  removeFromStorage(PROFILE_STORAGE_KEYS.AVATAR_ID);
}

// ============================================================================
// Combined profile operations
// ============================================================================

/**
 * Get the complete stored guest profile
 */
export function getStoredProfile(): GuestProfileData {
  return {
    username: getStoredUsername(),
    avatarId: getStoredAvatarId(),
  };
}

/**
 * Save a complete guest profile to storage
 * Only saves non-null/non-empty values
 */
export function saveStoredProfile(profile: Partial<GuestProfileData>): void {
  if (profile.username) {
    setStoredUsername(profile.username);
  }
  if (profile.avatarId) {
    setStoredAvatarId(profile.avatarId);
  }
}

/**
 * Clear all guest profile data from storage
 */
export function clearStoredProfile(): void {
  clearStoredUsername();
  clearStoredAvatarId();
}

/**
 * Check if a guest profile exists in storage
 * @returns true if either username or avatar ID is stored
 */
export function hasStoredProfile(): boolean {
  const profile = getStoredProfile();
  return !!(profile.username || profile.avatarId);
}

/**
 * Check if a complete guest profile exists (both username and avatar)
 * @returns true if both username and avatar ID are stored
 */
export function hasCompleteStoredProfile(): boolean {
  const profile = getStoredProfile();
  return !!(profile.username && profile.avatarId);
}
