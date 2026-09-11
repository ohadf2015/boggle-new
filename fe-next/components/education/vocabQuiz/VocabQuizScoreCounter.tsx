/**
 * Live Vocab Quiz — the score, as a counter.
 *
 * The old reveal explained a good answer in prose: "120 base · 30 for speed ·
 * 20 for your streak". Accurate, and nobody read it. The points now fly off the
 * answer into a number that rolls up, which is legible in the half-second a
 * student actually looks at their phone.
 *
 * The roll is deliberately short (≈560ms) — it has to finish inside the
 * three-second reveal, or the next question starts while the score is still
 * climbing and the student never sees what they earned.
 *
 * Under `prefers-reduced-motion` the number jumps and the chip simply appears:
 * the information is identical, only the travel is dropped.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { TranslateFn } from '@/shared/types/vocabQuiz';

export interface VocabQuizScorePop {
  points: number;
  /** Changes per scored answer, so a repeat of the same points re-animates. */
  key: number;
}

export interface VocabQuizScoreCounterProps {
  score: number;
  pop: VocabQuizScorePop | null;
  t: TranslateFn;
  className?: string;
}

const ROLL_MS = 560;
const STEP_MS = 40;

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function VocabQuizScoreCounter({ score, pop, t, className }: VocabQuizScoreCounterProps) {
  // Seeded with the mount value, never with zero: a student who refreshes
  // mid-round must not watch their whole score re-accumulate.
  const [shown, setShown] = useState(score);
  const shownRef = useRef(score);

  useEffect(() => {
    shownRef.current = shown;
  }, [shown]);

  useEffect(() => {
    const from = shownRef.current;
    if (from === score) return;
    if (prefersReducedMotion()) {
      setShown(score);
      return;
    }

    const steps = Math.max(1, Math.round(ROLL_MS / STEP_MS));
    let step = 0;
    const id = setInterval(() => {
      step += 1;
      if (step >= steps) {
        clearInterval(id);
        setShown(score);
        return;
      }
      setShown(Math.round(from + ((score - from) * step) / steps));
    }, STEP_MS);

    return () => clearInterval(id);
  }, [score]);

  const flying = pop && pop.points > 0 ? pop : null;

  return (
    <span className={cn('relative inline-flex items-baseline', className)}>
      <span
        data-testid="vocab-quiz-score"
        className="font-neo-display font-black tabular-nums text-neo-lime"
        aria-label={t('vocabQuiz.score.label', { score })}
      >
        {shown}
      </span>
      {flying && (
        <span
          key={flying.key}
          data-testid="vocab-quiz-score-pop"
          aria-hidden
          className={cn(
            'pointer-events-none absolute -top-5 end-0 whitespace-nowrap',
            'rounded-neo border-[2px] border-neo-black bg-neo-lime px-2 py-0.5',
            'font-neo-display font-black text-sm text-neo-black shadow-hard-sm',
            'animate-neo-pop'
          )}
        >
          +{flying.points}
        </span>
      )}
    </span>
  );
}

export default VocabQuizScoreCounter;
