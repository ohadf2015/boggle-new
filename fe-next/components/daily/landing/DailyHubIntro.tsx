'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

/** Next 00:00 UTC in the player's own clock, e.g. "2:00 AM" / "02:00". */
function localResetTime(locale: string): string | null {
  try {
    const now = new Date();
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    return next.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
  } catch {
    return null;
  }
}

/** One plain line under the hub title: what the daily is and when it resets. */
export function DailyHubIntro() {
  const { t, language } = useLanguage();
  // Client-only: the server does not know the player's time zone.
  const [resetTime, setResetTime] = useState<string | null>(null);

  useEffect(() => {
    setResetTime(localResetTime(language));
  }, [language]);

  return (
    <p data-testid="daily-hub-intro" className="w-full -mt-1 text-sm font-bold leading-snug text-neo-white/80">
      {t('daily.hub.intro')}
      {resetTime && (
        <>
          {' '}
          <span className="text-neo-white" data-testid="daily-hub-reset-time">
            {t('daily.hub.resetsAt', { time: resetTime })}
          </span>
        </>
      )}
    </p>
  );
}

export default DailyHubIntro;
