/**
 * Live Vocab Quiz — the student's verdict, as one strip.
 *
 * It sits UNDER the answer grid, in flow: the grid gives up height so the
 * right tile stays readable — the old overlay covered the answer it revealed.
 *
 * Dark-only surface; the resting state is fully painted and the entrance is a
 * short slide on a small element, never a fullscreen opacity tween (Class 5).
 */

'use client';

import type { CSSProperties } from 'react';
import { Check, Flame, Sparkles, X } from 'lucide-react';
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
  /** What this answer earned; shown only on a right answer. */
  points?: number | null;
  /** The student's live streak after this answer. */
  streak?: number;
  t: TranslateFn;
}

const SPARKS: ReadonlyArray<{ x: number; y: number; fill: string }> = [
  { x: 64, y: 0, fill: 'bg-neo-yellow' },
  { x: 46, y: -30, fill: 'bg-neo-pink' },
  { x: 8, y: -34, fill: 'bg-neo-cyan' },
  { x: -34, y: -26, fill: 'bg-neo-white' },
  { x: -44, y: 4, fill: 'bg-neo-yellow' },
  { x: -30, y: 30, fill: 'bg-neo-pink' },
  { x: 12, y: 34, fill: 'bg-neo-cyan' },
  { x: 50, y: 28, fill: 'bg-neo-white' },
];

function VerdictBurst() {
  return (
    <span
      data-testid="vocab-quiz-verdict-burst"
      aria-hidden
      className="pointer-events-none absolute start-8 top-1/2 size-0 motion-reduce:hidden"
    >
      {SPARKS.map((spark, i) => (
        <span
          key={i}
          className={cn(
            'absolute -start-1.5 -top-1.5 size-3 rounded-[2px] border-2 border-neo-black animate-feedback-spark',
            spark.fill
          )}
          style={{ '--spark-x': `${spark.x}px`, '--spark-y': `${spark.y}px` } as CSSProperties}
        />
      ))}
    </span>
  );
}

export function VocabQuizRevealBanner({
  correct,
  answer,
  word,
  definition,
  sweep,
  points,
  streak = 0,
  t,
}: VocabQuizRevealBannerProps) {
  const tone = correct
    ? 'bg-neo-lime text-neo-black'
    : correct === false
      ? 'bg-neo-red text-neo-black'
      : 'bg-neo-purple text-neo-black';

  return (
    <div className="shrink-0 flex flex-col gap-2 animate-neo-pop" role="status">
      {sweep && (
        <div className="flex items-center gap-2 rounded-neo border-[2px] border-neo-black bg-neo-yellow px-3 py-1.5 text-neo-black shadow-hard">
          <Sparkles className="w-5 h-5 shrink-0" aria-hidden />
          <span className="font-neo-display font-black text-sm uppercase tracking-wide">
            {t('vocabQuiz.sweep.title')}
          </span>
        </div>
      )}

      <div
        data-testid="vocab-quiz-verdict"
        className={cn(
          'relative overflow-hidden flex items-center gap-3 rounded-neo border-[3px] border-neo-black px-3 py-2.5 shadow-hard-lg',
          'font-neo-display font-black',
          correct === false && 'animate-neo-shake motion-reduce:animate-none',
          tone
        )}
      >
        {correct && <VerdictBurst />}
        <span className="grid place-items-center w-10 h-10 shrink-0 rounded-full border-[3px] border-neo-black bg-neo-white text-neo-black">
          {correct ? <Check className="w-6 h-6" strokeWidth={3.5} aria-hidden /> : <X className="w-6 h-6" strokeWidth={3.5} aria-hidden />}
        </span>
        <span className="flex-1 min-w-0 break-words text-lg leading-tight">
          {correct
            ? t('vocabQuiz.correctShort')
            : correct === false
              ? t('vocabQuiz.feedback.wrong', { answer })
              : t('vocabQuiz.feedback.noAnswer', { answer })}
          {correct && streak >= 2 && (
            <span
              data-testid="vocab-quiz-verdict-streak"
              className="mt-0.5 flex items-center gap-1 text-xs font-bold uppercase tracking-wide"
            >
              <Flame className="w-4 h-4 shrink-0 text-neo-orange" aria-hidden />
              {t('eg2Modes.feedback.streak', { count: streak })}
            </span>
          )}
        </span>
        {correct && typeof points === 'number' && points > 0 && (
          <span
            data-testid="vocab-quiz-verdict-points"
            className="shrink-0 rounded-neo border-[3px] border-neo-black bg-neo-white px-2 py-0.5 text-2xl leading-none tabular-nums text-neo-black shadow-hard-sm"
          >
            +{points}
          </span>
        )}
      </div>

      {definition && (
        <p className="rounded-neo border-[2px] border-neo-cream bg-neo-navy-elevated px-3 py-1.5 text-sm font-neo-body text-neo-white/85 shadow-hard-sm line-clamp-2">
          <span className="font-bold text-neo-cyan">{word}</span>
          <span className="mx-1">—</span>
          {definition}
        </p>
      )}
    </div>
  );
}

export default VocabQuizRevealBanner;
