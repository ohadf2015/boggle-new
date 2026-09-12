/**
 * Live Vocab Quiz — what the student takes home.
 *
 * Measured live at 390x844 on a perfect round: the recap and the podium filled
 * the top half of the phone and the bottom 40% was empty navy. The round spends
 * ten questions building a streak and then drops it at the whistle — the same
 * payoff cliff, one surface over, that a blind critic called disqualifying.
 *
 * So the bottom of the screen belongs to the two things the student earned and
 * the scoreboard cannot show: how long their best run was, and whether they
 * went clean. Lexi is here at full size rather than as the 44px chip in the
 * header, because this is the one moment in the round with room for her.
 *
 * Dark-only surface: colours are hardcoded against `bg-neo-navy` (Class 5 in
 * .claude/rules/60-recurring-pitfalls.md), and the resting state is fully
 * painted — no fullscreen opacity tween on arrival.
 */

'use client';

import { Flame, Sparkles } from 'lucide-react';
import { InteractiveMascot } from '@/components/ui/InteractiveMascot';
import type { TranslateFn } from '@/shared/types/vocabQuiz';
import { isPerfectRound } from './vocabQuizJuice';

export interface VocabQuizOwnFinaleProps {
  /** How many this student got right. */
  correct: number;
  /** How many were asked. */
  total: number;
  /** The longest run they reached, not the one they ended on. */
  bestStreak: number;
  t: TranslateFn;
}

/** Below two, "a streak" is just an answer — nothing to put a flame on. */
const STREAK_WORTH_SHOWING = 2;

export function VocabQuizOwnFinale({ correct, total, bestStreak, t }: VocabQuizOwnFinaleProps) {
  const perfect = isPerfectRound({ correctCount: correct, totalQuestions: total });
  const showStreak = bestStreak >= STREAK_WORTH_SHOWING;

  return (
    <div
      data-testid="vocab-quiz-own-finale"
      // `grow shrink-0`, not `mt-auto`: the block absorbs whatever height the
      // recap and the podium leave instead of being pinned to the bottom edge
      // with a void above it (measured at 390x844 with a one-player room), and
      // it still never squeezes below its own content in a thirty-name room.
      className="grow shrink-0 flex items-center gap-3 rounded-neo border-[3px] border-neo-cream bg-neo-navy-elevated p-3 shadow-hard"
    >
      <InteractiveMascot
        variant={perfect ? 'celebration' : 'trophy'}
        sizeClassName="w-24 h-24"
        clipShape="rounded-square"
        clipBorder="cyan"
        clipBg="var(--neo-navy, #12172b)"
        animated
        // A reaction, not a control — see VocabQuizStudentHeader.
        enableHover={false}
        enableClick={false}
        alt={t('vocabQuiz.finished.mascotAlt')}
        className="shrink-0"
      />

      <div className="flex flex-col gap-2 min-w-0">
        {perfect && (
          <span
            data-testid="vocab-quiz-perfect"
            className="inline-flex items-center gap-1.5 self-start rounded-neo border-[2px] border-neo-black bg-neo-yellow px-3 py-1.5 font-neo-display font-black uppercase tracking-wide text-neo-black shadow-hard-sm"
          >
            <Sparkles className="w-5 h-5 shrink-0" aria-hidden />
            {t('vocabQuiz.finished.perfect')}
          </span>
        )}

        {showStreak && (
          <span className="inline-flex items-center gap-1.5 self-start rounded-neo border-[2px] border-neo-black bg-neo-orange px-3 py-1.5 font-neo-display font-bold text-neo-black shadow-hard-sm">
            <Flame className="w-5 h-5 shrink-0" aria-hidden />
            <span className="tabular-nums">
              {t('vocabQuiz.finished.bestStreak', { count: bestStreak })}
            </span>
          </span>
        )}

        <span className="font-neo-body text-sm text-neo-cream">
          {t('vocabQuiz.finished.correctOf', { correct, total })}
        </span>
      </div>
    </div>
  );
}

export default VocabQuizOwnFinale;
