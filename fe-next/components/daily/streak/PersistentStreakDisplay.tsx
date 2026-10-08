'use client';

import { useEffect, useState } from 'react';
import { useDailyPlayedStatus } from '@/hooks/useDailyPlayedStatus';
import { useLanguage } from '@/contexts/LanguageContext';
import { StreakFreezeToast } from './StreakFreezeToast';

export function PersistentStreakDisplay() {
  const { t } = useLanguage();
  const { streak, loading, freezeApplied } = useDailyPlayedStatus();
  const [showFreezeToast, setShowFreezeToast] = useState(false);

  useEffect(() => {
    if (freezeApplied) {
      setShowFreezeToast(true);
      // Auto-dismiss after 4 seconds
      const timer = setTimeout(() => setShowFreezeToast(false), 4000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [freezeApplied]);

  if (loading) {
    // Skeleton while server resolves
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-neo-navy-light animate-pulse">
        <div className="w-5 h-5 rounded bg-neo-navy-lighter" />
        <div className="w-8 h-5 rounded bg-neo-navy-lighter" />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-neo-navy-light">
        <span className="text-lg" role="img" aria-label={t('auth.dailyChallenge.streak_flame_icon')}>
          🔥
        </span>
        <span className="font-rubik font-semibold text-neo-cream text-sm">
          {streak.current}
        </span>
      </div>
      {showFreezeToast && freezeApplied && <StreakFreezeToast freezeApplied={freezeApplied} />}
    </>
  );
}
