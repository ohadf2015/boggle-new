'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/contexts/AuthContext';
import { StreakFreezeToast } from '@/components/daily/streak/StreakFreezeToast';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { claimOnce, freezeToastKey } from '@/lib/daily/streakToastOnce';

const TOAST_MS = 4000;

interface StreakSavedToastProps {
  saved: { date: string; freezesRemaining: number } | null;
}

/** "Freeze saved your streak", once per saved day across every surface (shared marker with the hub). */
export function StreakSavedToast({ saved }: StreakSavedToastProps) {
  const { user } = useAuth();
  const [shown, setShown] = useState<{ date: string; freezesRemaining: number } | null>(null);
  const playerId = user?.id ?? 'guest';
  const date = saved?.date;
  const left = saved?.freezesRemaining ?? 0;

  useEffect(() => {
    if (date && claimOnce(freezeToastKey(playerId, date))) {
      setShown({ date, freezesRemaining: left });
      trackGrowthEvent('streak_freeze_saved', { date, freezesRemaining: left });
    }
  }, [playerId, date, left]);

  useEffect(() => {
    if (!shown) return undefined;
    const timer = setTimeout(() => setShown(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [shown]);

  if (!shown || typeof document === 'undefined') return null;
  return createPortal(<StreakFreezeToast freezeApplied={shown} />, document.body);
}

export default StreakSavedToast;
