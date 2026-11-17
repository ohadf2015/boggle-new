'use client';

import { useEffect } from 'react';
import { useDailyPlayedStatus } from '@/hooks/useDailyPlayedStatus';
import { useStreakView } from '@/hooks/useStreakView';
import { useAuth } from '@/contexts/AuthContext';
import { StreakSavedToast } from '@/components/streak/StreakSavedToast';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { claimOnce } from '@/lib/daily/streakToastOnce';

const repairKey = (playerId: string, date: string) => `lc:streak-repaired:${playerId}:${date}`;

export function PersistentStreakDisplay() {
  const { user } = useAuth();
  const { freezeApplied, streakRepaired } = useDailyPlayedStatus();
  const view = useStreakView();
  const playerId = user?.id ?? 'guest';
  const saved = view.freezeSaved ?? freezeApplied ?? null;

  // A missed day replayed inside the catch-up window held the streak together.
  const repaired = streakRepaired?.dates.join(',') ?? '';
  const current = view.current;
  useEffect(() => {
    for (const date of repaired ? repaired.split(',') : []) {
      if (claimOnce(repairKey(playerId, date))) trackGrowthEvent('streak_repaired', { date, streak: current });
    }
  }, [playerId, repaired, current]);

  return <StreakSavedToast saved={view.loading ? null : saved} />;
}
