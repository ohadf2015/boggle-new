'use client';

import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEngagementStatus } from '@/hooks/useEngagementStatus';
import { calculateLexiScore, type LexiScoreResult } from '@/lib/lexiScore';

/**
 * Computes the player's LexiClash Score from profile + engagement data.
 * Returns null for unauthenticated users.
 */
export function useLexiScore(): LexiScoreResult | null {
  const { profile, isAuthenticated } = useAuth();
  const engagement = useEngagementStatus();

  return useMemo(() => {
    if (!isAuthenticated || !profile) return null;

    return calculateLexiScore({
      currentLevel: profile.current_level ?? 1,
      prestigeLevel: profile.prestige_level ?? 0,
      totalWords: profile.total_words ?? 0,
      totalGames: profile.total_games ?? 0,
      longestStreak: engagement.longestStreak,
      // unique_days_played not in ProfileData — estimate from total_games
      // (conservative: assume ~3 games/day average)
      uniqueDaysPlayed: Math.floor((profile.total_games ?? 0) / 3),
      totalScore: profile.total_score ?? 0,
    });
  }, [isAuthenticated, profile, engagement.longestStreak]);
}
