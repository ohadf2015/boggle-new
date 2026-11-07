'use client';

import { m } from 'framer-motion';
import { Gamepad2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatedNumber, EDU_MOTION, useReducedMotionSafe } from '@/components/education/motion';
import type { TeacherWeekSummary } from '@/lib/education/teacherWeekStats';
import { classesPlayedShare } from './weekPulse';

type T = (key: string, params?: Record<string, string | number>) => string;

const CHIP = 'inline-flex h-7 items-center gap-1 rounded-full border-2 border-neo-cream/50 bg-neo-navy-light px-2 shadow-hard font-neo-display text-sm font-black tabular-nums leading-none';
const RING_R = 7;

/** Phone stats row: the rail's week card is hidden below lg, so its two headline numbers ride the greeting row. */
export function HomeWeekChips({ summary, classCount, t, className }: { summary: TeacherWeekSummary; classCount: number; t: T; className?: string }) {
  const reduced = useReducedMotionSafe();
  const share = classesPlayedShare(summary.activeClasses, classCount);
  if (share.total === 0) return null;
  return (
    <div data-testid="home-week-chips" role="group" aria-label={t('eduShell.week.title')} className={cn('flex shrink-0 items-center gap-1.5', className)}>
      <span data-testid="home-week-chip-games" title={t('eduShell.week.games')} className={cn(CHIP, 'text-neo-cyan')}>
        <Gamepad2 className="size-4 shrink-0" strokeWidth={2.5} aria-hidden="true" />
        <AnimatedNumber to={summary.gamesPlayed} />
        <span className="sr-only">{t('eduShell.week.games')}</span>
      </span>
      <span data-testid="home-week-chip-classes" dir="ltr" title={t('eduShell.week.active')} className={cn(CHIP, 'text-neo-yellow')}>
        <span
          role="progressbar"
          aria-label={t('eduShell.week.active')}
          aria-valuemin={0}
          aria-valuemax={share.total}
          aria-valuenow={share.played}
          className="inline-flex"
        >
          <svg viewBox="0 0 18 18" className="size-[18px] -rotate-90" aria-hidden="true">
            <circle cx="9" cy="9" r={RING_R} fill="none" strokeWidth="3" stroke="currentColor" className="text-neo-cream/20" />
            {share.played > 0 ? <m.circle
              cx="9"
              cy="9"
              r={RING_R}
              fill="none"
              strokeWidth="3"
              strokeLinecap="round"
              stroke="currentColor"
              initial={reduced ? false : { pathLength: 0 }}
              animate={{ pathLength: share.fraction }}
              transition={reduced ? { duration: 0 } : { ...EDU_MOTION.spring.settle, delay: 0.25 }}
            /> : null}
          </svg>
        </span>
        <span>
          {share.played}
          <span className="text-xs text-neo-cream/60">/{share.total}</span>
        </span>
      </span>
    </div>
  );
}

export default HomeWeekChips;
