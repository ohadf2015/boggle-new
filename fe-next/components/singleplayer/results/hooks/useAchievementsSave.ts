/**
 * useAchievementsSave - Save achievements to user profile
 *
 * Saves newly earned achievements to the authenticated user's profile
 * by updating their achievement counts. Also checks and awards lifetime
 * achievements (VETERAN, CENTURION, etc.) based on cumulative stats.
 */

import { useEffect, useRef } from 'react';
import logger from '@/utils/logger';
import type { SinglePlayerResultsData } from '../../SinglePlayerView';
import type { ProfileData } from '@/contexts/AuthContext';

/** Lifetime achievement thresholds — mirrors backend achievementManager.ts */
const LIFETIME_THRESHOLDS: { key: string; stat: keyof LifetimeStats; threshold: number }[] = [
  { key: 'VETERAN', stat: 'gamesPlayed', threshold: 50 },
  { key: 'CENTURION', stat: 'gamesPlayed', threshold: 100 },
  { key: 'WORD_COLLECTOR', stat: 'totalWordsFound', threshold: 1000 },
  { key: 'WORD_HOARDER', stat: 'totalWordsFound', threshold: 5000 },
  { key: 'CHAMPION', stat: 'gamesWon', threshold: 25 },
  { key: 'LEGEND', stat: 'gamesWon', threshold: 100 },
  { key: 'POINT_MASTER', stat: 'totalScore', threshold: 10000 },
  { key: 'POINT_KING', stat: 'totalScore', threshold: 50000 },
];

interface LifetimeStats {
  gamesPlayed: number;
  gamesWon: number;
  totalWordsFound: number;
  totalScore: number;
}

/**
 * Compute lifetime achievements that should be unlocked based on profile stats.
 * Returns only achievements not already present in existingKeys.
 */
function computeLifetimeAchievements(
  profile: ProfileData,
  existingKeys: Set<string>,
): string[] {
  const stats: LifetimeStats = {
    gamesPlayed: (profile.total_games || 0) + 1, // +1 for current game (not yet saved)
    gamesWon: (profile.ranked_wins || 0) + (profile.casual_wins || 0),
    totalWordsFound: profile.total_words || 0,
    totalScore: profile.total_score || 0,
  };

  const newAchievements: string[] = [];
  for (const { key, stat, threshold } of LIFETIME_THRESHOLDS) {
    if (!existingKeys.has(key) && stats[stat] >= threshold) {
      newAchievements.push(key);
    }
  }
  return newAchievements;
}

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

    const gameAchievements = results.achievements?.map(a => a.key) || [];

    async function saveAchievements(): Promise<void> {
      try {
        // Merge new in-game achievements with existing counts
        const currentCounts = profile?.achievement_counts || {};
        const updatedCounts = { ...currentCounts };

        for (const achievement of gameAchievements) {
          updatedCounts[achievement] = (updatedCounts[achievement] || 0) + 1;
        }

        // Check for lifetime achievements based on cumulative profile stats
        const existingKeys = new Set(Object.keys(updatedCounts));
        const lifetimeAchievements = computeLifetimeAchievements(profile!, existingKeys);
        for (const key of lifetimeAchievements) {
          updatedCounts[key] = 1;
        }

        const allNew = [...gameAchievements, ...lifetimeAchievements];
        if (allNew.length === 0) return;

        // Update profile with new achievement counts
        await updateProfile({
          achievement_counts: updatedCounts,
        });

        logger.log('[useAchievementsSave] Saved achievements to profile:', allNew);
        if (lifetimeAchievements.length > 0) {
          logger.log('[useAchievementsSave] Lifetime achievements unlocked:', lifetimeAchievements);
        }
      } catch (error) {
        logger.error('[useAchievementsSave] Failed to save achievements:', error);
      }
    }

    void saveAchievements();
    hasSavedAchievementsRef.current = true;
  }, [isAuthenticated, profile, results.achievements, updateProfile]);
}
