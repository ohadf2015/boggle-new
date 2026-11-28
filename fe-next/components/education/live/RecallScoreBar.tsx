'use client';

import { Zap } from 'lucide-react';
import type { EduT } from '@/components/education/lobby/eduText';

interface RecallScoreBarProps {
  mastered: number;
  total: number;
  score: number;
  /** Points the last answer earned; 0 hides the float. */
  gained: number;
  /** Changes on every answer so the pop and float replay. */
  beat: number;
  multiplier: number;
  t: EduT;
}

export function RecallScoreBar({ mastered, total, score, gained, beat, multiplier, t }: RecallScoreBarProps) {
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <span data-testid="recall-progress" className="font-neo-display text-sm font-bold tabular-nums text-neo-cream/80 edu-sky:text-edu-ink/80">
          {t('eduStudent.recall.progress', { mastered, total })}
        </span>
        <div className="flex items-center gap-1.5">
          {multiplier >= 2 && (
            <span
              key={`x${multiplier}`}
              dir="ltr"
              data-testid="recall-multiplier"
              className="rounded-full border-2 border-neo-black bg-neo-pink px-2 py-0.5 font-neo-display text-sm font-black tabular-nums text-neo-black shadow-hard-sm motion-safe:animate-[recall-pop_240ms_cubic-bezier(0.23,1,0.32,1)_both]"
            >
              {t('eduStudent.recall.multiplier', { count: multiplier })}
            </span>
          )}
          <span className="relative">
            <span
              key={beat}
              dir="ltr"
              data-testid="recall-score"
              aria-label={t('eduStudent.recall.scoreLabel', { score })}
              className={
                'inline-flex min-w-16 items-center justify-center gap-1 rounded-full border-2 border-neo-black px-2.5 py-0.5 font-neo-display text-base font-black tabular-nums text-neo-black shadow-hard-sm ' +
                (gained > 0 ? 'bg-neo-lime motion-safe:animate-[recall-pop_220ms_cubic-bezier(0.23,1,0.32,1)_both]' : 'bg-neo-yellow')
              }
            >
              <Zap className="size-4 fill-neo-black" aria-hidden="true" />
              {score}
            </span>
            {gained > 0 && (
              <span
                key={`f${beat}`}
                dir="ltr"
                data-testid="recall-points-float"
                aria-hidden="true"
                className="pointer-events-none absolute -top-6 end-0 font-neo-display text-lg font-black tabular-nums text-neo-lime edu-sky:text-edu-lime-ink motion-safe:animate-[recall-float_280ms_cubic-bezier(0.23,1,0.32,1)_both]"
              >
                +{gained}
              </span>
            )}
          </span>
        </div>
      </div>
      <div aria-hidden="true" className="h-2.5 overflow-hidden rounded-full border-2 border-neo-cream/40 edu-sky:border-edu-line bg-neo-navy-light edu-sky:bg-edu-surface">
        <div className="h-full bg-neo-lime transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${total ? (mastered / total) * 100 : 0}%` }} />
      </div>
    </>
  );
}
