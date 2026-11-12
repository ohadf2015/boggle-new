/**
 * Live Vocab Quiz — the student's verdict, as one strip.
 *
 * It replaces the footer bar in place, in flow and at the footer's fixed
 * height, so the answer grid above it never moves at the reveal.
 *
 * Dark-only surface; the resting state is fully painted and the entrance is a
 * short slide on a small element, never a fullscreen opacity tween (Class 5).
 */

'use client';

import type { CSSProperties } from 'react';
import { m } from 'framer-motion';
import { Check, Flame, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TranslateFn } from '@/shared/types/vocabQuiz';
import { VocabQuizMascotFace } from './VocabQuizMascotFace';
import type { ExtendedMascotVariant } from '@/components/ui/mascotUtils';
import { EDU_MOTION } from '@/components/education/motion/tokens';
import { resolvePreset, useEduReducedMotion } from '@/lib/education/motion';
import { VocabQuizNextBeat } from './VocabQuizNextBeat';

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
  /** Length of the reveal beat; no next-word strip without it. */
  nextInMs?: number;
  /** Restarts the strip per question. */
  beatKey?: number | string;
  isLast?: boolean;
  paused?: boolean;
  /** Lexi's face for this verdict; the plain round icon shows without it. */
  mascot?: ExtendedMascotVariant;
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

function VerdictBadge({ correct }: { correct: boolean | null }) {
  const Icon = correct ? Check : X;
  return (
    <span
      data-testid="vocab-quiz-verdict-badge"
      data-verdict={correct ? 'correct' : correct === false ? 'wrong' : 'missed'}
      className={cn(
        'grid shrink-0 place-items-center rounded-full border-[3px] border-neo-black bg-neo-white text-neo-black shadow-hard-sm',
        'size-12 sm:size-14'
      )}
    >
      <Icon className="size-7" strokeWidth={3.5} aria-hidden />
    </span>
  );
}

function VerdictFace({ mascot, reduced, t }: { mascot: ExtendedMascotVariant; reduced: boolean; t: TranslateFn }) {
  return (
    <m.span
      // Keyed on the face so the beat-late reaction from the juice hook re-pops it.
      key={mascot}
      data-testid="vocab-quiz-verdict-mascot"
      initial={reduced ? false : { scale: 0.55, rotate: -10 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={EDU_MOTION.spring.pop}
      // Block, not inline: an inline span ignores size-* and the art spills out of the band.
      className="relative block size-14 shrink-0 sm:size-20"
    >
      <VocabQuizMascotFace face={mascot} className="size-full" border="white" alt={t('vocabQuiz.mascot.alt')} />
    </m.span>
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
  nextInMs,
  beatKey = 0,
  isLast = false,
  paused = false,
  mascot,
  t,
}: VocabQuizRevealBannerProps) {
  const tone = correct
    ? 'bg-neo-lime text-neo-black'
    : correct === false
      ? 'bg-neo-red text-neo-black'
      : 'bg-neo-purple text-neo-black';
  const reduced = useEduReducedMotion();
  const sheet = resolvePreset('sheetUp', reduced);

  return (
    <m.div
      data-testid="vocab-quiz-verdict-sheet"
      initial={sheet.initial}
      animate={sheet.animate}
      transition={sheet.transition}
      // Fills the footer slot it replaces, so nothing above it moves when the verdict lands.
      className={cn('h-full rounded-t-neo border-t-4 border-neo-black', tone)}
      role="status"
    >
      <div
        data-testid="vocab-quiz-verdict-row"
        className="mx-auto flex h-full min-h-0 w-full max-w-[960px] overflow-hidden flex-col justify-center gap-2 px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:gap-6 sm:px-6"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div
            data-testid="vocab-quiz-verdict"
            className={cn(
              // pe/pb leave room for the end-side face's hard shadow, which overflow-hidden would shave.
              'relative overflow-hidden flex shrink-0 items-center gap-3 sm:pe-1.5 sm:pb-1',
              'font-neo-display font-black',
              correct === false && 'animate-neo-shake motion-reduce:animate-none'
            )}
          >
            {correct && <VerdictBurst />}
            <VerdictBadge correct={correct} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <span className="min-w-0 break-words text-xl leading-tight sm:text-3xl">
                  {correct
                    ? t('vocabQuiz.correctShort')
                    : correct === false
                      ? t('vocabQuiz.feedback.wrong', { answer })
                      : t('vocabQuiz.feedback.noAnswer', { answer })}
                </span>
                {correct && typeof points === 'number' && points > 0 && (
                  <span
                    data-testid="vocab-quiz-verdict-points"
                    dir="ltr"
                    className="shrink-0 rounded-neo border-[3px] border-neo-black bg-neo-white px-2 py-0.5 text-xl leading-none tabular-nums text-neo-black shadow-hard-sm sm:px-3 sm:py-1 sm:text-2xl"
                  >
                    +{points}
                  </span>
                )}
              </span>
              {((correct && streak >= 2) || sweep) && (
                <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs font-black uppercase tracking-wider sm:text-sm">
                  {correct && streak >= 2 && (
                    <span data-testid="vocab-quiz-verdict-streak" className="flex items-center gap-1">
                      <Flame className="w-4 h-4 shrink-0 text-neo-orange" aria-hidden />
                      {t('eg2Modes.feedback.streak', { count: streak })}
                    </span>
                  )}
                  {sweep && (
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-4 h-4 shrink-0" aria-hidden />
                      {t('vocabQuiz.sweep.title')}
                    </span>
                  )}
                </span>
              )}
            </span>
            {mascot && (
              <span className="hidden sm:block">
                <VerdictFace mascot={mascot} reduced={reduced} t={t} />
              </span>
            )}
          </div>

          {definition && (
            <p className="font-neo-body text-sm font-semibold leading-snug line-clamp-1 sm:ps-[4.25rem] sm:text-base sm:line-clamp-2">
              <span className="font-black">{word}</span>
              <span className="mx-1">—</span>
              {definition}
            </p>
          )}
        </div>

        {typeof nextInMs === 'number' && nextInMs > 0 && (
          // Server-paced class: the Continue slot drains as a countdown instead of a button that would do nothing.
          <div
            data-testid="vocab-quiz-next-pill"
            className="flex h-11 w-full shrink-0 items-center rounded-neo border-[3px] border-b-[6px] border-neo-black bg-neo-lime px-4 font-neo-display uppercase text-neo-black shadow-hard-sm sm:h-14 sm:w-56"
          >
            <VocabQuizNextBeat
              nextInMs={nextInMs}
              beatKey={beatKey}
              isLast={isLast}
              paused={paused}
              reduced={reduced}
              t={t}
            />
          </div>
        )}
      </div>
    </m.div>
  );
}

export default VocabQuizRevealBanner;
