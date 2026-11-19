'use client';

import { useEduReducedMotion } from '@/lib/education/motion/useEduReducedMotion';
import { Medallion } from './chrome';
import { StreakFlame } from '@/components/streak/StreakFlame';

type T = (key: string, fallback?: string) => string;

/** The Academy's one day-streak flame: ember medallion that breathes when alive and burns hot when tonight is the last chance. */
export function StreakMark({ streak, atRisk = false, still, size, t }: { streak: number; atRisk?: boolean; still: boolean; size: number; t: T }) {
  const osReduced = useEduReducedMotion();
  const calm = still || !!osReduced;
  const alive = streak > 0;
  const warn = alive && atRisk;
  return (
    <span data-testid="academy-streak-flame" data-state={!alive ? 'none' : warn ? 'at-risk' : 'calm'} className="relative inline-flex">
      <span
        aria-hidden="true"
        className={`inline-flex ${alive ? '' : 'grayscale'}`}
        style={!calm && alive ? { animation: warn ? 'academy-flame-risk 0.9s ease-in-out infinite' : 'academy-flame-calm 2.6s ease-in-out infinite' } : undefined}
      >
        <Medallion tone="ember" size={size} shadow={1}>
          <StreakFlame days={streak} size={18} mood={warn ? 'worried' : 'happy'} animated={!calm && alive} />
        </Medallion>
      </span>
      {warn && (
        <>
          <span aria-hidden="true" className="absolute -top-1 -end-1 h-2.5 w-2.5 rounded-full border border-neo-black bg-neo-red" />
          <span className="sr-only">{t('academy.student.streakAtRiskAria', 'Your streak is in danger — play today to save it')}</span>
        </>
      )}
    </span>
  );
}
