/**
 * StudentRoundOutcome — what the round meant to the phone in the student's hand.
 *
 * The wall gets the podium. A student gets one answer, big: where did I come?
 * Kahoot's player screen stops there. This adds the two lines that make a
 * fifteen-year-old want the next round — how many classmates they beat, and how
 * few points the place above them was worth — plus their own lesson-word haul,
 * which is the only part of the screen a teacher would call learning.
 *
 * Every number comes from the standings the SERVER already sorted and from the
 * server-built `masteryByPlayer`. Nothing is re-ranked here, so the phone and
 * the projector can never disagree about who came second (Class 3 in
 * `.claude/rules/60-recurring-pitfalls.md`).
 *
 * Dark-only surface: `bg-neo-navy-elevated` is hardcoded, never the
 * cream/dark pair that flashes cream on a lazy mount (Class 5). And no entrance
 * opacity tween: this card is the whole reason the student opened the screen,
 * so it may never be caught mid-fade on a mobile renderer.
 */

'use client';

import { Crown, TrendingUp, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ClassroomPlayerMastery } from '@/shared/types/classroom';
import type { ResultsStanding } from './resultsStandings';
import { RANK_FILL } from './ResultsPodium';

export interface StudentRoundOutcomeProps {
  /** The name this client plays under, as the server echoes it. */
  username: string;
  /**
   * Final standings, best first — the server's order, rendered verbatim.
   * Bots may ride along; they are filtered here, not re-sorted.
   */
  standings: ResultsStanding[];
  /** This student's own lesson-word tally. Absent for a late joiner. */
  mastery?: ClassroomPlayerMastery;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function StudentRoundOutcome({
  username,
  standings,
  mastery,
  t,
}: StudentRoundOutcomeProps) {
  // Count the room the way the server's podium counts it: `buildClassroomPodium`
  // filters `!p.isBot`, while the multiplayer results payload does not. Ranking
  // against the unfiltered list prints "#3 of 4" directly above a podium
  // showing two names — one card, two rankings that disagree (Class 3). The
  // ORDER is still the server's; only bots are dropped.
  const humans = standings.filter((p) => !p.isBot);
  const me = username.trim().toLowerCase();
  const index = humans.findIndex((p) => p.username.trim().toLowerCase() === me);
  // A spectator, a player the server never scored, or an empty room: say
  // nothing rather than invent a placing.
  if (index < 0) return null;

  const rank = index + 1;
  const entry = humans[index];
  const beaten = humans.length - rank;
  const ahead = index > 0 ? humans[index - 1] : null;
  const gap = ahead ? Math.max(0, ahead.score - entry.score) : 0;

  const headline =
    rank === 1
      ? t('education.results.you.won')
      : rank <= 3
        ? t('education.results.you.podium')
        : t('education.results.you.finished');

  return (
    <section
      data-testid="student-round-outcome"
      data-rank={String(rank)}
      className={cn(
        'mb-5 p-4 rounded-neo border-neo border-neo-black bg-neo-navy-elevated shadow-hard'
      )}
    >
      <div className="flex items-center gap-4">
        {/* The placing, as an object rather than a statistic. */}
        <div
          className={cn(
            'relative shrink-0 flex flex-col items-center justify-center',
            'w-24 h-24 -rotate-2 rounded-neo border-neo border-neo-black shadow-hard',
            'text-neo-black',
            RANK_FILL[rank] ?? 'bg-neo-lime'
          )}
        >
          {rank === 1 && (
            <Crown
              className="absolute -top-5 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 w-9 h-9 text-neo-yellow animate-neo-wobble motion-reduce:animate-none"
              aria-hidden
            />
          )}
          <span className="font-neo-display font-black text-5xl leading-none tabular-nums">
            {rank}
          </span>
          <span className="font-neo-body font-bold text-[0.65rem] uppercase tracking-widest opacity-70">
            {t('education.results.you.of', { total: humans.length })}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p
            data-testid="student-outcome-headline"
            className="font-neo-display font-black uppercase tracking-wide text-neo-lime text-2xl leading-none"
          >
            {headline}
          </p>
          <p className="mt-1 font-neo-display font-black text-neo-white text-4xl leading-none tabular-nums">
            {entry.score}
            <span className="ms-2 font-neo-body font-bold text-neo-white/50 text-sm uppercase tracking-widest">
              {t('education.results.you.points')}
            </span>
          </p>

          {beaten > 0 && (
            <p
              data-testid="student-outcome-beat"
              className="mt-2 flex items-center gap-1.5 font-neo-body font-bold text-neo-white/80 text-sm"
            >
              <Users className="w-4 h-4 shrink-0 text-neo-cyan" aria-hidden />
              {t('education.results.you.beat', { count: beaten })}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {mastery && (
          <span
            data-testid="student-outcome-words"
            className="px-3 py-1.5 rounded-neo border-neo border-neo-black bg-neo-lime text-neo-black font-bold text-sm shadow-hard-sm"
          >
            {t('education.results.you.words', { found: mastery.found, total: mastery.total })}
          </span>
        )}
        {ahead && (
          <span
            data-testid="student-outcome-gap"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-neo border-neo border-neo-black bg-neo-navy text-neo-white font-bold text-sm shadow-hard-sm"
          >
            <TrendingUp className="w-4 h-4 shrink-0 text-neo-yellow" aria-hidden />
            {t('education.results.you.gapToNext', { points: gap, name: ahead.username })}
          </span>
        )}
      </div>
    </section>
  );
}

export default StudentRoundOutcome;
