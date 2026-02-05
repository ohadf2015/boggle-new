/**
 * usePlayerStats Hook
 *
 * React hook for accessing player statistics across all single-player modes.
 * Used by landing page to display all-time best score.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getPlayerStats,
  getAllTimeBest,
  getModeStats,
  getAggregateStats,
  type PlayerStats,
  type HighScoreEntry,
  type ModeStats,
  type SinglePlayerMode,
  PLAYER_STATS_KEY,
} from '@/utils/playerStats';

interface UsePlayerStatsOptions {
  /**
   * Whether to load detailed mode statistics
   * Default: false (only loads all-time best for landing page performance)
   */
  loadDetails?: boolean;
}

interface UsePlayerStatsReturn {
  /** All-time best score across all modes */
  allTimeBest: HighScoreEntry | null;
  /** Statistics per mode (only populated if loadDetails is true) */
  modeStats: Record<SinglePlayerMode, ModeStats> | null;
  /** Aggregate statistics (only populated if loadDetails is true) */
  aggregateStats: {
    totalGames: number;
    totalHighScoreBeats: number;
    uniqueConfigurations: number;
  } | null;
  /** Whether stats are still loading */
  loading: boolean;
  /** Force refresh stats from localStorage */
  refresh: () => void;
}

/**
 * Hook to access player statistics
 *
 * @param options - Configuration options
 * @returns Player statistics and utility functions
 *
 * @example
 * // Basic usage (landing page - just need all-time best)
 * const { allTimeBest, loading } = usePlayerStats();
 *
 * @example
 * // Full usage (profile page - need detailed stats)
 * const { allTimeBest, modeStats, aggregateStats, loading } = usePlayerStats({ loadDetails: true });
 */
export function usePlayerStats(options: UsePlayerStatsOptions = {}): UsePlayerStatsReturn {
  const { loadDetails = false } = options;

  const [allTimeBest, setAllTimeBest] = useState<HighScoreEntry | null>(null);
  const [modeStats, setModeStats] = useState<Record<SinglePlayerMode, ModeStats> | null>(null);
  const [aggregateStats, setAggregateStats] = useState<{
    totalGames: number;
    totalHighScoreBeats: number;
    uniqueConfigurations: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(() => {
    // Get all-time best (always loaded)
    const best = getAllTimeBest();
    setAllTimeBest(best);

    // Get detailed stats if requested
    if (loadDetails) {
      const stats = getPlayerStats();
      setModeStats(stats.modes);
      setAggregateStats(getAggregateStats());
    }

    setLoading(false);
  }, [loadDetails]);

  // Initial load
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Listen for localStorage changes and window focus (combined for efficiency)
  useEffect(() => {
    function handleStorageChange(event: StorageEvent): void {
      if (event.key === PLAYER_STATS_KEY) {
        loadStats();
      }
    }

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', loadStats);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', loadStats);
    };
  }, [loadStats]);

  const refresh = useCallback(() => {
    setLoading(true);
    loadStats();
  }, [loadStats]);

  return {
    allTimeBest,
    modeStats,
    aggregateStats,
    loading,
    refresh,
  };
}
