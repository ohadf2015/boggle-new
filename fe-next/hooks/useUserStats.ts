/**
 * useUserStats Hook
 *
 * Provides user statistics for feature gating
 * Returns total games played from user profile
 */

import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { UserStats } from '@/utils/featureGates';

interface UseUserStatsReturn {
  userStats: UserStats | null;
  isLoading: boolean;
}

/**
 * Hook to fetch user statistics for progressive feature unlocking
 *
 * @returns User stats (total games played) and loading state
 *
 * @example
 * const { userStats, isLoading } = useUserStats();
 * const gates = getFeatureGates(userStats);
 */
export function useUserStats(): UseUserStatsReturn {
  const { profile, isLoading } = useAuth();

  // Memoize userStats to prevent unnecessary recalculations
  const userStats = useMemo<UserStats | null>(() => {
    if (!profile) {
      return null;
    }

    return {
      totalGamesPlayed: profile.total_games ?? 0,
    };
  }, [profile]);

  return {
    userStats,
    isLoading,
  };
}
