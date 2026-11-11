'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { hasSupabaseSession } from '@/utils/onboardingStorage';
import { useWeeklyChest } from '@/hooks/useWeeklyChest';
import { useRetentionStreak } from '@/hooks/useRetentionStreak';
import { getDailyChallengeDate } from '@/utils/dailyChallenge/dateUtils';
import {
  guestStreakDates,
  nextMilestone,
  weekStrip,
  type NextMilestone,
  type StreakMilestone,
  type WeekDay,
} from '@/lib/daily/streakRewards';

export interface StreakView {
  /** True until the number is known: render a skeleton, never a guess that later flips. */
  loading: boolean;
  isGuest: boolean;
  current: number;
  playedToday: boolean;
  /** Streak alive but today not played yet. */
  atRisk: boolean;
  freezes: number;
  week: WeekDay[];
  /** Null when rewards cannot be shown (older server, unreadable claims). */
  milestone: { claimable: StreakMilestone | null; next: NextMilestone | null } | null;
  freezeSaved: { date: string; freezesRemaining: number } | null;
  refresh: (force?: boolean) => void;
}

const noop = () => {};

/**
 * Every streak surface reads this: the account streak from the weekly-chest
 * status once signed in (one request per page, shared), the device streak for
 * a guest. While auth or the account answer is pending it reports loading,
 * so a guest number never shows on a signed-in screen.
 */
export function useStreakView(): StreakView {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const chest = useWeeklyChest();
  const retention = useRetentionStreak();
  const today = getDailyChallengeDate();
  // The landing defers auth until first interaction; a device with no saved session is a guest already.
  const [noSession, setNoSession] = useState(false);
  useEffect(() => {
    setNoSession(!hasSupabaseSession());
  }, []);
  const guest = !isAuthenticated && (!authLoading || noSession);

  const empty: StreakView = {
    loading: true,
    isGuest: guest,
    current: 0,
    playedToday: false,
    atRisk: false,
    freezes: 0,
    week: weekStrip([], [], today),
    milestone: null,
    freezeSaved: null,
    refresh: chest.refresh ?? noop,
  };

  if (guest) {
    const current = retention.streak;
    const playedToday = retention.lastPlayedDate === today;
    const dates = guestStreakDates({ currentStreak: current, lastPlayedDate: retention.lastPlayedDate }, today);
    return {
      ...empty,
      loading: false,
      current,
      playedToday,
      atRisk: current > 0 && !playedToday,
      week: weekStrip(dates, [], today),
      milestone: { claimable: null, next: nextMilestone(current, []) },
    };
  }

  if (authLoading || !isAuthenticated || chest.loading || chest.awaitingFirstLoad) return empty;

  const freezes = chest.freezesAvailable ?? 0;
  const block = chest.streak;
  if (block) {
    return { ...empty, ...block, loading: false, current: chest.currentStreak, freezes };
  }

  const completed = chest.completedDates ?? [];
  const playedToday = completed.includes(today);
  return {
    ...empty,
    loading: false,
    current: chest.currentStreak,
    playedToday,
    atRisk: chest.currentStreak > 0 && !playedToday,
    freezes,
    week: weekStrip(completed, [], today),
  };
}

export default useStreakView;
