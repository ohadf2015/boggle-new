/** The question card's countdown is a ring, not a bar, so the round bar up top stays the only track on screen. */

'use client';

import { m } from 'framer-motion';
import { Hourglass } from 'lucide-react';
import { cn } from '@/lib/utils';
import { scoreAnswer } from '@/lib/education/vocabQuizScoring';
import type { TranslateFn } from '@/shared/types/vocabQuiz';
import { EDU_MOTION, useReducedMotionSafe } from '@/components/education/motion';

const RING_R = 21;
const RING_C = 2 * Math.PI * RING_R;

export interface StakesClock {
  secondsLeft: number;
  fractionLeft: number;
  urgent: boolean;
  ticking: boolean;
}

export interface StakesPoints {
  now: number;
  floor: number;
}

export function stakesPoints({
  fractionLeft,
  limitMs,
  streak,
  speedScoring,
}: {
  fractionLeft: number;
  limitMs: number;
  streak: number;
  speedScoring: boolean;
}): StakesPoints {
  const at = (left: number) =>
    scoreAnswer({ correct: true, elapsedMs: limitMs * (1 - left), limitMs, streakBefore: streak, speedScoring }).points;
  return { now: at(Math.max(0, Math.min(1, fractionLeft))), floor: at(0) };
}

export interface VocabQuizStakesMeterProps {
  clock: StakesClock;
  /** null once the student has locked in: their points are settled. */
  points: StakesPoints | null;
  /** The clock ran out before this student answered. */
  timeUp?: boolean;
  t: TranslateFn;
}

export function VocabQuizStakesMeter({ clock, points, timeUp = false, t }: VocabQuizStakesMeterProps) {
  const reduced = useReducedMotionSafe();
  const seconds = Math.max(0, Math.ceil(clock.secondsLeft));
  const left = Math.round(Math.max(0, Math.min(1, clock.fractionLeft)) * 100);
  const muted = !points && !clock.urgent;
  return (
    <div
      role="timer"
      data-urgent={String(clock.urgent)}
      aria-label={t('vocabQuiz.timeLeft', { seconds })}
      data-testid="vocab-quiz-stakes"
      className={cn(
        'flex shrink-0 flex-col items-center gap-1',
        clock.urgent ? 'text-neo-orange' : muted ? 'text-neo-white/60' : 'text-neo-lime'
      )}
    >
      <span className="relative grid size-14 place-items-center sm:size-[4.5rem] [@media(max-height:560px)]:size-12">
        <svg aria-hidden viewBox="0 0 48 48" className="absolute inset-0 size-full -rotate-90">
          <circle cx="24" cy="24" r={RING_R} fill="none" strokeWidth="5" className="stroke-neo-white/15" />
          <circle
            data-testid="vocab-quiz-stakes-fill"
            data-left={left}
            cx="24"
            cy="24"
            r={RING_R}
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={RING_C}
            strokeDashoffset={RING_C * (1 - left / 100)}
            className="transition-[stroke-dashoffset] duration-100 ease-linear motion-reduce:transition-none"
          />
        </svg>
        {timeUp ? (
          <Hourglass data-testid="vocab-quiz-stakes-timeup-icon" className="relative size-6 sm:size-7" strokeWidth={3} aria-hidden />
        ) : (
          <m.span
            key={clock.ticking && !reduced ? seconds : 'still'}
            data-testid="vocab-quiz-stakes-seconds"
            aria-hidden
            initial={clock.ticking && !reduced ? { scale: 1.35 } : false}
            animate={{ scale: 1 }}
            transition={EDU_MOTION.spring.pop}
            className="relative font-neo-display text-lg font-black tabular-nums leading-none sm:text-xl"
          >
            {seconds}
          </m.span>
        )}
      </span>
      {timeUp ? (
        <span data-testid="vocab-quiz-stakes-timeup" className="font-neo-display text-xs font-black leading-none sm:text-sm">
          {t('vocabQuiz.stakes.timeUp')}
        </span>
      ) : (
        points && (
          <span
            data-testid="vocab-quiz-stakes-now"
            dir="ltr"
            className="font-neo-display text-xs font-black leading-none tabular-nums sm:text-sm"
          >
            +{points.now}
          </span>
        )
      )}
    </div>
  );
}

export default VocabQuizStakesMeter;
