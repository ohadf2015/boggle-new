'use client';

import { useEffect, useState } from 'react';
import { m } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { getSecondsUntilNextDaily } from '@/utils/dailyChallenge/dateUtils';
import { formatTimeHHMMSS } from '@/shared/utils';
import { cn } from '@/lib/utils';

interface DailyMissionsHeaderProps {
  completedCount: number;
  /** Quests that clear the day. */
  total?: number;
  /** False while played-state is still resolving: the bar stays neutral instead of painting 0/N and jumping. */
  ready?: boolean;
}

function utcDateLabel() {
  const now = new Date();
  return {
    monthAbbr: now.toLocaleString('en', { month: 'short', timeZone: 'UTC' }).toUpperCase(),
    dayNum: now.getUTCDate() as number | null,
  };
}

/**
 * Header section with calendar date card, segmented progress bar,
 * and countdown timer. Neo-brutalist styling with glow on completion.
 */
export function DailyMissionsHeader({ completedCount, total = 2, ready = true }: DailyMissionsHeaderProps) {
  const { t } = useLanguage();
  // Defer the countdown to the client (null on SSR): a live clock value
  // computed in render differs between server render time and client hydration
  // time → hydration mismatch (React #418). The date label below is deferred
  // for the same reason.
  const [countdown, setCountdown] = useState<number | null>(null);
  // Defer date to client to avoid SSR/CSR hydration mismatch (React #418)
  const [dateLabel, setDateLabel] = useState<{ monthAbbr: string; dayNum: number | null }>({
    monthAbbr: '',
    dayNum: null,
  });

  useEffect(() => {
    // Product convention: dailies reset at midnight UTC (see getDailyChallengeDate).
    // Local getDate() drifted from the hub ISO / Word Hunt puzzle date for Americas
    // evenings (and Israel early morning) — the badge said "today" while the
    // puzzle page labeled the previous UTC day.
    const tick = () => {
      setCountdown(getSecondsUntilNextDaily());
      // Re-derived every tick so a tab left open past 00:00 UTC shows the new day.
      setDateLabel((prev) => {
        const next = utcDateLabel();
        return prev.dayNum === next.dayNum && prev.monthAbbr === next.monthAbbr ? prev : next;
      });
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const shown = ready ? completedCount : 0;
  const allDone = ready && completedCount >= total;
  const segments = Array.from({ length: total }, (_, i) => i);
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
            {t('daily.hub.progressLabel')}
          </h2>
          <span className={cn(
            'text-[10px] font-black shrink-0 ms-2',
            allDone ? 'text-neo-lime' : 'text-neo-white'
          )}>
            {ready ? `${completedCount}/${total}` : '\u2013'}
          </span>
        </div>

        {/* Segmented progress: one block per quest */}
        <div className="flex gap-1.5" role="progressbar" aria-valuenow={shown} aria-valuemin={0} aria-valuemax={total} aria-busy={!ready} data-testid="xp-progress-bar">
          {segments.map((i) => (
            <m.div
              key={`segment-${i}`}
              className={cn(
                'flex-1 h-3.5 rounded-md border-2 border-black overflow-hidden',
                i < shown ? '' : 'bg-black/40'
              )}
              initial={false}
              animate={i < shown ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 0.3, delay: i * 0.1 }}
            >
              {i < shown && (
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
          {countdown === null ? '--:--:--' : formatTimeHHMMSS(countdown)}
        </p>
      </div>
    </m.div>
  );
}
