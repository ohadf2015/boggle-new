'use client';

import { memo } from 'react';
import { computeTeamStandings } from '@/shared/utils/teamBattle';
import type { ClassroomLiveContext } from '@/shared/utils/classroomLiveContext';
import { teamFillClass } from '@/lib/education/teamColors';
import { useShouldReduceMotion } from '@/contexts/AccessibilityContext';

interface TvBattleBarProps {
  /** Null outside a classroom game — the bar renders nothing. */
  classroom: ClassroomLiveContext | null;
  players: Array<{ username: string; score: number }>;
  t: (path: string, params?: Record<string, string | number>) => string;
}

/**
 * What this class is playing, said in one line a teacher can read from the door.
 *
 * The broadcast screen used to carry a clock, a board and a column of names.
 * Correct for a public room; useless in a classroom, where the teacher has to
 * narrate the game to thirty children and the screen never told them which
 * lesson was on the board, which round of the period this was, or — in a team
 * battle — who was on whose side. A teacher said exactly that on 2026-09-14.
 *
 * Two shapes, because the game has two:
 *  - free-for-all: one line of type. There are no sides, so there is no bar.
 *    Drawing one would invent structure the game does not have.
 *  - team battle: a tug-of-war split by live share of the class's score. It is
 *    the loud element on this screen and the only one, because it is the one
 *    fact the old screen could not express at all.
 */
const TvBattleBar = memo<TvBattleBarProps>(({ classroom, players, t }) => {
  const reduceMotion = useShouldReduceMotion();

  if (!classroom) return null;

  // Sorted by score inside `computeTeamStandings`; re-sorted by id here so the
  // bar keeps a fixed left-to-right order. A tug-of-war whose sides swap places
  // when the lead changes is unreadable from across a room.
  // ponytail: not memoised — at most four teams and a class-sized score list.
  const standings = classroom.teams?.length
    ? computeTeamStandings(classroom.teams, players).sort((a, b) => a.id - b.id)
    : [];

  const isTeams = classroom.playStyle === 'teams' && standings.length > 0;
  const total = standings.reduce((sum, team) => sum + team.totalScore, 0);
  const formatLabel = isTeams
    ? t('tvBroadcast.classroom.teamBattle')
    : t('tvBroadcast.classroom.freeForAll');

  return (
    // Dark-only surface: hardcoded navy, never `bg-neo-cream dark:bg-neo-navy`.
    // The projector mounts lazily and that pair flashes cream first.
    <div className="w-full px-4 pb-2 bg-neo-navy" data-testid="tv-battle-bar">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-x-4 gap-y-2">
        {/* The round marker is the one filled chip up here: a lesson IS a
            sequence, so the number carries real information. Lime on black is
            ~20:1 — legible from the back row. */}
        <span className="px-3 py-1 rounded-neo bg-neo-lime text-neo-black font-neo-display font-bold text-sm md:text-lg uppercase tracking-wide shrink-0">
          {t('tvBroadcast.classroom.round', { number: classroom.round })}
        </span>
        {classroom.lessonName && (
          <span className="font-neo-display font-bold text-neo-cream text-lg md:text-3xl truncate min-w-0">
            {classroom.lessonName}
          </span>
        )}
        {/* Outlined, not filled: the tug-of-war below is the loud element and
            it should be the only one. A solid cream border on navy is 3.74:1
            and clears the non-text contrast floor; an accent fill here would
            fight the bar for the room's attention. */}
        <span className="ms-auto px-3 py-1 rounded-neo border-neo-thick border-neo-cream text-neo-cream font-neo-body font-bold text-xs md:text-base uppercase tracking-widest shrink-0">
          {formatLabel}
        </span>
      </div>

      {isTeams && (
        <div
          data-testid="tv-battle-tug"
          role="group"
          aria-label={formatLabel}
          className="max-w-7xl mx-auto mt-2 flex h-14 md:h-20 rounded-neo border-[3px] border-neo-cream overflow-hidden shadow-hard"
        >
          {standings.map((team) => (
            <div
              key={team.id}
              data-testid={`tv-battle-team-${team.id}`}
              // Inline width, not a Tailwind class: the split is a live number,
              // and arbitrary Tailwind values only generate from literal strings.
              style={{ width: `${share(team.totalScore, total, standings.length)}%` }}
              className={[
                teamFillClass(team.id),
                // Centred, not spread: a score pushed to the far edge of its own
                // segment sits next to the NEXT team's label and reads as
                // theirs. Each side's mass belongs over its own territory.
                'flex flex-col items-center justify-center gap-0 px-1 md:px-3 min-w-0 overflow-hidden',
                // Black on an accent fill — the pair that passes the contrast gate.
                'text-neo-black border-e-[3px] border-neo-cream last:border-e-0',
                reduceMotion ? '' : 'transition-[width] duration-700 ease-out',
              ].join(' ')}
            >
              <span className="max-w-full font-neo-body font-bold text-[10px] md:text-xs uppercase tracking-widest truncate">
                {t('education.results.teamBattle.teamName', { number: team.id + 1 })}
              </span>
              <span className="font-neo-display font-bold text-2xl md:text-4xl leading-none tabular-nums">
                {team.totalScore}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

/**
 * A team's slice of the bar.
 *
 * Before anyone scores there is no leader, so the bar splits evenly — a 100/0
 * bar at 0-0 is a lie the whole room can see. Two decimals keep the segments
 * summing to 100 without a rounding gap at the right edge.
 */
function share(score: number, total: number, teamCount: number): number {
  if (total <= 0) return Number((100 / teamCount).toFixed(2));
  return Number(((score / total) * 100).toFixed(2));
}

TvBattleBar.displayName = 'TvBattleBar';

export default TvBattleBar;
