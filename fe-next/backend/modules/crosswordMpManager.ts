/**
 * Crossword race (parallel-race) multiplayer state — server-authoritative, pure.
 *
 * Every player solves the SAME puzzle simultaneously (broadcast once). Clients
 * run the existing solo crossword engine and report progress (% complete, solved,
 * elapsed, score); the server aggregates and ranks. No per-move resolution — a
 * player's outcome doesn't depend on opponents, so idle players (or bots) simply
 * sit at 0% and never stall the room. Socket glue lives in the handler.
 */
import type { CrosswordMpModeState, CrosswordMpPlayerProgress } from '@/shared/types/game';

export interface CrosswordStanding extends CrosswordMpPlayerProgress {
  username: string;
  rank: number;
}

export function initCrosswordMpState(
  players: string[],
  puzzle: unknown,
  now: number = Date.now(),
): CrosswordMpModeState {
  const progress: Record<string, CrosswordMpPlayerProgress> = {};
  for (const p of players) progress[p] = { percent: 0, solved: false, elapsedMs: 0, score: 0 };
  return { players: [...players], puzzle, progress, startedAt: now };
}

/**
 * Record a player's progress. Monotonic on `solved` (a solved player stays
 * solved with their winning percent/score), clamps percent, ignores unknowns.
 */
export function applyProgress(
  state: CrosswordMpModeState,
  username: string,
  update: CrosswordMpPlayerProgress,
): CrosswordMpModeState {
  const prev = state.progress[username];
  if (!prev) return state; // unknown player — ignore
  if (prev.solved) return state; // already solved — freeze their result
  const next: CrosswordMpPlayerProgress = {
    percent: Math.max(0, Math.min(100, update.percent)),
    solved: update.solved,
    elapsedMs: Math.max(0, update.elapsedMs),
    score: Math.max(0, update.score),
  };
  return { ...state, progress: { ...state.progress, [username]: next } };
}

/** Rank: solved-first, then higher percent, then faster solve time. */
export function standings(state: CrosswordMpModeState): CrosswordStanding[] {
  const rows = state.players.map((username) => ({ username, ...state.progress[username] }));
  rows.sort((a, b) => {
    if (a.solved !== b.solved) return a.solved ? -1 : 1;
    if (a.solved && b.solved) return a.elapsedMs - b.elapsedMs;
    if (a.percent !== b.percent) return b.percent - a.percent;
    return a.elapsedMs - b.elapsedMs;
  });
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

/** True when every active player has solved the puzzle. */
export function allSolved(state: CrosswordMpModeState, activePlayers: string[]): boolean {
  return activePlayers.length > 0 && activePlayers.every((p) => state.progress[p]?.solved === true);
}
