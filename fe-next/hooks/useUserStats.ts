/**
 * useUserStats Hook
 *
 * Provides user statistics for feature gating
 * Returns total games played from user profile
 */

import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getGuestStats } from '@/utils/guestManager';
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
  const { profile, loading } = useAuth();

  // Memoize userStats — falls back to guest localStorage stats so unlock
  // notifications fire for anonymous users (the cohort most exposed to the
  // overwhelming-modes UX).
  const userStats = useMemo<UserStats | null>(() => {
    if (profile) {
      return { totalGamesPlayed: profile.total_games ?? 0 };
    }
    if (loading) return null;
    if (typeof window === 'undefined') return null;
    try {
      const guest = getGuestStats();
      return { totalGamesPlayed: guest?.games ?? 0 };
    } catch {
      return { totalGamesPlayed: 0 };
    }
  }, [profile, loading]);

  return {
    userStats,
    isLoading: loading,
  };
}
