/**
 * Classic Unplugged — pure game state (no React, no DOM).
 *
 * Kahoot Classic:Unplugged foil after #1047 Team Tiles: teacher projects one
 * miss-gap word at a time on a shared screen. The class (or 2–4 teams) discuss;
 * the teacher reveals and submits the consensus answer. No student devices,
 * no PIN, no answer timer — discussion pace.
 *
 * Finish reuses Unplugged end-sticker + #1045 grade passback (class cleared/total).
 *
 * teamCount === 1 → whole-class consensus (accuracy out of total).
 * teamCount 2–4 → teams rotate after each submit.
 */

import {
  UNPLUGGED_BASE_POINTS,
  UNPLUGGED_FIRE_STREAK,
  UNPLUGGED_STREAK_CAP,
  UNPLUGGED_STREAK_STEP,
} from './unpluggedReteachGame';

export { UNPLUGGED_FIRE_STREAK };

/** 1 = whole class; 2–4 = classroom teams. */
export const CLASSIC_UNPLUGGED_TEAM_COUNTS = [1, 2, 3, 4] as const;
export type ClassicUnpluggedTeamCount = (typeof CLASSIC_UNPLUGGED_TEAM_COUNTS)[number];
export const CLASSIC_UNPLUGGED_DEFAULT_TEAMS: ClassicUnpluggedTeamCount = 1;

export type ClassicUnpluggedPhase = 'prompt' | 'revealed' | 'finished';

export interface ClassicUnpluggedGameState {
  readonly words: readonly string[];
  readonly index: number;
  readonly phase: ClassicUnpluggedPhase;
  readonly teamCount: ClassicUnpluggedTeamCount;
  /** Per-group scores (length === teamCount). Class mode uses [classScore]. */
  readonly teamScores: readonly number[];
  /** 0-based active team (always 0 in class mode). */
  readonly activeTeam: number;
  readonly score: number;
  readonly streak: number;
  readonly bestStreak: number;
  readonly cleared: number;
  readonly missed: number;
  readonly judged: number;
}

function isTeamCount(n: number): n is ClassicUnpluggedTeamCount {
  return (CLASSIC_UNPLUGGED_TEAM_COUNTS as readonly number[]).includes(n);
}

export function createClassicUnpluggedGame(
  words: readonly string[],
  opts?: { teamCount?: number },
): ClassicUnpluggedGameState {
  const requested = opts?.teamCount ?? CLASSIC_UNPLUGGED_DEFAULT_TEAMS;
  const teamCount = isTeamCount(requested) ? requested : CLASSIC_UNPLUGGED_DEFAULT_TEAMS;
  return {
    words,
    index: 0,
    phase: words.length === 0 ? 'finished' : 'prompt',
    teamCount,
    teamScores: Array.from({ length: teamCount }, () => 0),
    activeTeam: 0,
    score: 0,
    streak: 0,
    bestStreak: 0,
    cleared: 0,
    missed: 0,
    judged: 0,
  };
}

export function currentWord(state: ClassicUnpluggedGameState): string {
  return state.words[state.index] ?? '';
}

export function isClassMode(state: ClassicUnpluggedGameState): boolean {
  return state.teamCount === 1;
}

/** Teacher picks class (1) or 2–4 teams only before the first submit. */
export function setTeamCount(
  state: ClassicUnpluggedGameState,
  teamCount: number,
): ClassicUnpluggedGameState {
  if (state.phase !== 'prompt' || state.judged > 0 || !isTeamCount(teamCount)) {
    return state;
  }
  return {
    ...state,
    teamCount,
    teamScores: Array.from({ length: teamCount }, () => 0),
    activeTeam: 0,
  };
}

/** Reveal the current miss-gap word so the teacher can submit consensus. */
export function revealWord(state: ClassicUnpluggedGameState): ClassicUnpluggedGameState {
  if (state.phase !== 'prompt') return state;
  if (!currentWord(state)) return state;
  return { ...state, phase: 'revealed' };
}

export function scoreForSubmit(input: { streak: number }): number {
  const streakBonus =
    Math.min(input.streak, UNPLUGGED_STREAK_CAP) * UNPLUGGED_STREAK_STEP;
  return UNPLUGGED_BASE_POINTS + streakBonus;
}

/**
 * Teacher submits the class/team consensus for the revealed word.
 * Single word-boundary path — advances index and rotates teams when needed.
 */
export function submitAnswer(
  state: ClassicUnpluggedGameState,
  got: boolean,
): ClassicUnpluggedGameState {
  if (state.phase !== 'revealed') return state;
  const streak = got ? state.streak + 1 : 0;
  const gained = got ? scoreForSubmit({ streak }) : 0;
  const teamScores = state.teamScores.map((s, i) =>
    i === state.activeTeam ? s + gained : s,
  );
  const judged = state.judged + 1;
  const done = judged >= state.words.length;
  const nextIndex = done ? state.index : state.index + 1;
  const nextTeam =
    state.teamCount === 1 || done
      ? state.activeTeam
      : (state.activeTeam + 1) % state.teamCount;
  return {
    ...state,
    teamScores,
    activeTeam: nextTeam,
    index: nextIndex,
    phase: done ? 'finished' : 'prompt',
    score: state.score + gained,
    streak,
    bestStreak: Math.max(state.bestStreak, streak),
    cleared: got ? state.cleared + 1 : state.cleared,
    missed: got ? state.missed : state.missed + 1,
    judged,
  };
}

export function isPerfectRun(state: ClassicUnpluggedGameState): boolean {
  return (
    state.phase === 'finished' &&
    state.words.length > 0 &&
    state.cleared === state.words.length
  );
}

export function winningTeamIndex(state: ClassicUnpluggedGameState): number | null {
  if (state.phase !== 'finished' || state.words.length === 0) return null;
  if (state.teamCount === 1) return state.teamScores[0]! > 0 ? 0 : null;
  let best = -1;
  let idx: number | null = null;
  let tie = false;
  state.teamScores.forEach((s, i) => {
    if (s > best) {
      best = s;
      idx = i;
      tie = false;
    } else if (s === best) {
      tie = true;
    }
  });
  return tie || best <= 0 ? null : idx;
}

export function resetClassicUnpluggedGame(
  state: ClassicUnpluggedGameState,
): ClassicUnpluggedGameState {
  return createClassicUnpluggedGame(state.words, { teamCount: state.teamCount });
}
