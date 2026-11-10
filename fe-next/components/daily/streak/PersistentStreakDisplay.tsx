'use client';

import { useEffect } from 'react';
import { useDailyPlayedStatus } from '@/hooks/useDailyPlayedStatus';
import { useStreakView } from '@/hooks/useStreakView';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { StreakFlame } from '@/components/streak/StreakFlame';
import { StreakSavedToast } from '@/components/streak/StreakSavedToast';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { claimOnce } from '@/lib/daily/streakToastOnce';

const repairKey = (playerId: string, date: string) => `lc:streak-repaired:${playerId}:${date}`;

export function PersistentStreakDisplay() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { freezeApplied, streakRepaired, hasPlayedBefore } = useDailyPlayedStatus();
  // The count is the account streak every other surface shows, not /api/daily/status's own tally.
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

  if (view.loading) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-neo-navy-light animate-pulse">
        <div className="w-5 h-5 rounded bg-neo-navy-lighter" />
        <div className="w-8 h-5 rounded bg-neo-navy-lighter" />
      </div>
    );
  }

  return (
    <>
      {(hasPlayedBefore || current > 0) && (
        <div
          data-testid="streak-counter"
          role="img"
          aria-label={t('dailyStreak.badge', { count: current })}
          className="flex items-center gap-1 rounded-neo-pill border-2 border-neo-orange bg-neo-navy-light py-0.5 pe-3 ps-1.5 shadow-hard-sm"
        >
          <StreakFlame days={current} size={30} mood={view.atRisk ? 'worried' : 'happy'} />
          <span className="font-neo-display text-xl font-black tabular-nums text-neo-cream">{current}</span>
        </div>
      )}
      <StreakSavedToast saved={saved} />
    </>
  );
}
