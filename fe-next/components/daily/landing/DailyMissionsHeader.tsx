'use client';

import { useEffect, useState } from 'react';
import { m } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { getSecondsUntilNextDaily } from '@/utils/dailyChallenge/dateUtils';
import { formatTimeHHMMSS } from '@/shared/utils';
import { cn } from '@/lib/utils';

interface DailyMissionsHeaderProps {
  completedCount: number;
}

/**
 * Header section with calendar date card, segmented progress bar,
 * and countdown timer. Neo-brutalist styling with glow on completion.
 */
export function DailyMissionsHeader({ completedCount }: DailyMissionsHeaderProps) {
  const { t } = useLanguage();
  const [countdown, setCountdown] = useState(getSecondsUntilNextDaily());
  // Defer date to client to avoid SSR/CSR hydration mismatch (React #418)
  const [dateLabel, setDateLabel] = useState<{ monthAbbr: string; dayNum: number | null }>({
    monthAbbr: '',
    dayNum: null,
  });

  useEffect(() => {
    const now = new Date();
    setDateLabel({
      monthAbbr: now.toLocaleString('en', { month: 'short' }).toUpperCase(),
      dayNum: now.getDate(),
    });
    const interval = setInterval(() => {
      setCountdown(getSecondsUntilNextDaily());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const allDone = completedCount >= 2;
  const { monthAbbr, dayNum } = dateLabel;

  return (
    <m.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={cn(
        'flex items-center gap-3 w-full mb-3 rounded-xl border-3 border-black shadow-hard px-3 py-2.5',
        allDone
          ? 'bg-neo-lime/10 border-neo-lime/50'
          : 'bg-neo-navy/90'
      )}
      data-testid="daily-missions-header"
    >
      {/* Date card */}
      <div
        className={cn(
          'flex flex-col items-center rounded-lg border-2 border-black px-2.5 py-1.5 min-w-[48px] animate-date-flip',
          allDone ? 'bg-neo-lime/20' : 'bg-white/10'
        )}
        data-testid="date-card"
      >
        <span className="text-[9px] font-bold text-neo-pink uppercase leading-none">
          {monthAbbr}
        </span>
        <span className="text-xl font-black text-white leading-none mt-0.5">
          {dayNum}
        </span>
      </div>

      {/* Middle: segmented missions progress */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <h2 className="text-xs font-black text-neo-lime uppercase tracking-wider truncate">
            {t('daily.dailyMissions')}
          </h2>
          <span className={cn(
            'text-[10px] font-black shrink-0 ms-2',
            allDone ? 'text-neo-lime' : 'text-neo-white'
          )}>
            {completedCount}/2
          </span>
        </div>

        {/* Segmented progress: 2 blocks */}
        <div className="flex gap-1.5" role="progressbar" aria-valuenow={Math.round((completedCount / 2) * 100)} aria-valuemin={0} aria-valuemax={2} data-testid="xp-progress-bar">
          {[0, 1].map((i) => (
            <m.div
              key={`segment-${i}`}
              className={cn(
                'flex-1 h-3.5 rounded-md border-2 border-black overflow-hidden',
                i < completedCount ? '' : 'bg-black/40'
              )}
              initial={false}
              animate={i < completedCount ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 0.3, delay: i * 0.1 }}
            >
              {i < completedCount && (
                <m.div
                  className={cn(
                    'h-full rounded-sm',
                    allDone ? 'bg-neo-lime shadow-[0_0_8px_rgba(191,255,0,0.4)]' : 'bg-neo-lime'
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 0.5, delay: 0.2 + i * 0.15, ease: 'easeOut' }}
                />
              )}
            </m.div>
          ))}
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
    </m.div>
  );
}
