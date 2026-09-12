/**
 * Live Vocab Quiz — the finale on the wall.
 *
 * Round 2 ended the quiz on a trophy icon, a heading and a list, and a blind
 * critic called the payoff broken: "the number that mattered vanishes". A quiz
 * spends ten questions building tension; the wall has to spend it.
 *
 * So the last screen is three numbers that belong to the whole room — how much
 * of the class got it, how many words the room nailed, the longest run anyone
 * reached — with Lexi holding the trophy and the podium underneath. Blooket's
 * own end screen shows a ranked list and a coin total; this shows the class
 * something it did together, which is the part a teacher reads out loud.
 *
 * Dark-only surface: `bg-neo-navy` and `bg-neo-navy-elevated` are hardcoded,
 * never the cream/dark pair that flashes cream on a lazy mount (Class 5 in
 * .claude/rules/60-recurring-pitfalls.md). The card is fully painted at rest —
 * no fullscreen opacity tween — because this is the screen the whole room is
 * looking at and it may never be caught mid-fade.
 *
 * Border widths are written as `border-[3px]` beside the colour class on
 * purpose: `cn()`'s tailwind-merge config puts `border-neo` (width) in the same
 * group as `border-neo-<colour>`, so combining them silently drops the width
 * and Tailwind preflight renders the control borderless.
 */

'use client';

import { useEffect, useRef } from 'react';
import { Flame, Target, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InteractiveMascot } from '@/components/ui/InteractiveMascot';
import { fireVictoryConfetti } from '@/utils/confettiUtils';
import type { VocabQuizStanding, TranslateFn } from '@/shared/types/vocabQuiz';
import { classFinaleStats } from './vocabQuizJuice';
import { VocabQuizStandings } from './VocabQuizStandings';

export interface VocabQuizFinaleProps {
  standings: VocabQuizStanding[];
  totalQuestions: number;
  t: TranslateFn;
}

/** One class number. Accent FILL against navy is what makes it read as a tile. */
function StatTile({
  testId,
  icon,
  value,
  label,
  fill,
}: {
  testId: string;
  icon: React.ReactNode;
  value: string;
  label: string;
  fill: string;
}) {
  return (
    <div
      data-testid={testId}
      className={cn(
        'flex flex-col items-center justify-center gap-0.5 px-6 py-3 min-w-[9rem]',
        'rounded-neo border-[3px] border-neo-black shadow-hard text-neo-black',
        fill
      )}
    >
      <span className="flex items-center gap-2 font-neo-display font-black text-4xl leading-none tabular-nums">
        {icon}
        {value}
      </span>
      <span className="font-neo-body font-bold text-xs uppercase tracking-widest">{label}</span>
    </div>
  );
}

export function VocabQuizFinale({ standings, totalQuestions, t }: VocabQuizFinaleProps) {
  const stats = classFinaleStats(standings, totalQuestions);

  // One burst, on arrival. Latched in a ref rather than keyed on render, because
  // the standings object identity changes on every re-render of the shell above
  // and confetti that re-fires is confetti that never stops (Class 2).
  const burstRef = useRef(false);
  useEffect(() => {
    if (burstRef.current) return;
    burstRef.current = true;
    // No-ops under `prefers-reduced-motion` — the helper checks it itself.
    fireVictoryConfetti();
  }, []);

  return (
    <section
      data-testid="vocab-quiz-finale"
      className="flex-1 min-h-0 flex flex-col gap-5 overflow-hidden bg-neo-navy"
    >
      <div className="shrink-0 flex items-center gap-6 flex-wrap rounded-neo border-[3px] border-neo-cream bg-neo-navy-elevated p-5 shadow-hard">
        <div data-testid="quiz-finale-mascot" className="shrink-0">
          <InteractiveMascot
            variant="trophy"
            sizeClassName="w-28 h-28"
            clipShape="rounded-square"
            clipBorder="lime"
            clipBg="var(--neo-navy, #141a33)"
            animated
            enableHover={false}
            enableClick={false}
            alt={t('vocabQuiz.finished.mascotAlt')}
          />
        </div>

        <div className="min-w-0">
          <h2 className="flex items-center gap-3 font-neo-display font-black text-5xl leading-none text-neo-white">
            <Trophy className="w-11 h-11 shrink-0 text-neo-yellow" aria-hidden />
            {t('vocabQuiz.finished.title')}
          </h2>
          <p className="mt-2 font-neo-body font-bold text-xl text-neo-cream">
            {t('vocabQuiz.finished.subtitle', {
              questions: totalQuestions,
              players: stats.players,
            })}
          </p>
        </div>

        <div className="ms-auto flex items-center gap-3 flex-wrap">
          <StatTile
            testId="quiz-finale-accuracy"
            icon={<Target className="w-8 h-8 shrink-0" aria-hidden />}
            value={t('vocabQuiz.finished.percent', { percent: stats.accuracy })}
            label={t('vocabQuiz.finished.classAccuracy')}
            fill="bg-neo-cyan"
          />
          <StatTile
            testId="quiz-finale-words"
            icon={<Trophy className="w-8 h-8 shrink-0" aria-hidden />}
            value={String(stats.correct)}
            label={t('vocabQuiz.finished.wordsNailed')}
            fill="bg-neo-lime"
          />
          <StatTile
            testId="quiz-finale-streak"
            icon={<Flame className="w-8 h-8 shrink-0" aria-hidden />}
            value={String(stats.topStreak)}
            label={t('vocabQuiz.finished.topStreak')}
            fill="bg-neo-orange"
          />
        </div>
      </div>

      {/* The podium owns whatever height is left; nothing on this surface
          scrolls, so a room of thirty shows its top five and its class numbers
          rather than a list that runs off the bottom of the projector.
          Centred rather than top-pinned: measured at 1440x900, a two-player
          room left the bottom half of the wall empty and the payoff read as a
          screen that had failed to finish loading. */}
      <div
        data-testid="vocab-quiz-finale-stage"
        className="flex-1 min-h-0 overflow-hidden flex flex-col justify-center"
      >
        <VocabQuizStandings standings={standings} limit={5} size="projector" podium t={t} />
      </div>
    </section>
  );
}

export default VocabQuizFinale;
