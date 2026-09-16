import { cn } from '@/lib/utils';
import type { ClassroomSessionStanding } from '@/shared/types/classroom';

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
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function ClassroomSessionStandings({
  standings,
  roundsPlayed,
  t,
}: ClassroomSessionStandingsProps) {
  if (!standings.length) return null;

  const winner = standings[0];

  return (
    <section
      data-testid="classroom-session-standings"
      className="shrink-0 rounded-neo border-[3px] border-neo-cream bg-neo-navy-elevated p-4 shadow-hard"
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
      <p
        data-testid="classroom-session-winner"
        className="mt-2 rounded-neo border-2 border-neo-yellow bg-neo-yellow/10 px-3 py-2 font-neo-display text-lg text-neo-yellow"
      >
        {t('education.results.session.winner', { name: winner.username })}
      </p>

      <ol className="mt-3 flex flex-col gap-1">
        {standings.map((row) => (
          <li
            key={row.username}
            data-testid="classroom-session-row"
            className={cn(
              'flex items-center gap-3 rounded-neo px-3 py-1.5 font-neo-body',
              row.rank === 1
                ? 'bg-neo-yellow/15 text-neo-cream'
                : 'text-neo-cream/85'
            )}
          >
            <span className="w-8 shrink-0 font-neo-display tabular-nums text-neo-cream/60">
              {row.rank}
            </span>
            <span className="min-w-0 flex-1 truncate">{row.username}</span>
            <span className="shrink-0 font-neo-display tabular-nums">{row.totalScore}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default ClassroomSessionStandings;
