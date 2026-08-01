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

import { getFromStorage, saveToStorage, removeFromStorage } from '@/utils/storageHelpers';
import { type CustomAvatarConfig, isValidCustomAvatar, getRandomAvatarConfig } from '@/shared/types/customAvatar';
import { getRandomDefaultNameWithAvatar } from '@/utils/defaultNames';
import { validateUsername } from '@/utils/validation';

// Storage key constants - single source of truth
export const PROFILE_STORAGE_KEYS = {
  USERNAME: 'boggle_username',
  AVATAR_ID: 'boggle_avatar_id',
  CUSTOM_AVATAR: 'boggle_custom_avatar',
} as const;

/**
 * Guest profile data structure
 */
export interface GuestProfileData {
  username: string | null;
  avatarId: string | null;
  customAvatar: CustomAvatarConfig | null;
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
/**
 * Stored guest username, or a generated one — persisted on first use.
 *
 * The room modals used to start a first-time guest with an empty name field,
 * which left "Create Battle" inert until they typed something. The join path
 * already invents a name when none is supplied, so the form was stricter than
 * the system behind it. Persisting the generated name also keeps the create
 * modal, the join modal and the emit chokepoint showing ONE identity instead
 * of three different randoms.
 *
 * Falls back to the empty string if the generated name wouldn't pass the
 * modals' own validator — a prefill the Create button rejects is worse than
 * no prefill at all.
 */
export function getOrCreateStoredUsername(language: string = 'en'): string {
  const existing = getStoredUsername();
  if (existing?.trim()) return existing;

  const { name } = getRandomDefaultNameWithAvatar(language);
  if (!validateUsername(name).isValid) return '';

  setStoredUsername(name);
  return name;
}

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

export function getStoredCustomAvatar(): CustomAvatarConfig | null {
  const raw = getFromStorage(PROFILE_STORAGE_KEYS.CUSTOM_AVATAR);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (isValidCustomAvatar(parsed)) return parsed;
    return null;
  } catch {
    return null;
  }
}

/**
 * Get stored custom avatar, or auto-generate and persist a random one.
 * Use this for guest flows where a custom avatar should always exist.
 */
export function getOrCreateStoredCustomAvatar(): CustomAvatarConfig {
  const existing = getStoredCustomAvatar();
  if (existing) return existing;
  const random = getRandomAvatarConfig();
  setStoredCustomAvatar(random);
  return random;
}

export function setStoredCustomAvatar(config: CustomAvatarConfig): void {
  saveToStorage(PROFILE_STORAGE_KEYS.CUSTOM_AVATAR, JSON.stringify(config));
}

export function clearStoredCustomAvatar(): void {
  removeFromStorage(PROFILE_STORAGE_KEYS.CUSTOM_AVATAR);
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
    customAvatar: getStoredCustomAvatar(),
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
  if (profile.customAvatar) {
    setStoredCustomAvatar(profile.customAvatar);
  }
}

/**
 * Clear all guest profile data from storage
 */
export function clearStoredProfile(): void {
  clearStoredUsername();
  clearStoredAvatarId();
  clearStoredCustomAvatar();
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
