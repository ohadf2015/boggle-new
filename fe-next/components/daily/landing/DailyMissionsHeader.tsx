'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getSecondsUntilNextDaily } from '@/utils/dailyChallenge/dateUtils';
import { formatTimeHHMMSS } from '@/shared/utils';
import { cn } from '@/lib/utils';

interface DailyMissionsHeaderProps {
  completedCount: number;
}

/**
 * Header section with XP progress bar on the left and
 * calendar countdown on the right.
 */
export function DailyMissionsHeader({ completedCount }: DailyMissionsHeaderProps) {
  const { t } = useLanguage();
  const [countdown, setCountdown] = useState(getSecondsUntilNextDaily());

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(getSecondsUntilNextDaily());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const progressPercent = Math.round((completedCount / 2) * 100);
  const now = new Date();
  const monthAbbr = now.toLocaleString('en', { month: 'short' }).toUpperCase();
  const dayNum = now.getDate();

  return (
    <div
      className="flex items-center gap-3 w-full mb-3 bg-slate-900/90 rounded-xl border-3 border-black shadow-hard px-3 py-2.5"
      data-testid="daily-missions-header"
    >
      {/* Date card - compact */}
      <div
        className="flex flex-col items-center bg-white/10 rounded-lg border-2 border-black px-2 py-1 min-w-[44px] animate-date-flip"
        data-testid="date-card"
      >
        <span className="text-[9px] font-bold text-neo-pink uppercase leading-none">
          {monthAbbr}
        </span>
        <span className="text-lg font-black text-white leading-none mt-0.5">
          {dayNum}
        </span>
      </div>

      {/* Middle: missions progress */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xs font-black text-neo-lime uppercase tracking-wider truncate">
            {t('daily.dailyMissions')}
          </h2>
          <span className="text-[10px] font-bold text-neo-lime shrink-0 ms-2">
            {completedCount}/2
          </span>
        </div>
        <div
          className="h-4 bg-black/40 rounded-full border-2 border-black overflow-hidden"
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          data-testid="xp-progress-bar"
        >
          <div
            className={cn(
              'h-full bg-neo-lime rounded-full transition-all duration-500 ease-out',
              progressPercent > 0 && 'min-w-[8%]'
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Right: countdown */}
      <div className="shrink-0 text-end">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
          {t('daily.nextQuestsIn')}
        </p>
        <p
          className="text-sm font-black text-white font-mono tracking-wider"
          data-testid="countdown-timer"
        >
          {formatTimeHHMMSS(countdown)}
        </p>
      </div>
    </div>
  );
}
