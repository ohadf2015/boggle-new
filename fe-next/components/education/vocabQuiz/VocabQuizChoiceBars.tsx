/**
 * Live Vocab Quiz — the projector's answer bars.
 *
 * The one thing a room of thirty can all watch at once: four bars that fill in
 * as classmates commit, then settle into the answer. Blooket and Kahoot only
 * draw this once the question is over, so their middle eight seconds are a
 * static card. Here the wall is alive while the clock runs — the class can see
 * the room deciding without seeing what anyone decided was right.
 *
 * Two different denominators, on purpose:
 *  - LIVE (answerIndex null): each bar is measured against the whole class, so
 *    a first vote is a sliver, not a full bar that shrinks as others answer.
 *  - REVEAL: measured against the votes actually cast, which is the share a
 *    teacher wants ("two thirds fell for the second distractor").
 *
 * Dark-only surface, so `bg-neo-navy` is hardcoded (Class 5).
 */

'use client';

import { Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TranslateFn } from '@/shared/types/vocabQuiz';

/** One family per option, in the order students learn to expect. */
const OPTION_BARS = [
  { fill: 'bg-neo-lime', chip: 'bg-neo-lime text-neo-black', glyph: '▲' },
  { fill: 'bg-neo-pink', chip: 'bg-neo-pink text-neo-black', glyph: '●' },
  { fill: 'bg-neo-cyan', chip: 'bg-neo-cyan text-neo-black', glyph: '■' },
  { fill: 'bg-neo-purple', chip: 'bg-neo-purple text-neo-black', glyph: '◆' },
] as const;

export interface VocabQuizChoiceBarsProps {
  choices: string[];
  /** Votes per choice index. */
  distribution: number[];
  /** Everyone in the room, whether they answered or not. */
  totalPlayers: number;
  /** Null while the clock runs — the answer must not leak early. */
  answerIndex: number | null;
  /** Every student answered, and every one was right. */
  sweep: boolean;
  t: TranslateFn;
}

export function VocabQuizChoiceBars({
  choices,
  distribution,
  totalPlayers,
  answerIndex,
  sweep,
  t,
}: VocabQuizChoiceBarsProps) {
  const revealed = answerIndex !== null;
  const votes = distribution.reduce((a, b) => a + b, 0);
  const denominator = revealed ? Math.max(1, votes) : Math.max(1, totalPlayers);

  return (
    // The bars OWN the wall: `flex-1` plus `auto-rows-fr` below is what stops
    // the projector resting with 200px of dead navy under four short rows on a
    // 1440x900 screen. A classroom reads this from the back of the room.
    <div className="flex-1 flex flex-col gap-4 min-h-0">
      {sweep && (
        <div
          // Scale-in over an already-painted surface, never an opacity tween on
          // a large layer (Class 5). The resting state is fully painted.
          className="animate-neo-pop flex items-center gap-3 rounded-neo border-[2px] border-neo-black bg-neo-yellow px-5 py-3 text-neo-black shadow-hard"
          role="status"
        >
          <Sparkles className="w-8 h-8 shrink-0" aria-hidden />
          <span className="font-neo-display font-black text-3xl uppercase tracking-wide">
            {t('vocabQuiz.sweep.title')}
          </span>
          <span className="font-neo-body text-xl">{t('vocabQuiz.sweep.subtitle')}</span>
        </div>
      )}

      <ul className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 auto-rows-fr gap-4">
        {choices.map((choice, index) => {
          const style = OPTION_BARS[index % OPTION_BARS.length];
          const count = distribution[index] ?? 0;
          const share = count / denominator;
          const isCorrect = revealed && index === answerIndex;
          const faded = revealed && !isCorrect;

          return (
            <li
              key={`${index}-${choice}`}
              className={cn(
                'relative overflow-hidden rounded-neo border-[2px] border-neo-black bg-neo-navy-elevated shadow-hard',
                faded && 'opacity-60',
                isCorrect && 'ring-4 ring-neo-yellow'
              )}
            >
              {/* Which one was RIGHT, stated independently of how many picked
                  it. Measured live at 1440x900: a question the whole class
                  missed left the answer at 0% width, so the only thing marking
                  it on the wall was a thin ring. The vote bar stays honest —
                  the wash says "this one", the bar says "this many". */}
              {isCorrect && (
                <div
                  data-testid="vocab-quiz-answer-wash"
                  className="absolute inset-0 bg-neo-lime opacity-25"
                  aria-hidden
                />
              )}
              {/* The option's colour at zero votes. Without it the wall rests
                  as four near-black rectangles while the same four options are
                  full-bleed colour on every phone in the room — and that colour
                  is how a student matches the wall to the tile under their
                  thumb. Solid, never a tint; the vote bar grows over it. */}
              <div
                data-testid={`vocab-quiz-rail-${index}`}
                className={cn('absolute inset-y-0 start-0 w-3', style.fill)}
                aria-hidden
              />
              <div
                data-testid={`vocab-quiz-bar-${index}`}
                className={cn(
                  'absolute inset-y-0 start-0 transition-[width] duration-300 ease-out',
                  isCorrect ? cn(style.fill, 'opacity-55') : cn(style.fill, 'opacity-30')
                )}
                style={{ width: `${Math.min(1, share) * 100}%` }}
                aria-hidden
              />
              <div className="relative h-full flex items-center gap-4 px-5 py-4">
                <span
                  className={cn(
                    'grid place-items-center w-10 h-10 shrink-0 rounded-neo border-[2px] border-neo-black text-xl',
                    style.chip
                  )}
                  aria-hidden
                >
                  {style.glyph}
                </span>
                <span className="flex-1 font-neo-display font-bold text-2xl break-words">{choice}</span>
                {isCorrect && (
                  <Check data-testid="vocab-quiz-bar-correct" className="w-8 h-8 shrink-0 text-neo-yellow" aria-hidden />
                )}
                {count > 0 && (
                  <span className="shrink-0 font-neo-display font-bold text-2xl tabular-nums animate-neo-pop">
                    {count}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default VocabQuizChoiceBars;
