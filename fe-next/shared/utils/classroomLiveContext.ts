/**
 * What the class is playing, right now, in a form a projector can print.
 *
 * A classroom round used to reach the screen as an anonymous multiplayer room:
 * a board, a clock and a list of names. Nothing said which lesson it was, which
 * round of the period, or — in a team battle — who was on whose side. The
 * server already knew all three; none of it was on the wire. A teacher reported
 * on 2026-09-14 that "we weren't really sure who was battling whom as the game
 * progressed", which is the accurate description of a screen carrying no
 * context at all.
 *
 * Built once per round and broadcast inside the `startGame` payload so the
 * projector and every phone read the same facts from the same message — the
 * rule two reconnect bugs were written to enforce.
 *
 * Pure, and in `shared/` because the client needs the type and the server needs
 * the arithmetic.
 */

import {
  clampTeamCount,
  reconcileTeams,
  type ClassroomTeam,
  type PlayStyle,
} from './teamBattle';

export interface ClassroomLiveContext {
  /** The round the class is about to play. 1-based; a teacher counts from one. */
  round: number;
  /** The lesson on the board, for the projector's own header. */
  lessonName: string | null;
  playStyle: PlayStyle;
  /** Teams only. */
  teamCount?: number;
  /** Teams only. Stable across rounds — see `reconcileTeams`. */
  teams?: ClassroomTeam[];
}

/** The slice of the stored classroom game this builder reads. */
interface ClassroomGameSlice {
  gameCode: string;
  lessonNames?: string[];
  teacherName?: string;
  settings?: { playStyle?: PlayStyle; teamCount?: number };
  /** Rounds already finished. Absent before the first results screen. */
  roundsPlayed?: number;
  /** The assignment dealt when this session's first team round started. */
  teams?: ClassroomTeam[];
}

export function buildClassroomLiveContext({
  game,
  humanUsernames,
}: {
  game: ClassroomGameSlice | null | undefined;
  humanUsernames: string[];
}): ClassroomLiveContext | null {
  if (!game) return null;

  const playStyle: PlayStyle = game.settings?.playStyle === 'teams' ? 'teams' : 'ffa';
  const context: ClassroomLiveContext = {
    round: (game.roundsPlayed ?? 0) + 1,
    lessonName: game.lessonNames?.[0] ?? null,
    playStyle,
  };

  if (playStyle !== 'teams') return context;

  // The teacher holds a socket in every classroom room but never plays —
  // `useHostViewState` forces them into broadcast mode. Dealing them a team
  // would put a permanent zero on one side of the tug-of-war.
  const teacherKey = game.teacherName?.trim().toLowerCase();
  const students = humanUsernames.filter(
    (name) => !!name && name.trim().toLowerCase() !== teacherKey
  );

  context.teamCount = clampTeamCount(game.settings?.teamCount);
  context.teams = reconcileTeams(
    game.teams,
    students,
    context.teamCount,
    game.gameCode
  );
  return context;
}
