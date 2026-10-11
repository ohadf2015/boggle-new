'use client';

import { Check, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { LessonEvent } from './useLesson';
import s from './lesson.module.css';
import { LESSON_LANE_H } from './lessonLane';

export interface LessonSheetProps {
  event: LessonEvent | null;
  /** Shown on a miss so the player always knows what to try next. */
  retryWord: string | null;
  /** What the found word scored, stamped on the banner. */
  points?: number;
}

const PRAISE = ['nice', 'great', 'awesome', 'amazing'] as const;
const CONFETTI = Array.from({ length: 16 }, (_, i) => i);
const CONFETTI_COLORS = ['#bfff00', '#00ffff', '#ff1493', '#ffd60a', '#8b5cf6', '#fffef0'];

/** The feedback banner in the lane the game reserves for it: green for a win, pink for a miss. Appears whole; only its badge, title and confetti move. */
export function LessonSheet({ event, retryWord, points }: LessonSheetProps) {
  const { t, dir } = useLanguage();
  if (!event) return null;
  const win = event.kind === 'success';
  const title = win ? t(`firstLesson.praise.${PRAISE[Math.min(event.stepIndex, PRAISE.length - 1)]}`) : t('firstLesson.oops');
  const detail = win
    ? t('firstLesson.found', { word: event.word.toUpperCase() })
    : [event.message, retryWord ? t('firstLesson.tryWord', { word: retryWord }) : null].filter(Boolean).join(' · ');

  return (
    <div
      key={event.key}
      data-testid="lesson-sheet"
      data-kind={event.kind}
      role="status"
      dir={dir}
      className={cn(
        LESSON_LANE_H,
        'pointer-events-none fixed inset-x-0 bottom-0 z-[90] flex flex-col justify-center border-t-[4px] border-neo-black [overflow-x:clip]',
        'pb-[env(safe-area-inset-bottom)]',
        win ? 'bg-neo-lime' : 'bg-neo-pink',
      )}
    >
      {win && (
        <div aria-hidden className="absolute inset-x-0 top-0 h-0">
          {CONFETTI.map((i) => (
            <span
              key={i}
              className={cn(s.confetti, 'absolute top-0 block h-3 w-2 rounded-[2px] border border-neo-black')}
              style={{
                left: `${6 + ((i * 37) % 88)}%`,
                background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                ['--x' as string]: `${((i % 5) - 2) * 22}px`,
                ['--y' as string]: `${-90 - ((i * 23) % 80)}px`,
                ['--r' as string]: `${(i % 2 ? 1 : -1) * (220 + i * 25)}deg`,
                ['--delay' as string]: `${(i % 4) * 30}ms`,
                ['--dur' as string]: `${950 + (i % 3) * 150}ms`,
              }}
            />
          ))}
        </div>
      )}
      <span aria-hidden className={cn(s.shine, 'absolute inset-y-0 start-0 w-16 bg-white/35')} />
      <div className="relative mx-auto flex w-full max-w-xl items-center gap-3.5 px-4">
        <span
          className={cn(
            s.badgePop,
            'grid h-12 w-12 shrink-0 place-items-center rounded-full border-[3px] border-neo-black bg-neo-cream shadow-[3px_3px_0_#000]',
            win ? 'text-neo-black' : 'text-neo-pink',
          )}
        >
          {win ? <Check className="h-7 w-7" strokeWidth={4} aria-hidden /> : <X className="h-7 w-7" strokeWidth={4} aria-hidden />}
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn(s.titleIn, 'font-neo-display text-[26px] font-black leading-none', win ? 'text-neo-black' : 'text-neo-white')}>
            {title}
          </p>
          {detail && (
            <p className={cn('mt-1 truncate font-neo-body text-[15px] font-bold leading-tight', win ? 'text-neo-black/75' : 'text-neo-white/90')}>
              {detail}
            </p>
          )}
        </div>
        {win && points != null && points > 0 && (
          <span
            data-testid="lesson-sheet-points"
            dir="ltr"
            className={cn(s.stamp, 'shrink-0 font-neo-display text-[26px] font-black leading-none text-neo-black [text-shadow:2px_2px_0_#fffef0]')}
          >
            +{points}
          </span>
        )}
      </div>
    </div>
  );
}

export default LessonSheet;
