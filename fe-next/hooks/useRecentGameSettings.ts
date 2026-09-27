/**
 * useRecentGameSettings Hook
 *
 * Stores and retrieves recent classroom game configurations from localStorage.
 * Allows teachers to quickly replay previous game setups.
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

// ============================================
// CONSTANTS
// ============================================

const STORAGE_KEY = 'lexiclash_recent_game_settings';
/** Maximum number of configurations to store */
const MAX_CONFIGS = 10;

// ============================================
// TYPES
// ============================================

export interface GameSettings {
  /** Game duration in minutes */
  timerMinutes: number;
  /** Board size: 'small' (4x4), 'medium' (5x5), 'large' (6x6) */
  boardSize: 'small' | 'medium' | 'large';
  /** Whether students can join after game starts */
  allowLateJoin: boolean;
}

export interface GameConfiguration {
  /** Unique identifier for this configuration */
  id: string;
  /** Classroom ID */
  classroomId: string;
  /** Classroom name (for display) */
  classroomName: string;
  /** Selected lesson IDs */
  lessonIds: string[];
  /** Lesson names (for display) */
  lessonNames: string[];
  /** Game settings */
  settings: GameSettings;
  /** Timestamp when configuration was saved */
  savedAt: number;
}

export interface UseRecentGameSettingsReturn {
  /** List of recent configurations (most recent first) */
  recentConfigs: GameConfiguration[];
  /** Whether there are any saved configurations */
  hasRecentConfig: boolean;
  /** Save a new configuration */
  saveConfig: (config: GameConfiguration) => void;
  /** Get the most recent configuration */
  getMostRecent: () => GameConfiguration | null;
  /** Get configurations filtered by classroom */
  getByClassroom: (classroomId: string) => GameConfiguration[];
  /** Remove a specific configuration */
  removeConfig: (configId: string) => void;
  /** Clear all saved configurations */
  clearAll: () => void;
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

/**
 * Recent game settings hook
 *
 * @returns Recent configurations and actions
 *
 * @example
 * const { recentConfigs, saveConfig, getMostRecent, hasRecentConfig } = useRecentGameSettings();
 *
 * // Save after starting a game
 * saveConfig({
 *   id: generateId(),
 *   classroomId: selectedClassroom.id,
 *   classroomName: selectedClassroom.name,
 *   lessonIds: selectedLessonIds,
 *   lessonNames: selectedLessons.map(l => l.name),
 *   settings: { timerMinutes: 3, boardSize: 'medium', allowLateJoin: true },
 *   savedAt: Date.now(),
 * });
 *
 * // Quick start with last settings
 * if (hasRecentConfig) {
 *   const lastConfig = getMostRecent();
 *   // Pre-fill form with lastConfig
 * }
 */
export function useRecentGameSettings(): UseRecentGameSettingsReturn {
  const [configs, setConfigs] = useState<GameConfiguration[]>([]);

  // Load configurations from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as GameConfiguration[];
        // Sort by savedAt descending (most recent first)
        const sorted = parsed.sort((a, b) => b.savedAt - a.savedAt);
        setConfigs(sorted);
      }
    } catch (error) {
      console.error('Failed to load recent game settings:', error);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Persist configurations to localStorage
  const persistConfigs = useCallback((newConfigs: GameConfiguration[]) => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfigs));
    } catch (error) {
      console.error('Failed to save recent game settings:', error);
    }
  }, []);

  // Save a new configuration
  const saveConfig = useCallback(
    (config: GameConfiguration) => {
      const configWithTimestamp: GameConfiguration = {
        ...config,
        savedAt: config.savedAt ?? Date.now(),
      };

      setConfigs((prev) => {
        // Add new config at the beginning (most recent)
        const updated = [configWithTimestamp, ...prev];
        // Limit to MAX_CONFIGS
        const trimmed = updated.slice(0, MAX_CONFIGS);
        persistConfigs(trimmed);
        return trimmed;
      });
    },
    [persistConfigs]
  );

  // Get the most recent configuration
  const getMostRecent = useCallback((): GameConfiguration | null => {
    return configs[0] || null;
  }, [configs]);

  // Get configurations filtered by classroom
  const getByClassroom = useCallback(
    (classroomId: string): GameConfiguration[] => {
      return configs.filter((c) => c.classroomId === classroomId);
    },
    [configs]
  );

  // Remove a specific configuration
  const removeConfig = useCallback(
    (configId: string) => {
      setConfigs((prev) => {
        const updated = prev.filter((c) => c.id !== configId);
        persistConfigs(updated);
        return updated;
      });
    },
    [persistConfigs]
  );

  // Clear all configurations
  const clearAll = useCallback(() => {
    setConfigs([]);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        console.error('Failed to clear recent game settings:', error);
      }
    }
  }, []);

  // Check if there are any saved configurations
  const hasRecentConfig = configs.length > 0;

  return {
    recentConfigs: configs,
    hasRecentConfig,
    saveConfig,
    getMostRecent,
    getByClassroom,
    removeConfig,
    clearAll,
  };
}

export default useRecentGameSettings;
