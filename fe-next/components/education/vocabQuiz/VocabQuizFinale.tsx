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
import { Flame, RotateCcw, Target, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InteractiveMascot } from '@/components/ui/InteractiveMascot';
import { fireVictoryConfetti } from '@/utils/confettiUtils';
import { isRevealed } from '@/lib/education/roundEndStage';
import type { VocabQuizStanding, TranslateFn } from '@/shared/types/vocabQuiz';
import { classFinaleStats } from './vocabQuizJuice';
import { trackResultsAction } from '../results/trackResultsAction';
import { SchoolGlyph } from '../results/resultsGlyphs';
import { PodiumStage } from '../results/PodiumStage';
import { useRoundEndReveal } from '../results/useRoundEndReveal';

export interface VocabQuizFinaleProps {
  standings: VocabQuizStanding[];
  totalQuestions: number;
  /**
   * Same room, same code, same quiz — the host's `handleStartNewGame`, exactly
   * what the board rounds' projector rematch calls. Absent = no button: a quiz
   * produces no `classroomSummary`, so without this the wall ends on controls
   * that do nothing.
   */
  onPlayAgain?: () => void;
  /** Classroom host's confirmed exit to HQ; the finale's quiet way out. */
  onBackToClass?: () => void;
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
        'flex flex-col items-center justify-center gap-0.5 px-3 py-2 min-w-[6rem] md:px-6 md:py-3 md:min-w-[9rem]',
        'rounded-neo border-[3px] border-neo-black shadow-hard text-neo-black',
        fill
      )}
    >
      <span className="flex items-center gap-2 font-neo-display font-black text-2xl md:text-4xl leading-none tabular-nums">
        {icon}
        {value}
      </span>
      <span className="font-neo-body font-bold text-xs uppercase tracking-widest">{label}</span>
    </div>
  );
}

function RunnersUp({ players, t }: { players: VocabQuizStanding[]; t: TranslateFn }) {
  return (
    <ol
      data-testid="quiz-finale-runners-up"
      aria-label={t('vocabQuiz.standings.title')}
      className="shrink-0 flex flex-wrap items-center justify-center gap-2 md:gap-3"
    >
      {players.map((player, index) => (
        <li
          key={player.username}
          className="flex items-center gap-2 md:gap-3 rounded-neo border-[2px] border-neo-cream bg-neo-navy-elevated px-3 py-1.5 md:px-4 md:py-2 text-neo-white shadow-hard-sm"
        >
          <span className="grid size-7 md:size-9 shrink-0 place-items-center rounded-full border-[2px] border-neo-black bg-neo-cream font-neo-display font-black text-sm md:text-lg text-neo-black tabular-nums">
            {index + 4}
          </span>
          <bdi className="max-w-[12rem] truncate font-neo-display font-bold text-base md:text-2xl">{player.username}</bdi>
          {player.streak > 1 && (
            <span className="flex items-center gap-1 text-neo-orange text-sm md:text-lg" aria-label={t('vocabQuiz.streak.label', { count: player.streak })}>
              <Flame className="size-4 md:size-5" aria-hidden />
              {player.streak}
            </span>
          )}
          <span className="font-neo-display font-black text-lg md:text-2xl tabular-nums text-neo-cyan">{player.score}</span>
        </li>
      ))}
    </ol>
  );
}

