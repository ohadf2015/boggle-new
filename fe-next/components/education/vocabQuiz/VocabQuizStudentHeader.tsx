/**
 * Live Vocab Quiz — the student's header.
 *
 * While a question runs the row is X, the one round-progress bar and a single
 * score-and-clock cluster (`hud`), nothing else: Lexi reacts beside the
 * question and the streak lives in the footer band. Outside a question (the
 * finished screen) it falls back to Lexi, the labelled "3/8" count, the streak
 * flame and the labelled score.
 *
 * The flame grows with the streak and is capped (`flameScale`) so a long run
 * cannot push the score out of the header.
 *
 * Dark-only surface: colours are hardcoded against `bg-neo-navy` (Class 5).
 */

'use client';

import type { ReactNode } from 'react';
import { Flame, Star, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InteractiveMascot } from '@/components/ui/InteractiveMascot';
import type { ExtendedMascotVariant } from '@/components/ui/mascotUtils';
import type { TranslateFn } from '@/shared/types/vocabQuiz';
import { flameScale } from './vocabQuizJuice';
import { VocabQuizScoreCounter, type VocabQuizScorePop } from './VocabQuizScoreCounter';

export interface VocabQuizStudentHeaderProps {
  questionNumber: number;
  totalQuestions: number;
  streak: number;
  score: number;
  pop: VocabQuizScorePop | null;
  mascot: ExtendedMascotVariant;
  /** The round is over: there is no question left to be N of M. */
  finished?: boolean;
  /** Leaves the room; no button is drawn without it. */
  onExit?: () => void;
  /** Drops the header's own score when the screen draws it elsewhere. */
  hideScore?: boolean;
  /** Score-and-clock cluster for a running question: the row becomes X, bar, cluster and nothing else. */
  hud?: ReactNode;
  t: TranslateFn;
}

export function VocabQuizHudScore({ score, pop, t }: { score: number; pop: VocabQuizScorePop | null; t: TranslateFn }) {
  return (
    <span data-testid="vocab-quiz-hud-score" className="flex shrink-0 items-center gap-1 leading-none">
      <span className="sr-only">{t('vocabQuiz.hud.score')}</span>
      <Star className="size-5 shrink-0 fill-neo-lime text-neo-lime sm:size-6" strokeWidth={2.5} aria-hidden />
      <VocabQuizScoreCounter score={score} pop={pop} t={t} className="text-lg sm:text-2xl" />
    </span>
  );
}

export function VocabQuizStudentHeader({
  questionNumber,
  totalQuestions,
  streak,
  score,
  pop,
  mascot,
  finished = false,
  onExit,
  hideScore = false,
  hud,
  t,
}: VocabQuizStudentHeaderProps) {
  const playing = hud !== undefined;
  const scale = flameScale(streak);
  const hasFlame = scale > 0 && !playing;
  // 20px at a streak of two, up to 32px at twelve and beyond.
  const flamePx = 20 + Math.round(scale * 12);

  const total = Math.max(1, totalQuestions || 1);
  const done = finished ? total : Math.min(total, Math.max(1, questionNumber || 1));

  return (
    // `pe-11` reserves the end corner for the app's floating mute button, which overlapped the score at 390x844.
    <header className="mx-auto flex w-full max-w-[720px] shrink-0 items-center gap-2 pe-11 sm:gap-3">
      {onExit && (
        <button
          type="button"
          onClick={onExit}
          aria-label={t('vocabQuiz.exit')}
          className="grid size-11 shrink-0 place-items-center rounded-neo text-neo-white/70 transition-colors hover:bg-neo-navy-elevated hover:text-neo-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
        >
          <X className="size-7" strokeWidth={3} aria-hidden />
        </button>
      )}

      {!playing && (
        <InteractiveMascot
          variant={mascot}
          sizeClassName="w-11 h-11"
          clipShape="circle"
          clipBorder="cyan"
          clipBg="var(--neo-navy-elevated)"
          animated
          // A reaction, not a control: a tappable face inches from the answers is a mis-tap on a phone.
          enableHover={false}
          enableClick={false}
          alt={t('vocabQuiz.mascot.alt')}
          className="shrink-0"
        />
      )}

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-label={t('vocabQuiz.progress', { current: done, total })}
        className="h-5 min-w-0 flex-1 overflow-hidden rounded-full bg-neo-navy-elevated sm:h-6"
      >
        <div
          className="relative h-full rounded-full bg-neo-lime transition-[width] duration-500 ease-out motion-reduce:transition-none"
          style={{ width: `${(done / total) * 100}%` }}
        >
          <span
            data-testid="vocab-quiz-progress-stripe"
            aria-hidden
            className="absolute inset-x-2 top-[3px] h-1 rounded-full bg-neo-white/45 sm:h-1.5"
          />
        </div>
      </div>
      {!finished && !playing && (
        <span data-testid="vocab-quiz-hud-question" className="flex shrink-0 flex-col items-center leading-none">
          <span aria-hidden className="font-neo-body text-xs font-bold uppercase tracking-wider text-neo-white/60">
            {t('vocabQuiz.hud.question')}
          </span>
          <span
            data-testid="vocab-quiz-progress-count"
            aria-hidden
            className="font-neo-display text-lg font-black tabular-nums text-neo-white sm:text-xl"
          >
            {t('vocabQuiz.progressShort', { current: done, total })}
          </span>
        </span>
      )}

      {hasFlame && (
        <span
          // Keyed on the streak so every increment re-pops the flame.
          key={streak}
          className="flex items-center gap-0.5 text-neo-orange font-neo-display font-black animate-neo-pop motion-reduce:animate-none"
          aria-label={t('vocabQuiz.streak.label', { count: streak })}
        >
          <Flame style={{ width: flamePx, height: flamePx }} aria-hidden />
          <span className={cn('tabular-nums', streak >= 5 ? 'text-xl' : 'text-base')}>{streak}</span>
        </span>
      )}

      {playing ? hud : !hideScore && <VocabQuizHudScore score={score} pop={pop} t={t} />}
    </header>
  );
}

export default VocabQuizStudentHeader;
