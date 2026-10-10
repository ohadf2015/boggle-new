'use client';

import { Flame } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { LessonStep } from '@/lib/tutorial/lesson/lessonEngine';
import type { LessonEvent } from './useLesson';
import { LessonTarget } from './LessonTarget';
import s from './lesson.module.css';

export interface LessonHudProps {
  steps: readonly LessonStep[];
  completedCount: number;
  step: LessonStep | null;
  /** The word the hand is showing for this step, if any. */
  target: string | null;
  targetPath: ReadonlyArray<{ row: number; col: number }> | null;
  formedWord: string;
  event: LessonEvent | null;
  onSkip: () => void;
}

const RAYS = [0, 45, 90, 135, 180, 225, 270, 315];

/** Duolingo-style lesson header: skip, a fat progress bar that sparks on every step, and the live target. */
export function LessonHud({ steps, completedCount, step, target, targetPath, formedWord, event, onSkip }: LessonHudProps) {
  const { t, dir } = useLanguage();
  const total = steps.length;
  const pct = Math.round((Math.min(completedCount, total) / total) * 100);
  const streak = event?.kind === 'success' ? event.streak : 0;

  return (
    <div
      data-testid="lesson-hud"
      data-completed={completedCount}
      data-total={total}
      dir={dir}
      className="flex w-full flex-col gap-2"
    >
      <div className="flex items-center gap-2.5">

        <div className="relative flex-1">
          {streak >= 2 && (
            <span
              key={event?.key}
              data-testid="lesson-streak"
              className={cn(
                s.streakIn,
                'absolute -top-4 start-1 z-10 flex items-center gap-0.5 font-neo-display text-[11px] font-black uppercase tracking-wider text-neo-yellow',
              )}
            >
              <Flame className="h-3 w-3" strokeWidth={3} aria-hidden />
              {t('firstLesson.inARow', { count: streak })}
            </span>
          )}
          <div
            role="progressbar"
            aria-label={t('firstLesson.progressLabel')}
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={completedCount}
            className="relative h-5 overflow-visible rounded-full border-[3px] border-neo-black bg-black/60 shadow-[3px_3px_0_#000]"
          >
            <div
              data-testid="lesson-progress-fill"
              className={cn(
                s.fill,
                s.fillShine,
                'absolute inset-y-0 start-0 rounded-full',
                streak >= 3 ? 'bg-neo-yellow' : 'bg-neo-lime',
              )}
              style={{ inlineSize: `${pct}%` }}
            />
            {event?.kind === 'success' && (
              <span
                key={event.key}
                aria-hidden
                className="pointer-events-none absolute top-1/2 z-10 h-0 w-0"
                style={{ insetInlineStart: `${pct}%` }}
              >
                <span className={cn(s.spark, 'absolute left-0 top-0 block h-7 w-7 rounded-full bg-neo-yellow [clip-path:polygon(50%_0,61%_35%,98%_35%,68%_57%,79%_91%,50%_70%,21%_91%,32%_57%,2%_35%,39%_35%)]')} />
                {RAYS.map((a) => (
                  <span
                    key={a}
                    className={cn(s.ray, 'absolute -left-[2px] -top-[3px] block h-[7px] w-[4px] origin-bottom rounded-full bg-neo-lime')}
                    style={{ ['--a' as string]: `${a}deg`, ['--d' as string]: '22px' }}
                  />
                ))}
              </span>
            )}
          </div>
        </div>

        <span
          dir="ltr"
          className="shrink-0 rounded-md border-2 border-neo-black bg-neo-cream px-1.5 py-0.5 font-neo-display text-xs font-black tabular-nums text-neo-black shadow-[2px_2px_0_#000]"
        >
          {Math.min(completedCount + (step ? 1 : 0), total)}/{total}
        </span>
        <button
          type="button"
          onClick={onSkip}
          aria-label={t('firstLesson.skipLabel')}
          className="shrink-0 rounded-md px-1.5 py-1 font-neo-display text-xs font-black uppercase tracking-wider text-neo-cream/60 transition-colors hover:bg-white/10 hover:text-neo-cream"
        >
          {t('firstLesson.skip')}
        </button>
      </div>

      {step && <LessonTarget step={step} target={target} path={targetPath} formedWord={formedWord} oops={event?.kind === 'oops' ? event.key : null} />}
    </div>
  );
}

export default LessonHud;
