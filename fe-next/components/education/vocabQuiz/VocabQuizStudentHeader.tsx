/**
 * Live Vocab Quiz — the student's header.
 *
 * Three jobs in 44 pixels of a 390px phone: where we are in the round, how hot
 * the student is, and what they are worth. Lexi sits at the start of it and
 * reacts — thinking while the clock runs, holding her breath once you lock in,
 * cheering, wincing, on fire at three, mindblown at five. Blooket's question
 * screen has no character on it at all; this is the surface that makes the quiz
 * feel like it is being played WITH someone.
 *
 * The flame grows with the streak and is capped (`flameScale`) so a long run
 * cannot push the score out of the header.
 *
 * Dark-only surface: colours are hardcoded against `bg-neo-navy` (Class 5).
 */

'use client';

import { Flame } from 'lucide-react';
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
  /** How many classmates have committed on this question, if known. */
  lockedIn: { locked: number; total: number } | null;
  /** Where this student sits in the room — shown between questions. */
  rank: { position: number; total: number } | null;
  t: TranslateFn;
}

export function VocabQuizStudentHeader({
  questionNumber,
  totalQuestions,
  streak,
  score,
  pop,
  mascot,
  lockedIn,
  rank,
  t,
}: VocabQuizStudentHeaderProps) {
  const scale = flameScale(streak);
  const hasFlame = scale > 0;
  // 20px at a streak of two, up to 32px at twelve and beyond.
  const flamePx = 20 + Math.round(scale * 12);

  return (
    // `pe-11` reserves the end corner for the app's floating MUTE button. Once
    // the quiz claims the screen the app chrome collapses and that 40px control
    // stays behind as a fixed overlay — measured at 390x844, it landed squarely
    // on the score and on the "+points" chip flying into it.
    <header className="flex items-center gap-2 shrink-0 pe-11">
      <InteractiveMascot
        variant={mascot}
        sizeClassName="w-11 h-11"
        clipShape="circle"
        clipBorder="cyan"
        clipBg="var(--neo-navy-elevated, #1b2340)"
        animated
        // A reaction, not a control: a tappable thing sitting inches from four
        // answer tiles is a mis-tap waiting to happen on a phone, and its hover
        // swap would fight the face the round is trying to show.
        enableHover={false}
        enableClick={false}
        alt={t('vocabQuiz.mascot.alt')}
        className="shrink-0"
      />

      <div className="flex flex-col min-w-0">
        <span className="font-neo-display font-bold text-xs leading-tight text-neo-white/70 truncate">
          {t('vocabQuiz.progress', { current: questionNumber || 1, total: totalQuestions || 1 })}
        </span>
        {/* One line, two jobs: while the clock runs it is the room committing
            around you; between questions it is where you stand. Both matter,
            neither is worth a second row on a 390px phone. */}
        {lockedIn && lockedIn.total > 0 ? (
          <span className="font-neo-body text-[11px] leading-tight text-neo-cyan tabular-nums">
            {t('vocabQuiz.lockedInCount', { locked: lockedIn.locked, total: lockedIn.total })}
          </span>
        ) : rank ? (
          <span className="font-neo-body text-[11px] leading-tight text-neo-yellow tabular-nums">
            {t('vocabQuiz.rank', { position: rank.position, total: rank.total })}
          </span>
        ) : null}
      </div>

      {hasFlame && (
        <span
          // Keyed on the streak so every increment re-pops the flame — the
          // growth is the reward, so it has to be visible the moment it happens.
          key={streak}
          className="flex items-center gap-0.5 text-neo-orange font-neo-display font-black animate-neo-pop"
          aria-label={t('vocabQuiz.streak.label', { count: streak })}
        >
          <Flame style={{ width: flamePx, height: flamePx }} aria-hidden />
          <span className={cn('tabular-nums', streak >= 5 ? 'text-xl' : 'text-base')}>{streak}</span>
        </span>
      )}

      <VocabQuizScoreCounter score={score} pop={pop} t={t} className="ms-auto text-xl" />
    </header>
  );
}

export default VocabQuizStudentHeader;
