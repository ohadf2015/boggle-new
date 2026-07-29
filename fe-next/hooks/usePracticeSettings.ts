/**
 * usePracticeSettings Hook
 *
 * Manages practice session timing preferences stored in localStorage.
 * Allows students to customize auto-advance timing and behavior.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

// ============================================
// CONSTANTS
// ============================================

const STORAGE_KEY = 'lexiclash_practice_settings';

/**
 * Default practice settings
 * - autoAdvanceCorrect: 1.5s (faster for correct answers)
 * - autoAdvanceIncorrect: 3s (slower to review mistakes)
 * - autoAdvanceEnabled: true by default
 * - requireTypeOnIncorrect: true (helps reinforce learning)
 */
export const DEFAULT_PRACTICE_SETTINGS: PracticeSettings = {
  autoAdvanceCorrect: 1500,
  autoAdvanceIncorrect: 3000,
  autoAdvanceEnabled: true,
  requireTypeOnIncorrect: true,
};

// ============================================
// TYPES
// ============================================

export interface PracticeSettings {
  /** Time in ms to auto-advance after correct answer (default: 1500) */
  autoAdvanceCorrect: number;
  /** Time in ms to auto-advance after incorrect answer (default: 3000) */
  autoAdvanceIncorrect: number;
  /** Whether to auto-advance at all (default: true) */
  autoAdvanceEnabled: boolean;
  /** Whether to require typing the correct answer on incorrect (default: true) */
  requireTypeOnIncorrect: boolean;
}

export interface UsePracticeSettingsReturn {
  /** Current practice settings */
  settings: PracticeSettings;
  /** Update one or more settings */
  updateSettings: (updates: Partial<PracticeSettings>) => void;
  /** Reset all settings to defaults */
  resetSettings: () => void;
  /** Whether settings have been loaded from localStorage */
  isLoaded: boolean;
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

/**
 * Practice settings hook
 *
 * @returns Settings state and actions
 *
 * @example
 * const { settings, updateSettings } = usePracticeSettings();
 *
 * // Change auto-advance timing
 * updateSettings({ autoAdvanceCorrect: 2000 });
 *
 * // Disable auto-advance
 * updateSettings({ autoAdvanceEnabled: false });
 */
export function usePracticeSettings(): UsePracticeSettingsReturn {
  const [settings, setSettings] = useState<PracticeSettings>(DEFAULT_PRACTICE_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsLoaded(true);
      return;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<PracticeSettings>;
        // Merge with defaults to handle missing fields
        setSettings({
          ...DEFAULT_PRACTICE_SETTINGS,
          ...parsed,
        });
      }
    } catch (error) {
      console.error('Failed to load practice settings:', error);
    }

    setIsLoaded(true);
  }, []);

  // Update settings and persist to localStorage
  const updateSettings = useCallback((updates: Partial<PracticeSettings>) => {
    setSettings((prev) => {
      const newSettings = { ...prev, ...updates };

      // Persist to localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
        } catch (error) {
          console.error('Failed to save practice settings:', error);
        }
      }

      return newSettings;
    });
  }, []);

  // Reset settings to defaults
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_PRACTICE_SETTINGS);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PRACTICE_SETTINGS));
      } catch (error) {
        console.error('Failed to reset practice settings:', error);
      }
    }
  }, []);

  return {
    settings,
    updateSettings,
    resetSettings,
    isLoaded,
  };
}

export default usePracticeSettings;
