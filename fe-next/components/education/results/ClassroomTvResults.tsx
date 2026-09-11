/**
 * ClassroomTvResults — the end of a classroom round, on the projector.
 *
 * A classroom host is FORCED into broadcast mode (`useHostViewState` hard-sets
 * `hostPlaying=false` for any room with lesson data) and `useHostGameEvents`
 * only calls `onShowResults` when `hostPlaying` is true — so the teacher never
 * reaches ResultsPage / ClassroomResultsCard. This IS their results screen.
 *
 * Same three beats as the card, sized for the back of a classroom:
 *  1. the PODIUM — three names, three scores, the winner tallest;
 *  2. the class's word coverage in one glance;
 *  3. one tap to run it again — the host's own start-new-game path, which
 *     emits resetGame + startGame on the SAME gameCode, and the server
 *     re-embeds the same stored lesson words (gameStartHandler always
 *     regenerates a classroom board from classroomGame.vocabularyWords). So
 *     "same list, same code" is literal, not a hopeful label.
 * The seven ways to send missed words home deliberately do NOT appear here —
 * a wall projector is read, not tapped; those live on the teacher's own device.
 *
 * Everything is server-built (`ClassroomSummary`), so the projector, the
 * teacher's laptop and every student phone celebrate the same three names.
 * Dark-only surface: `bg-neo-navy` is hardcoded, never the cream/dark pair
 * that flashes cream on a lazy mount.
 *
 * THE REVEAL. Third, second, a beat, then the winner — with Lexi's trophy loop,
 * one short sting and confetti on that last beat, and the coverage meter
 * filling behind it. None of it is an entrance tween: the plinths, the
 * spotlight bar and the meter are all painted from the first frame and the
 * reveal only swaps what is written inside them, which is why this screen can
 * be screenshotted at any instant and why it is fully readable under
 * `prefers-reduced-motion` with no motion at all (Pitfall Class 5).
 */

'use client';

import { Flame, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResultsPodium, type PodiumEntry } from './ResultsPodium';
import { WordCoverageGlance } from './WordCoverageGlance';
import { WinnerSpotlight } from './WinnerSpotlight';
import { useRoundEndReveal } from './useRoundEndReveal';
import { isRevealed, sweepReached } from '@/lib/education/roundEndStage';
import { sessionKeyFor } from '@/lib/education/roundEndHistory';
import { useSessionRoundHistory } from '@/hooks/useSessionRoundHistory';
import type { ClassroomSummary } from '@/shared/types/classroom';

export interface ClassroomTvResultsProps {
  summary: ClassroomSummary;
  /** Restages the same list in the same room. Hidden when the host has none. */
  onRematch?: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function ClassroomTvResults({ summary, onRematch, t }: ClassroomTvResultsProps) {
  // `neverPlacedWords` is a subset of `missedWords`: lesson words the board
  // generator never embedded. Absent means "we cannot tell" — then every miss
  // reads as a miss. Never treat an unknown source as proof.
  const neverPlaced = new Set((summary.neverPlacedWords ?? []).map((w) => w.toLowerCase()));

  const stage = useRoundEndReveal(true);
  const swept = summary.totalWords > 0 && summary.classFoundCount >= summary.totalWords;

  // The projector's story is the CLASS's, so it banks the class's numbers under
  // its own key — a teacher device that also rendered the student card must
  // never have the two write over each other (Pitfall Class 1: one value, two
  // writers).
  const { roundNumber, sweepStreak } = useSessionRoundHistory({
    sessionKey: `${sessionKeyFor(summary)}::class`,
    score: summary.classFoundCount,
    rank: 0,
    players: Object.keys(summary.masteryByPlayer).length,
    sweep: swept,
    ready: summary.totalWords > 0,
  });

  const podium: PodiumEntry[] = (summary.podium ?? []).map((p) => ({
    username: p.username,
    score: p.score,
    rank: p.rank,
    detail:
      typeof p.wordsFound === 'number' && typeof p.totalWords === 'number'
        ? t('education.results.podium.wordsFound', { found: p.wordsFound, total: p.totalWords })
        : undefined,
  }));

  return (
    <div
      data-testid="classroom-tv-results"
      // The reveal announces where it is, so a screenshot harness can wait for
      // the finished frame instead of catching the podium mid-beat and calling
      // it broken. Every stage is painted; `done` is simply the whole story.
      data-round-end-stage={stage}
      className="h-full overflow-y-auto bg-neo-navy text-neo-white"
    >
      <div className="mx-auto max-w-6xl flex flex-col gap-8 py-4">
        <header className="text-center">
          <p className="font-neo-display font-black uppercase tracking-widest text-neo-yellow text-xl sm:text-2xl">
            {t('education.results.podium.title')}
          </p>
          <p className="mt-1 font-neo-body font-bold text-neo-white/70 text-lg sm:text-2xl">
            {summary.lessonNames.join(' · ')}
          </p>
        </header>

        {podium.length > 0 && (
          <ResultsPodium entries={podium} size="projector" stage={stage} t={t} />
        )}

        {podium[0] && (
          <WinnerSpotlight
            winner={{ username: podium[0].username, score: podium[0].score }}
            active={isRevealed(1, stage)}
            // ONE sound per screen. When the class swept it, the sweep chime
            // 500ms later owns the moment — one child winning is one child's
            // moment; a class that found every word did something together.
            // Two stings half a second apart is the "it screamed at us" bug.
            cue={!swept}
            size="projector"
            t={t}
          />
        )}

        <section className="rounded-neo border-[2px] border-neo-black bg-neo-navy-elevated p-6 shadow-hard">
          {/* No username: `isTeacher` means class-wide coverage, so the
              per-player mastery lookup is never consulted. */}
          <WordCoverageGlance
            summary={summary}
            username=""
            isTeacher
            neverPlaced={neverPlaced}
            size="projector"
            fill={sweepReached(stage)}
            celebrate={sweepReached(stage)}
            t={t}
          />
        </section>

        {onRematch && (
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              data-testid="classroom-tv-rematch"
              onClick={onRematch}
              className={cn(
                'flex items-center justify-center gap-3 px-10 py-5',
                'font-neo-display font-bold text-2xl sm:text-3xl',
                'bg-neo-yellow text-neo-black border-[3px] border-neo-black rounded-neo',
                'shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5 transition-all'
              )}
            >
              <RotateCcw className="w-8 h-8 shrink-0" aria-hidden />
              {t('education.results.rematch')}
            </button>

            {/* Momentum, not decoration: a room that can see it is on round
                three plays round four. Both chips are silent in round one. */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {roundNumber > 1 && (
                <span
                  data-testid="classroom-tv-round"
                  className="px-4 py-2 rounded-neo border-[2px] border-neo-black bg-neo-navy-elevated text-neo-white font-neo-display font-bold text-xl shadow-hard-sm"
                >
                  {t('education.results.moment.roundOfSession', { round: roundNumber })}
                </span>
              )}
              {sweepStreak > 1 && (
                <span
                  data-testid="classroom-tv-sweep-streak"
                  className="flex items-center gap-2 px-4 py-2 rounded-neo border-[2px] border-neo-black bg-neo-orange text-neo-black font-neo-display font-black text-xl shadow-hard-sm"
                >
                  <Flame className="w-6 h-6 shrink-0" aria-hidden />
                  {t('education.results.moment.sweepStreak', { count: sweepStreak })}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ClassroomTvResults;
