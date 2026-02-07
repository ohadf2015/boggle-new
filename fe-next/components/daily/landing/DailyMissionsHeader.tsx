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
      className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mb-4"
      data-testid="daily-missions-header"
    >
      {/* Left: Daily Missions + XP Progress */}
      <div className="bg-slate-900/90 rounded-2xl border-4 border-black shadow-hard p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-sm font-black text-neo-lime uppercase tracking-wider">
              {t('daily.dailyMissions')}
            </h2>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">
              {t('daily.journeyProgress')}
            </p>
          </div>
          <span className="text-xs font-bold text-neo-lime">
            {completedCount}/2 {t('daily.completedCount')}
          </span>
        </div>

        {/* Progress bar */}
        <div
          className="h-6 bg-black/40 rounded-full border-2 border-black overflow-hidden"
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

      {/* Right: Calendar + Countdown */}
      <div className="bg-slate-900/90 rounded-2xl border-4 border-black border-b-neo-pink shadow-hard p-4 flex items-center gap-4">
        {/* Flip-style date card */}
        <div
          className="flex flex-col items-center bg-white/10 rounded-xl border-2 border-black px-3 py-2 min-w-[56px] animate-date-flip"
          data-testid="date-card"
        >
          <span className="text-[10px] font-bold text-neo-pink uppercase leading-none">
            {monthAbbr}
          </span>
          <span className="text-2xl font-black text-white leading-none mt-0.5">
            {dayNum}
          </span>
        </div>

        {/* Countdown */}
        <div className="flex-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
            {t('daily.nextQuestsIn')}
          </p>
          <p
            className="text-xl font-black text-white font-mono tracking-wider"
            data-testid="countdown-timer"
          >
            {formatTimeHHMMSS(countdown)}
          </p>
        </div>
      </div>
    </div>
  );
}
