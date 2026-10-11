'use client';

import { Check, Flame, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { LessonEvent } from './useLesson';
import s from './lesson.module.css';

export interface LessonSheetProps {
  event: LessonEvent | null;
  /** Shown on a miss so the player always knows what to try next. */
  retryWord: string | null;
}

const PRAISE = ['nice', 'great', 'awesome', 'amazing'] as const;
const CONFETTI = Array.from({ length: 16 }, (_, i) => i);
const CONFETTI_COLORS = ['#bfff00', '#00ffff', '#ff1493', '#ffd60a', '#8b5cf6', '#fffef0'];

/** The bottom feedback sheet: slides up on every step, green for a win, pink for a miss. */
export function LessonSheet({ event, retryWord }: LessonSheetProps) {
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
        s.sheetUp,
        'pointer-events-none fixed inset-x-0 bottom-0 z-[90] border-t-[4px] border-neo-black',
        'pb-[max(1rem,env(safe-area-inset-bottom))] pt-4',
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
      <div className="mx-auto flex w-full max-w-xl items-center gap-3 px-4">
        <span
          className={cn(
            s.badgePop,
            'grid h-14 w-14 shrink-0 place-items-center rounded-full border-[3px] border-neo-black bg-neo-cream shadow-[3px_3px_0_#000]',
            win ? 'text-neo-black' : 'text-neo-pink',
          )}
        >
          {win ? <Check className="h-8 w-8" strokeWidth={4} aria-hidden /> : <X className="h-8 w-8" strokeWidth={4} aria-hidden />}
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn(s.titleIn, 'font-neo-display text-[28px] font-black leading-none', win ? 'text-neo-black' : 'text-neo-white')}>
            {title}
          </p>
          {detail && (
            <p className={cn('mt-1 truncate font-neo-body text-sm font-bold', win ? 'text-neo-black/75' : 'text-neo-white/90')}>
              {detail}
            </p>
          )}
        </div>
        {win && event.streak >= 2 && (
          <span
            data-testid="lesson-sheet-streak"
            className={cn(
              s.streakIn,
              'flex shrink-0 items-center gap-1 rounded-lg border-[3px] border-neo-black bg-neo-black px-2 py-1 font-neo-display text-sm font-black uppercase text-neo-yellow',
            )}
          >
            <Flame className="h-4 w-4" strokeWidth={3} aria-hidden />
            <span dir="ltr">×{event.streak}</span>
          </span>
        )}
      </div>
    </div>
  );
}

export default LessonSheet;
