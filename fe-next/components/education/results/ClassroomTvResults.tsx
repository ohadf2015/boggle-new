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
 */

'use client';

import { RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResultsPodium, type PodiumEntry } from './ResultsPodium';
import { WordCoverageGlance } from './WordCoverageGlance';
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

        {podium.length > 0 && <ResultsPodium entries={podium} size="projector" t={t} />}

        <section className="rounded-neo border-neo border-neo-black bg-neo-navy-elevated p-6 shadow-hard">
          {/* No username: `isTeacher` means class-wide coverage, so the
              per-player mastery lookup is never consulted. */}
          <WordCoverageGlance
            summary={summary}
            username=""
            isTeacher
            neverPlaced={neverPlaced}
            size="projector"
            t={t}
          />
        </section>

        {onRematch && (
          <button
            type="button"
            data-testid="classroom-tv-rematch"
            onClick={onRematch}
            className={cn(
              'mx-auto flex items-center justify-center gap-3 px-10 py-5',
              'font-neo-display font-bold text-2xl sm:text-3xl',
              'bg-neo-yellow text-neo-black border-neo border-neo-black rounded-neo',
              'shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5 transition-all'
            )}
          >
            <RotateCcw className="w-8 h-8 shrink-0" aria-hidden />
            {t('education.results.rematch')}
          </button>
        )}
      </div>
    </div>
  );
}

export default ClassroomTvResults;
