'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { computeRollingRating, type AttemptRecord } from '@/lib/daily/rating';
import { useMemo } from 'react';

type TFunction = (
  path: string,
  fallbackOrParams?: string | Record<string, string | number>,
  paramsWhenFallback?: Record<string, string | number>,
) => string;

export interface MasteryRatingProps {
  attempts: AttemptRecord[];
  /** True while the attempt history is still being fetched (or the fetch failed).
   *  Renders the same card shell with a placeholder instead of popping in late
   *  or disappearing (rules/60 Class 1 / Class 4). */
  pending?: boolean;
  t: TFunction;
}

/**
 * Mastery Rating Display — shows rolling skill rating from attempt history
 *
 * Always visible (Chess.com Daily Puzzle rating is always on screen, even
 * before you've played): a day-one player with zero attempts sees a teaser
 * card, not nothing.
 *
 * Only Rating + Change are shown. A "Streak" field used to sit here too, but
 * it counted consecutive SOLVES within the rolling rating window — a
 * different number from the calendar-day login streak the hero already
 * shows a few pixels above, with no copy distinguishing the two. Deleted
 * rather than relabeled: two streak numbers on one screen is a bug users
 * report, not a feature.
 */
export function MasteryRating({ attempts, pending = false, t }: MasteryRatingProps) {
  const { language } = useLanguage();
  const isRtl = language === 'he';

  const rating = useMemo(() => computeRollingRating(attempts), [attempts]);

  // Day one / still loading / fetch failed: `computeRollingRating([])` returns
  // `current: 1000` as an internal identity value on a different scale than
  // the populated 0-100 average — rendering that as a real number would show
  // "1000" that craters to "~100" the moment the player's first attempt
  // lands. Show a placeholder instead; the card shape stays identical so
  // nothing pops in or shifts layout once real data arrives.
  const isNew = !pending && attempts.length === 0;
  const showNumber = !pending && !isNew;
  const showChange = showNumber && rating.history.length > 0;

  const deltaStr = rating.delta >= 0
    ? `+${Math.round(rating.delta)}`
    : `${Math.round(rating.delta)}`;
  const deltaIsPositive = rating.delta >= 0;

  return (
    <div
      data-testid="mastery-rating"
      data-mastery-state={pending ? 'pending' : isNew ? 'new' : 'rated'}
      className="flex items-center gap-4 rounded-neo border-2 border-slate-700/50 bg-neo-navy-light/50 px-4 py-3"
    >
      {/* Rating */}
      <div className="flex flex-col items-center">
        <div className="text-[10px] font-black uppercase tracking-wider text-slate-300">
          {t('wordHunt.results.masteryRatingLabel', 'Rating')}
        </div>
        <div className="text-2xl font-black tabular-nums text-neo-cyan">
          {showNumber ? Math.round(rating.current) : '–'}
        </div>
      </div>

      {/* Change */}
      {showChange && (
        <div className="flex flex-col items-center">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-300">
            {t('wordHunt.results.masteryRatingChangeLabel', 'Change')}
          </div>
          <div
            className={`text-lg font-black tabular-nums ${
              deltaIsPositive ? 'text-neo-lime' : 'text-neo-pink'
            }`}
            dir={isRtl ? 'ltr' : undefined}
          >
            {deltaStr}
          </div>
        </div>
      )}

      {/* Day-one teaser */}
      {isNew && (
        <div className="text-xs font-medium text-slate-300">
          {t('wordHunt.results.masteryRatingTeaser', 'Play today to start your rating')}
        </div>
      )}
    </div>
  );
}
