'use client';

import { useEffect, useState } from 'react';
import { useDailyPlayedStatus } from '@/hooks/useDailyPlayedStatus';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { StreakFreezeToast } from './StreakFreezeToast';

const TOAST_MS = 4000;
const freezeToastKey = (playerId: string, date: string) => `lc:streak-freeze-toast:${playerId}:${date}`;

/** Marks the bridged date as announced; true only the first time for this player + date. */
function claimFreezeToast(playerId: string, date: string): boolean {
  try {
    const key = freezeToastKey(playerId, date);
    if (localStorage.getItem(key)) return false;
    localStorage.setItem(key, '1');
    return true;
  } catch {
    return false;
  }
}

export function PersistentStreakDisplay() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { streak, loading, freezeApplied, hasPlayedBefore } = useDailyPlayedStatus();
  const [showFreezeToast, setShowFreezeToast] = useState(false);
  const playerId = user?.id ?? 'guest';
  const freezeDate = freezeApplied?.date;

  // The server repeats freezeApplied on every answer while the bridge holds;
  // the marker is written at show-time so a reload or tab return never re-toasts.
  useEffect(() => {
    if (freezeDate && claimFreezeToast(playerId, freezeDate)) setShowFreezeToast(true);
  }, [playerId, freezeDate]);

  useEffect(() => {
    if (!showFreezeToast) return undefined;
    const timer = setTimeout(() => setShowFreezeToast(false), TOAST_MS);
    return () => clearTimeout(timer);
  }, [showFreezeToast]);

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-neo-navy-light animate-pulse">
        <div className="w-5 h-5 rounded bg-neo-navy-lighter" />
        <div className="w-8 h-5 rounded bg-neo-navy-lighter" />
      </div>
    );
  }

  return (
    <>
      {(hasPlayedBefore || streak.current > 0) && (
        <div data-testid="streak-counter" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-neo-navy-light">
          <span className="text-lg" role="img" aria-label={t('auth.dailyChallenge.streak_flame_icon')}>
            🔥
          </span>
          <span className="font-rubik font-semibold text-neo-cream text-sm">
            {streak.current}
          </span>
        </div>
      )}
      {showFreezeToast && freezeApplied && <StreakFreezeToast freezeApplied={freezeApplied} />}
    </>
  );
}
