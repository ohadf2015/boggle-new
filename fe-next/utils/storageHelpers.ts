/**
 * Unified storage helpers with incognito mode support
 *
 * This module provides low-level storage functions that handle:
 * - SSR safety (typeof window === 'undefined')
 * - Incognito mode fallback (localStorage → sessionStorage)
 * - Error handling for blocked storage
 *
 * Use these helpers instead of direct localStorage/sessionStorage access.
 */

import logger from '@/utils/logger';

/**
 * Get a value from storage with fallback to sessionStorage for incognito mode
 */
export function getFromStorage(key: string): string | null {
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
export function saveToStorage(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
    sessionStorage.setItem(key, value);
  } catch {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      logger.warn(`Failed to save ${key} to storage`);
    }
  }
}

/**
 * Remove a value from both localStorage and sessionStorage
 */
export function removeFromStorage(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  } catch {
    // Ignore errors on removal
  }
}

/**
 * Get a JSON value from storage with type safety and default value
 */
export function getJsonFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const stored = getFromStorage(key);
    if (stored) {
      return JSON.parse(stored) as T;
    }
  } catch (error) {
    logger.error(`Error reading ${key} from storage:`, error);
  }
  return defaultValue;
}

/**
 * Save a JSON value to storage
 */
export function saveJsonToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    saveToStorage(key, JSON.stringify(value));
  } catch (error) {
    logger.error(`Error saving ${key} to storage:`, error);
  }
}

// ============================================================================
// localStorage-only helpers (for non-critical data that doesn't need incognito support)
// ============================================================================

/**
 * Get a value from localStorage only (no sessionStorage fallback)
 */
export function getFromLocalStorage(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Save a value to localStorage only
 */
export function saveToLocalStorage(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch {
    logger.warn(`Failed to save ${key} to localStorage`);
  }
}

/**
 * Remove a value from localStorage only
 */
export function removeFromLocalStorage(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore errors on removal
  }
}

/**
 * Get a JSON value from localStorage with type safety and default value
 */
export function getJsonFromLocalStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored) as T;
    }
  } catch (error) {
    logger.error(`Error reading ${key} from localStorage:`, error);
  }
  return defaultValue;
}

/**
 * Save a JSON value to localStorage
 */
export function saveJsonToLocalStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    logger.error(`Error saving ${key} to localStorage:`, error);
  }
}
