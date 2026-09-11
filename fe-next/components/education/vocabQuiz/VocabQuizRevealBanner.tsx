/**
 * Live Vocab Quiz — the student's verdict, as one strip.
 *
 * This used to be four stacked blocks below the answers — verdict, a prose
 * points breakdown, the definition, and the top three — which on a 390×844
 * phone pushed the round off the bottom of the screen. It is now a single strip
 * that sits OVER the answer grid, so the layout height never changes between
 * question and reveal and nothing has to scroll.
 *
 * The points are gone from the words entirely: they fly into the header counter
 * instead. What is left is the one thing worth reading in a three-second beat —
 * right or wrong, and what the word actually means.
 *
 * Dark-only surface; the resting state is fully painted and the entrance is a
 * short slide on a small element, never a fullscreen opacity tween (Class 5).
 */

'use client';

import { Check, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TranslateFn } from '@/shared/types/vocabQuiz';

export interface VocabQuizRevealBannerProps {
  /** Null when the student never answered in time. */
  correct: boolean | null;
  /** The right answer, shown only when they missed it. */
  answer: string;
  word: string;
  definition?: string;
  /** Every student answered and every one was right. */
  sweep: boolean;
  t: TranslateFn;
}

export function VocabQuizRevealBanner({
  correct,
  answer,
  word,
  definition,
  sweep,
  t,
}: VocabQuizRevealBannerProps) {
  const tone = correct
    ? 'bg-neo-lime text-neo-black'
    : correct === false
      ? 'bg-neo-red text-neo-black'
      : 'bg-neo-purple text-neo-black';

  return (
    <div
      className="absolute inset-x-0 bottom-0 flex flex-col gap-2 animate-neo-pop"
      role="status"
    >
      {sweep && (
        <div className="flex items-center gap-2 rounded-neo border-[2px] border-neo-black bg-neo-yellow px-3 py-2 text-neo-black shadow-hard">
          <Sparkles className="w-5 h-5 shrink-0" aria-hidden />
          <span className="font-neo-display font-black text-sm uppercase tracking-wide">
            {t('vocabQuiz.sweep.title')}
          </span>
        </div>
      )}

      <div
        className={cn(
          'flex items-center gap-2 rounded-neo border-[2px] border-neo-black px-3 py-2.5 shadow-hard',
          'font-neo-display font-bold',
          tone
        )}
      >
        {correct ? (
          <Check className="w-6 h-6 shrink-0" aria-hidden />
        ) : (
          <X className="w-6 h-6 shrink-0" aria-hidden />
        )}
        <span className="flex-1 break-words">
          {correct
            ? t('vocabQuiz.correctShort')
            : correct === false
              ? t('vocabQuiz.feedback.wrong', { answer })
              : t('vocabQuiz.feedback.noAnswer', { answer })}
        </span>
      </div>

      {definition && (
        <p className="rounded-neo border-[2px] border-neo-black bg-neo-navy-elevated px-3 py-2 text-sm font-neo-body text-neo-white/85 shadow-hard-sm">
          <span className="font-bold text-neo-cyan">{word}</span>
          <span className="mx-1">—</span>
          {definition}
        </p>
      )}
    </div>
  );
}

export default VocabQuizRevealBanner;
