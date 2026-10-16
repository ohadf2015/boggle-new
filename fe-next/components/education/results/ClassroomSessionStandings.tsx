import { m, useReducedMotion } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ClassroomSessionStanding } from '@/shared/types/classroom';

/** Where each student stood before this round: their total minus this round's points, server order as the tie-break. */
export function standingsBeforeRound(
  standings: ClassroomSessionStanding[],
  roundScores: Record<string, number>
): ClassroomSessionStanding[] {
  return standings
    .map((row, i) => ({ row, i, before: row.totalScore - (roundScores[row.username] ?? 0) }))
    .sort((a, b) => b.before - a.before || a.i - b.i)
    .map(({ row }) => row);
}

/**
 * The whole class, summed across every round of the lesson, on the projector.
 *
 * The podium beside it is ONE round. `resetGameForNewRound` zeroes the room's
 * scores on every rematch, so from round two onward the podium answers "who won
 * that round" while the room is asking "who won today" — a teacher running
 * three rounds in a period had no screen that could tell her (2026-09-14).
 *
 * Deliberately the FULL list, not a top three. The podium already does top
 * three, and a classroom's thirtieth-place student is still in the room reading
 * the wall.
 *
 * Dark-only surface: `bg-neo-navy-elevated` is hardcoded, never
 * `bg-neo-cream dark:bg-neo-navy` — this mounts lazily on a projector and that
 * pair flashes cream before the dark class resolves (recurring pitfall 5).
 */
export interface ClassroomSessionStandingsProps {
  standings: ClassroomSessionStanding[];
  roundsPlayed: number;
  /** This round's points per student. With them, the rows climb from where they stood before the round. */
  roundScores?: Record<string, number>;
  /** The podium reveal is done: rows move to the new order. */
  settled?: boolean;
  /** The wall cannot scroll: print this many and count the rest. Absent = every student (the phone card scrolls). */
  maxRows?: number;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function ClassroomSessionStandings({
  standings,
  roundsPlayed,
  roundScores,
  settled = true,
  maxRows,
  t,
}: ClassroomSessionStandingsProps) {
  const reduce = !!useReducedMotion();
  const compact = typeof maxRows === 'number';
  if (!standings.length) return null;

  const before = roundScores ? standingsBeforeRound(standings, roundScores) : standings;
  const beforeIndex = new Map(before.map((row, i) => [row.username, i]));
  const ordered = settled || reduce ? standings : before;
  const shown = typeof maxRows === 'number' ? ordered.slice(0, maxRows) : ordered;
  const hidden = ordered.length - shown.length;

  const winner = standings[0];
  const crowned = winner.totalScore > 0 && standings[1]?.totalScore !== winner.totalScore;

  return (
    <section
      data-testid="classroom-session-standings"
      className={cn('shrink-0 rounded-neo border-[3px] border-neo-cream bg-neo-navy-elevated shadow-hard', compact ? 'px-4 py-3' : 'p-4')}
    >
      <header className="flex items-baseline justify-between gap-3">
        <h3
          data-testid="classroom-session-title"
          className="font-neo-display text-xl text-neo-cream"
        >
          {t('education.results.session.title')}
        </h3>
        <p
          data-testid="classroom-session-subtitle"
          className="font-neo-body text-sm text-neo-cream/70"
        >
          {t('education.results.session.subtitle', { rounds: roundsPlayed })}
        </p>
      </header>

      {/* The one line the teacher was missing, said in words rather than left
          to be inferred from a sorted list. */}
      {crowned && (
        <p
          data-testid="classroom-session-winner"
          className={cn('mt-2 rounded-neo border-2 border-neo-yellow bg-neo-yellow/10 px-3 font-neo-display text-neo-yellow', compact ? 'py-1 text-base' : 'py-2 text-lg')}
        >
          {t('education.results.session.winner', { name: winner.username })}
        </p>
      )}

      <ol className={cn('flex flex-col', compact ? 'mt-2 gap-0.5' : 'mt-3 gap-1')}>
        {shown.map((row, i) => {
          const climbed = settled && roundScores ? (beforeIndex.get(row.username) ?? i) - i : 0;
          return (
            <m.li
              key={row.username}
              layout={!reduce}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              data-testid="classroom-session-row"
              data-username={row.username}
              className={cn(
                'flex items-center gap-3 rounded-neo px-3 font-neo-body',
                compact ? 'py-1' : 'py-1.5',
                crowned && row.rank === 1 ? 'bg-neo-yellow/15 text-neo-cream' : 'text-neo-cream/85'
              )}
            >
              <span className="w-8 shrink-0 font-neo-display tabular-nums text-neo-cream/60">{row.rank}</span>
              <span dir="auto" className="min-w-0 flex-1 truncate">{row.username}</span>
              {climbed > 0 && (
                <span
                  data-testid="classroom-session-climb"
                  className="inline-flex shrink-0 items-center gap-0.5 rounded-neo border-[2px] border-neo-black bg-neo-lime px-1.5 font-neo-display text-sm font-black tabular-nums text-neo-black"
                >
                  <ArrowUp className="size-3.5" aria-hidden="true" />
                  {climbed}
                </span>
              )}
              <span className="shrink-0 font-neo-display tabular-nums">{row.totalScore}</span>
            </m.li>
          );
        })}
      </ol>
      {hidden > 0 && (
        <p data-testid="classroom-session-more" className="mt-1 px-3 font-neo-body text-sm font-bold text-neo-cream/70">
          {t('education.results.moreWords', { count: hidden })}
        </p>
      )}
    </section>
  );
}

export default ClassroomSessionStandings;
