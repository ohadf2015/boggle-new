'use client';

import { useEffect, useState } from 'react';
import { getDailyChallengeDate, getSecondsUntilNextDaily } from '@/utils/dailyChallenge/dateUtils';

/**
 * Today's daily date (UTC), kept current for a tab left open: re-checked on
 * tab return / focus and by a timer that fires just past 00:00 UTC.
 */
export function useUtcDay(): string {
  const [day, setDay] = useState(getDailyChallengeDate);

  useEffect(() => {
    const check = () => setDay(getDailyChallengeDate());
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    const timer = setTimeout(check, (getSecondsUntilNextDaily() + 1) * 1000);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', check);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', check);
    };
  }, [day]);

  return day;
}
