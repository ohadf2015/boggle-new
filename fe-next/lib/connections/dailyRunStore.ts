/**
 * The unfinished Word Bridge daily chain, saved on every move. Without it a
 * reload restarted the run: burn guesses, see the answers, reload, play perfect.
 */
import { puzzlesByIds } from './daily';
import type { GameState } from './types';
import type { BridgeOutcome } from './shareGrid';

export interface DailyRunSnapshot {
  state: GameState;
  solved: number[];
  wrongByIndex: Record<number, number>;
  outcomes: [number, BridgeOutcome][];
  /** Active play time so far; reloads and the how-to sheet don't count. */
  elapsedMs: number;
}

type SerializedState = Omit<GameState, 'puzzles' | 'completedIds' | 'ratedIds' | 'input'> & {
  completedIds: string[];
  ratedIds: string[];
};

export interface StoredDailyRun extends Omit<DailyRunSnapshot, 'state'> {
  language: string;
  puzzleIds: string[];
  state: SerializedState;
}

function runKey(dateISO: string): string {
  return `connections-daily-run-${dateISO}`;
}

export function saveDailyRun(dateISO: string, language: string, snap: DailyRunSnapshot): void {
  const { puzzles, completedIds, ratedIds, input: _input, ...rest } = snap.state;
  const stored: StoredDailyRun = {
    ...snap,
    language,
    puzzleIds: puzzles.map((p) => p.id),
    state: { ...rest, completedIds: [...completedIds], ratedIds: [...ratedIds] },
  };
  try {
    window.localStorage.setItem(runKey(dateISO), JSON.stringify(stored));
  } catch {
    /* storage disabled — the run just isn't resumable */
  }
}

export function loadDailyRun(dateISO: string): StoredDailyRun | null {
  try {
    const raw = window.localStorage.getItem(runKey(dateISO));
    return raw ? (JSON.parse(raw) as StoredDailyRun) : null;
  } catch {
    return null;
  }
}

export function clearDailyRun(dateISO: string): void {
  try {
    window.localStorage.removeItem(runKey(dateISO));
  } catch {
    /* storage disabled */
  }
}

/** Rebuild the engine state, or null when the stored puzzles no longer exist. */
export function restoreGameState(run: StoredDailyRun): GameState | null {
  const puzzles = Array.isArray(run.puzzleIds) ? puzzlesByIds(run.puzzleIds, run.language) : null;
  if (!puzzles || puzzles.length === 0) return null;
  return {
    ...run.state,
    puzzles,
    input: '',
    completedIds: new Set(run.state.completedIds ?? []),
    ratedIds: new Set(run.state.ratedIds ?? []),
  };
}