export function VocabQuizFinale({ standings, totalQuestions, onPlayAgain, onBackToClass, t }: VocabQuizFinaleProps) {
  const stats = classFinaleStats(standings, totalQuestions);
  const celebrate = stats.correct > 0;
  const stage = useRoundEndReveal(celebrate);
  const winnerLanded = isRevealed(1, stage);
  const podium = standings.slice(0, 3).map((player, index) => ({
    username: player.username,
    score: player.score,
    rank: index + 1,
    detail: t('education.results.podium.correct', { count: player.correctCount }),
  }));
  const runnersUp = standings.slice(3, 5);

  // Latched in a ref: the standings identity changes on every shell re-render, and re-firing confetti never stops (Class 2).
  const burstRef = useRef(false);
  useEffect(() => {
    if (burstRef.current || !celebrate || !winnerLanded) return;
    burstRef.current = true;
    fireVictoryConfetti();
  }, [celebrate, winnerLanded]);

  return (
    <section
      data-testid="vocab-quiz-finale"
      className="flex flex-col gap-3 md:gap-4 md:flex-1 md:min-h-fit bg-neo-navy"
    >
      <div className="shrink-0 flex items-center gap-3 md:gap-6 flex-wrap rounded-neo border-[3px] border-neo-cream bg-neo-navy-elevated p-3 md:px-5 md:py-3 shadow-hard">
        <div data-testid="quiz-finale-mascot" className="shrink-0">
          <InteractiveMascot
            variant="trophy"
            sizeClassName="w-16 h-16 md:w-20 md:h-20 md:[@media(min-height:1000px)]:w-28 md:[@media(min-height:1000px)]:h-28"
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
          <h2 className="flex items-center gap-3 font-neo-display font-black text-3xl md:text-5xl leading-none text-neo-white">
            <Trophy className="w-8 h-8 md:w-11 md:h-11 shrink-0 text-neo-yellow" aria-hidden />
            {t('vocabQuiz.finished.title')}
          </h2>
          <p className="mt-2 font-neo-body font-bold text-base md:text-xl text-neo-cream">
            {t('vocabQuiz.finished.subtitle', {
              questions: totalQuestions,
              players: stats.players,
            })}
          </p>
        </div>

        <div className="md:ms-auto flex items-center gap-2 md:gap-3 flex-wrap">
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

      <div
        data-testid="vocab-quiz-finale-stage"
        className="flex flex-col justify-center gap-3 md:gap-4 md:flex-1 md:min-h-fit"
      >
        {podium.length > 0 && (
          <PodiumStage
            entries={podium}
            stage={stage}
            muted={!celebrate}
            t={t}
            className="w-[min(100%,calc((100dvh_-_28rem)*1.768))] min-w-[min(100%,20rem)]"
          />
        )}
        {runnersUp.length > 0 && isRevealed(4, stage) && <RunnersUp players={runnersUp} t={t} />}
      </div>

      <div className="shrink-0 flex flex-col items-stretch gap-3 lg:flex-row lg:items-stretch">
        {onPlayAgain && (
          <button
            type="button"
            data-testid="quiz-finale-play-again"
            onClick={() => {
              trackResultsAction('rematch', 'projector');
              onPlayAgain();
            }}
            className={cn(
              'w-full lg:flex-1 flex items-center justify-center gap-3 px-6 py-3 md:py-4',
              'font-neo-display font-black uppercase text-2xl md:text-4xl',
              'bg-neo-yellow text-neo-black border-4 border-neo-black rounded-neo-lg',
              'shadow-hard-lg hover:shadow-hard-xl hover:-translate-y-0.5 active:translate-y-0.5 active:scale-[0.99] active:shadow-hard transition-all'
            )}
          >
            <RotateCcw className="w-8 h-8 shrink-0" aria-hidden />
            {t('education.results.rematch')}
          </button>
        )}
        {onBackToClass && (
          <button
            type="button"
            data-testid="quiz-finale-back-to-class"
            onClick={onBackToClass}
            className="shrink-0 self-center lg:self-stretch flex items-center gap-2 px-4 py-2 rounded-neo border-[3px] border-neo-cream bg-neo-navy-elevated text-neo-cream font-neo-display font-black uppercase shadow-hard-sm transition-transform hover:-translate-y-0.5 active:translate-y-0.5"
          >
            <SchoolGlyph className="size-5 shrink-0" />
            {t('eduLive.results.backToClass')}
          </button>
        )}
      </div>
    </section>
  );
}

export default VocabQuizFinale;
