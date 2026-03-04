/**
 * useAchievementsSave - Save achievements to user profile
 *
 * Saves newly earned achievements to the authenticated user's profile
 * by updating their achievement counts.
 */

import { useEffect, useRef } from 'react';
import logger from '@/utils/logger';
import type { SinglePlayerResultsData } from '../../SinglePlayerView';
import type { ProfileData } from '@/contexts/AuthContext';

interface UseAchievementsSaveParams {
  isAuthenticated: boolean;
  profile: ProfileData | null;
  results: SinglePlayerResultsData;
  updateProfile: (updates: Partial<ProfileData>) => Promise<{ data: ProfileData | null; error: { message: string } | null }>;
}

/**
 * Hook to save achievements to authenticated user's profile
 * Only runs for authenticated users with achievements
 */
export function useAchievementsSave({
  isAuthenticated,
  profile,
  results,
  updateProfile,
}: UseAchievementsSaveParams): void {
  const hasSavedAchievementsRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !profile || hasSavedAchievementsRef.current) return;

    const achievements = results.achievements?.map(a => a.key) || [];
    if (achievements.length === 0) return;

    async function saveAchievements(): Promise<void> {
      try {
        // Merge new achievements with existing counts
        const currentCounts = profile?.achievement_counts || {};
        const updatedCounts = { ...currentCounts };

        for (const achievement of achievements) {
          updatedCounts[achievement] = (updatedCounts[achievement] || 0) + 1;
        }

        // Update profile with new achievement counts
        await updateProfile({
          achievement_counts: updatedCounts,
        });

        logger.log('[useAchievementsSave] Saved achievements to profile:', achievements);
      } catch (error) {
        logger.error('[useAchievementsSave] Failed to save achievements:', error);
      }
    }

    void saveAchievements();
    hasSavedAchievementsRef.current = true;
  }, [isAuthenticated, profile, results.achievements, updateProfile]);
}
