/**
 * Live Vocab Quiz — the beat between questions.
 *
 * Blooket spends this beat on a flat "Get Ready / 3". Three seconds is enough
 * to make the class lean in if you give them something to guess at, so this one
 * teases the word they are about to meet: its initial and how many letters it
 * runs to. A room reads `B _ _ _ _ _ _` and starts shouting guesses before the
 * question is even up — which is the whole point of a projector.
 *
 * On the last question there is no next word, so it promises final scores
 * instead of teasing one that does not exist.
 *
 * Motion is a scale/pop on an already-painted panel, never a fullscreen
 * opacity-from-zero tween (Class 5 in .claude/rules/60-recurring-pitfalls.md).
 */

'use client';

import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TranslateFn, VocabQuizNextHint } from '@/shared/types/vocabQuiz';

export interface VocabQuizNextUpProps {
  /** Whole seconds still owed on the reveal beat. */
  secondsLeft: number;
  hint: VocabQuizNextHint | null;
  isLast: boolean;
  t: TranslateFn;
}

/** Cap the blanks so a long compound word cannot overflow the strip. */
const MAX_BLANKS = 11;

export function VocabQuizNextUp({ secondsLeft, hint, isLast, t }: VocabQuizNextUpProps) {
  const whole = Math.ceil(secondsLeft);
  if (whole <= 0) return null;

  const blanks = hint ? Math.min(MAX_BLANKS, Math.max(0, hint.length - 1)) : 0;

  return (
    <div
      className={cn(
        'flex items-center gap-5 rounded-neo border-[2px] border-neo-black px-5 py-4 shadow-hard',
        isLast ? 'bg-neo-yellow text-neo-black' : 'bg-neo-navy-elevated text-neo-white'
      )}
      role="status"
    >
      <span
        // Keyed on the second so each number pops in on its own.
        key={whole}
        data-testid="vocab-quiz-next-count"
        className={cn(
          'grid place-items-center w-16 h-16 shrink-0 rounded-neo border-[2px] border-neo-black',
          'font-neo-display font-black text-4xl tabular-nums animate-neo-pop',
          isLast ? 'bg-neo-black text-neo-yellow' : 'bg-neo-cyan text-neo-black'
        )}
      >
        {whole}
      </span>

      {isLast || !hint ? (
        <span className="flex items-center gap-3 font-neo-display font-bold text-3xl">
          <Trophy className="w-9 h-9 shrink-0" aria-hidden />
          {t('vocabQuiz.nextUp.finalScores')}
        </span>
      ) : (
        <div className="flex flex-col gap-1 min-w-0">
          <span className="font-neo-body text-sm uppercase tracking-widest text-neo-cyan">
            {t('vocabQuiz.nextUp.label')}
          </span>
          <span
            data-testid="vocab-quiz-next-tease"
            className="flex items-end gap-1.5 font-neo-display font-black text-4xl leading-none"
            aria-label={t('vocabQuiz.nextUp.tease', { letter: hint.letter, count: hint.length })}
          >
            <span aria-hidden className="text-neo-orange">
              {hint.letter}
            </span>
            {Array.from({ length: blanks }, (_, i) => (
              <span
                key={i}
                data-blank=""
                aria-hidden
                className="inline-block w-5 h-1.5 rounded-neo-sm bg-neo-white/40"
              />
            ))}
          </span>
        </div>
      )}
    </div>
  );
}

export default VocabQuizNextUp;
