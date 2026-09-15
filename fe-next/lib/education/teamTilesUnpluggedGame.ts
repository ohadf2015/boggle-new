/**
 * Team Tiles Unplugged — pure game state (no React, no DOM).
 *
 * Kahoot Team Tiles foil: teacher projects a face-down tile grid built from
 * last-session missed words. Classroom teams take turns flipping a tile → the
 * word reveals; the teacher marks "team got it" / "not yet". No student devices.
 *
 * Finish reuses Unplugged end-sticker + #1045 grade passback (class cleared/total).
 *
 * Timing: no countdown — flip is instant (Team Tiles is a board, not a ring).
 * Shuffle is seedable so tests stay deterministic.
 */

import {
  UNPLUGGED_BASE_POINTS,
  UNPLUGGED_FIRE_STREAK,
  UNPLUGGED_STREAK_CAP,
  UNPLUGGED_STREAK_STEP,
} from './unpluggedReteachGame';

export { UNPLUGGED_FIRE_STREAK };

export const TEAM_TILES_TEAM_COUNTS = [2, 3, 4] as const;
export type TeamTilesTeamCount = (typeof TEAM_TILES_TEAM_COUNTS)[number];
export const TEAM_TILES_DEFAULT_TEAMS: TeamTilesTeamCount = 2;

export type TeamTileFace = 'down' | 'up' | 'cleared' | 'missed';

export interface TeamTile {
  readonly id: number;
  readonly word: string;
  readonly face: TeamTileFace;
}

export type TeamTilesPhase = 'board' | 'revealed' | 'finished';

export interface TeamTilesGameState {
  readonly words: readonly string[];
  readonly tiles: readonly TeamTile[];
  readonly teamCount: TeamTilesTeamCount;
  /** Per-team scores (length === teamCount). */
  readonly teamScores: readonly number[];
  /** 0-based active team. */
  readonly activeTeam: number;
  readonly phase: TeamTilesPhase;
  /** Tile currently face-up awaiting a verdict; null on the board. */
  readonly activeTileId: number | null;
  readonly score: number;
  readonly streak: number;
  readonly bestStreak: number;
  readonly cleared: number;
  readonly missed: number;
  readonly judged: number;
}

function isTeamCount(n: number): n is TeamTilesTeamCount {
  return (TEAM_TILES_TEAM_COUNTS as readonly number[]).includes(n);
}

/** Mulberry32 — tiny seeded PRNG for deterministic board shuffles in tests. */
export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace<T>(arr: T[], rand: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

export function createTeamTilesGame(
  words: readonly string[],
  opts?: { teamCount?: number; seed?: number },
): TeamTilesGameState {
  const requested = opts?.teamCount ?? TEAM_TILES_DEFAULT_TEAMS;
  const teamCount = isTeamCount(requested) ? requested : TEAM_TILES_DEFAULT_TEAMS;
  const rand =
    typeof opts?.seed === 'number' ? mulberry32(opts.seed) : Math.random;
  const order = shuffleInPlace([...words], rand);
  const tiles: TeamTile[] = order.map((word, id) => ({
    id,
    word,
    face: 'down' as const,
  }));
  return {
    words,
    tiles,
    teamCount,
    teamScores: Array.from({ length: teamCount }, () => 0),
    activeTeam: 0,
    phase: words.length === 0 ? 'finished' : 'board',
    activeTileId: null,
    score: 0,
    streak: 0,
    bestStreak: 0,
    cleared: 0,
    missed: 0,
    judged: 0,
  };
}

export function setTeamCount(
  state: TeamTilesGameState,
  teamCount: number,
): TeamTilesGameState {
  if (state.phase !== 'board' || state.judged > 0 || !isTeamCount(teamCount)) {
    return state;
  }
  if (state.activeTileId !== null) return state;
  return {
    ...state,
    teamCount,
    teamScores: Array.from({ length: teamCount }, () => 0),
    activeTeam: 0,
  };
}

export function activeTile(state: TeamTilesGameState): TeamTile | null {
  if (state.activeTileId === null) return null;
  return state.tiles.find((t) => t.id === state.activeTileId) ?? null;
}

export function remainingDown(state: TeamTilesGameState): number {
  return state.tiles.filter((t) => t.face === 'down').length;
}

/** Flip a face-down tile. Ignored if another tile is already awaiting verdict. */
export function flipTile(
  state: TeamTilesGameState,
  tileId: number,
): TeamTilesGameState {
  if (state.phase !== 'board') return state;
  if (state.activeTileId !== null) return state;
  const tile = state.tiles.find((t) => t.id === tileId);
  if (!tile || tile.face !== 'down') return state;
  return {
    ...state,
    phase: 'revealed',
    activeTileId: tileId,
    tiles: state.tiles.map((t) =>
      t.id === tileId ? { ...t, face: 'up' as const } : t,
    ),
  };
}

export function scoreForTeamFlip(input: { streak: number }): number {
  const streakBonus =
    Math.min(input.streak, UNPLUGGED_STREAK_CAP) * UNPLUGGED_STREAK_STEP;
  return UNPLUGGED_BASE_POINTS + streakBonus;
}

/**
 * Teacher verdict for the face-up tile. Advances the board and rotates the
 * active team. Single word-boundary path — no caller resets tile fields alone.
 */
export function judgeTile(
  state: TeamTilesGameState,
  got: boolean,
): TeamTilesGameState {
  if (state.phase !== 'revealed' || state.activeTileId === null) return state;
  const tileId = state.activeTileId;
  const streak = got ? state.streak + 1 : 0;
  const gained = got ? scoreForTeamFlip({ streak }) : 0;
  const teamScores = state.teamScores.map((s, i) =>
    i === state.activeTeam ? s + gained : s,
  );
  const tiles = state.tiles.map((t) =>
    t.id === tileId
      ? { ...t, face: (got ? 'cleared' : 'missed') as TeamTileFace }
      : t,
  );
  const judged = state.judged + 1;
  const done = judged >= state.tiles.length;
  const nextTeam = (state.activeTeam + 1) % state.teamCount;
  return {
    ...state,
    tiles,
    teamScores,
    activeTeam: done ? state.activeTeam : nextTeam,
    phase: done ? 'finished' : 'board',
    activeTileId: null,
    score: state.score + gained,
    streak,
    bestStreak: Math.max(state.bestStreak, streak),
    cleared: got ? state.cleared + 1 : state.cleared,
    missed: got ? state.missed : state.missed + 1,
    judged,
  };
}

export function isPerfectRun(state: TeamTilesGameState): boolean {
  return (
    state.phase === 'finished' &&
    state.tiles.length > 0 &&
    state.cleared === state.tiles.length
  );
}

export function winningTeamIndex(state: TeamTilesGameState): number | null {
  if (state.phase !== 'finished' || state.tiles.length === 0) return null;
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

export function resetTeamTilesGame(state: TeamTilesGameState): TeamTilesGameState {
  return createTeamTilesGame(state.words, {
    teamCount: state.teamCount,
    seed: Date.now() % 1_000_000,
  });
}
