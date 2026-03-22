/**
 * useUrgencyData Hook
 *
 * Aggregates engagement, daily challenge, and solve rate data
 * to determine the single highest-priority urgency item for the landing page.
 */

import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEngagementStatus } from '@/hooks/useEngagementStatus';
import { useDailyChallengeStatus } from '@/hooks/useDailyChallengeStatus';
import { useDailySolveRate } from '@/hooks/useDailySolveRate';
import { useFriendsActivity } from '@/hooks/useFriendsActivity';

export type UrgencyType =
  | 'streak-risk'
  | 'daily-unsolved'
  | 'league-drop'
  | 'friend-beat'
  | 'friend-challenge';

export interface UrgencyItem {
  type: UrgencyType;
  data: Record<string, number | string>;
}

function getHoursUntilMidnight(): number {
  const now = new Date(Date.now());
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.max(0, Math.round((midnight.getTime() - now.getTime()) / (1000 * 60 * 60)));
}

export function useUrgencyData(): UrgencyItem | null {
  const { isAuthenticated } = useAuth();
  const { language } = useLanguage();
  const engagement = useEngagementStatus();
  const daily = useDailyChallengeStatus(language as 'en' | 'he' | 'sv' | 'ja' | 'es');
  const { solveRate } = useDailySolveRate(language);
  const { events: friendEvents } = useFriendsActivity();

  return useMemo(() => {
    if (!isAuthenticated) return null;
    if (engagement.loading || daily.loading) return null;

    // Priority 1: Streak at risk
    if (engagement.streakAtRisk && engagement.streak > 0) {
      return {
        type: 'streak-risk' as const,
        data: { count: engagement.streak, hoursLeft: getHoursUntilMidnight() } as Record<string, number | string>,
      };
    }

    // Priority 2: Daily challenge unsolved
    if (!daily.hasPlayed) {
      return {
        type: 'daily-unsolved' as const,
        data: { puzzleNumber: daily.puzzleNumber, solveRate: solveRate ?? 0 } as Record<string, number | string>,
      };
    }

    // Priority 3: Friend beat your score (E-4)
    const beatEvent = friendEvents.find(e => e.beatPlayer);
    if (beatEvent) {
      return {
        type: 'friend-beat' as const,
        data: { friendName: beatEvent.friendName, mode: beatEvent.mode },
      };
    }

    // Priority 4-5: league-drop not yet implemented
    return null;
  }, [
    isAuthenticated,
    engagement.loading,
    engagement.streakAtRisk,
    engagement.streak,
    daily.loading,
    daily.hasPlayed,
    daily.puzzleNumber,
    solveRate,
    friendEvents,
  ]);
}
