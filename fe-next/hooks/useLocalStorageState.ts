'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for storing and retrieving an object from localStorage
 * Returns [value, setValue, updateField] where updateField allows updating individual properties
 */
export function useLocalStorageObject<T extends object>(
  key: string,
  defaultValue: T
): [T, (value: T) => void, <K extends keyof T>(field: K, value: T[K]) => void] {
  // Initialize state from localStorage or default
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return defaultValue;
    }
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        return { ...defaultValue, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn(`Failed to load ${key} from localStorage:`, e);
    }
    return defaultValue;
  });

  // Sync to localStorage when value changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn(`Failed to save ${key} to localStorage:`, e);
    }
  }, [key, value]);

  // Update a single field in the object
  const updateField = useCallback(<K extends keyof T>(field: K, fieldValue: T[K]) => {
    setValue((prev) => ({
      ...prev,
      [field]: fieldValue,
    }));
  }, []);

  return [value, setValue, updateField];
}

/**
 * Simple hook for storing a single value in localStorage
 */
export function useLocalStorageState<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return defaultValue;
    }
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn(`Failed to load ${key} from localStorage:`, e);
    }
    return defaultValue;
  });

  // Sync to localStorage when value changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn(`Failed to save ${key} to localStorage:`, e);
    }
  }, [key, value]);

  return [value, setValue];
}

/**
 * Hook for managing a "dismissed" or "has seen" flag in localStorage.
 * Common pattern for tutorials, welcome messages, and one-time notifications.
 *
 * @param key - The localStorage key for this flag
 * @returns Object with isDismissed state and dismiss function
 *
 * @example
 * const { isDismissed, dismiss } = useDismissedFlag('welcome_message');
 *
 * if (!isDismissed) {
 *   return <WelcomeModal onDismiss={dismiss} />;
 * }
 */
export function useDismissedFlag(key: string): {
  isDismissed: boolean;
  dismiss: () => void;
} {
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(key) === 'true';
    } catch {
      return false;
    }
  });

  const dismiss = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, 'true');
      setIsDismissed(true);
    } catch (e) {
      console.warn(`Failed to save ${key} to localStorage:`, e);
    }
  }, [key]);

  return { isDismissed, dismiss };
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'> | Partial<Pick<Storage, 'getItem' | 'setItem'>> | null | undefined;

/** A dismissal stored as its epoch-ms time, honoured until `ttlMs` has passed. */
export function isDismissedWithin(storage: StorageLike, key: string, ttlMs: number, now: number = Date.now()): boolean {
  try {
    const raw = storage?.getItem?.(key);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return now - ts < ttlMs;
  } catch {
    return false;
  }
}

export function persistDismissedAt(storage: StorageLike, key: string, now: number = Date.now()): void {
  try {
    storage?.setItem?.(key, String(now));
  } catch {
    /* private mode / quota: the in-session hide still works */
  }
}

/**
 * "Not now" that comes back after `ttlMs`. Starts dismissed until storage is
 * read, so a reload never flashes a banner the user already closed.
 */
export function useTimedDismissal(key: string, ttlMs: number): { dismissed: boolean; dismiss: () => void } {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(isDismissedWithin(window.localStorage, key, ttlMs));
  }, [key, ttlMs]);

  const dismiss = useCallback(() => {
    persistDismissedAt(window.localStorage, key);
    setDismissed(true);
  }, [key]);

  return { dismissed, dismiss };
}

/**
 * Utility functions for direct localStorage access (for use outside React components).
 * Prefer the hooks for React components.
 */
export const localStorageUtils = {
  /**
   * Check if a flag has been set
   */
  isDismissed: (key: string): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(key) === 'true';
    } catch {
      return false;
    }
  },

  /**
   * Set a flag to dismissed
   */
  dismiss: (key: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, 'true');
    } catch (e) {
      console.warn(`Failed to save ${key} to localStorage:`, e);
    }
  },

  /**
   * Get a value from localStorage with JSON parsing
   */
  get: <T>(key: string, defaultValue: T): T => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore parse errors
    }
    return defaultValue;
  },

  /**
   * Set a value in localStorage with JSON serialization
   */
  set: <T>(key: string, value: T): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn(`Failed to save ${key} to localStorage:`, e);
    }
  },
};
