/**
 * useIsExperiencedPlayer
 *
 * Single source of truth for "this player already knows how to play."
 * Suppresses first-time hints, tutorials, and explanatory overlays.
 *
 * Returns true when EITHER:
 *   - player has completed/skipped onboarding (localStorage flag), OR
 *   - total games played >= EXPERIENCED_THRESHOLD (covers logged-in vets
 *     on cleared devices and guests with playtime).
 */

import { useMemo } from 'react';
import { useUserStats } from './useUserStats';
import { hasCompletedOnboarding } from '@/utils/onboardingStorage';

export const EXPERIENCED_THRESHOLD = 3;

export function useIsExperiencedPlayer(): boolean {
  const { userStats, isLoading } = useUserStats();

  return useMemo(() => {
    if (isLoading) return false;
    if (hasCompletedOnboarding()) return true;
    return (userStats?.totalGamesPlayed ?? 0) >= EXPERIENCED_THRESHOLD;
  }, [userStats, isLoading]);
}
