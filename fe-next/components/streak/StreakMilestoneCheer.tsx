'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { StreakView } from '@/hooks/useStreakView';
import { getDailyChallengeDate } from '@/utils/dailyChallenge/dateUtils';
import { claimOnce } from '@/lib/daily/streakToastOnce';
import { STREAK_MILESTONES } from '@/lib/daily/streakRewards';
import { cheerMilestone } from './milestoneCheer';

const StreakMilestoneReveal = dynamic(() => import('./StreakMilestoneReveal'), { ssr: false });

/** Lets the home settle (and the freeze toast land) before the milestone takes the stage. */
export const CHEER_DELAY_MS = 1200;

/** Celebrates a 7+ day milestone once per streak run, for guests and accounts, with or without coin rewards. */
export function StreakMilestoneCheer({ view }: { view: StreakView }) {
  const [days, setDays] = useState<number | null>(null);
  const { loading, current, playedToday } = view;
  const claimableDays = view.milestone?.claimable?.days ?? null;

  useEffect(() => {
    if (loading) return undefined;
    const cheer = cheerMilestone(current, playedToday, getDailyChallengeDate());
    // A waiting coin claim for the same milestone is its own celebration.
    if (!cheer || claimableDays === cheer.days) return undefined;
    const timer = setTimeout(() => {
      if (claimOnce(cheer.key)) setDays(cheer.days);
    }, CHEER_DELAY_MS);
    return () => clearTimeout(timer);
  }, [loading, current, playedToday, claimableDays]);

  if (days === null) return null;
  const coins = STREAK_MILESTONES.find((m) => m.days === days)?.coins ?? 0;
  return <StreakMilestoneReveal mode="cheer" source="home" milestone={{ days, coins }} onClose={() => setDays(null)} />;
}

export default StreakMilestoneCheer;
