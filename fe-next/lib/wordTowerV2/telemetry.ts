import { trackGameEnd } from '@/utils/growthTracking';

/**
 * One lifecycle stream. `v2` and `daily` are properties, not a second mode —
 * a `word-tower-v2` start doubled every run in the mode tables.
 */
export const WORD_TOWER_MODE = 'word-tower';

export type V2RunClock = { current: number | null };

export type V2RunEndStats = {
  floors: number;
  heightM: number;
  /** Daily climb persists; leaving it is not a loss. */
  daily?: boolean;
  score?: number;
};

export type TowerEndExtras = {
  v2: true;
  daily: boolean;
  heightM: number;
  floors: number;
  words_found: number;
};

/** Shared end payload so crash/cash-out and daily leave cannot drift apart. */
export function towerEndArgs(stats: V2RunEndStats, durationSec?: number): {
  mode: typeof WORD_TOWER_MODE;
  score: number;
  floors: number;
  completed: boolean;
  durationSec: number | undefined;
  extras: TowerEndExtras;
} {
  const floors = Math.max(0, Math.floor(stats.floors));
  return {
    mode: WORD_TOWER_MODE,
    score: stats.score ?? floors,
    floors,
    completed: floors > 0,
    durationSec,
    extras: {
      v2: true,
      daily: !!stats.daily,
      heightM: Math.round(stats.heightM),
      floors,
      words_found: floors,
    },
  };
}

/** floors > 0 completes (retention streak via trackGameEnd); a bounce abandons. */
export function emitTowerEnd(stats: V2RunEndStats, durationSec?: number): 'complete' | 'abandon' {
  const end = towerEndArgs(stats, durationSec);
  trackGameEnd(end.mode, end.score, end.floors, end.completed, end.durationSec, end.extras);
  return end.completed ? 'complete' : 'abandon';
}

/**
 * First hoist of a run. Arms the duration clock only.
 *
 * The lifecycle start is `useGameStartTelemetry('word-tower')`. Emitting
 * `trackGameStart` here used to fire a second `game_started` as `word-tower-v2`
 * 13–20s later, doubling Word Tower in every mode table.
 */
export function startV2Run(startedAt: V2RunClock): void {
  if (startedAt.current != null) return;
  startedAt.current = Date.now();
}

/**
 * Collapse / cash-out. Same mode as the start hook, so this is the one end
 * (a later results-screen `trackGameEnd` for this mode is dropped).
 */
export function endV2Run(startedAt: V2RunClock, stats: V2RunEndStats): void {
  if (startedAt.current == null) return;
  const durationSec = Math.round((Date.now() - startedAt.current) / 1000);
  startedAt.current = null;
  emitTowerEnd(stats, durationSec);
}

/**
 * Daily leave or checkpoint. floors > 0 is a completed climb — the tower
 * saved itself — so `trackGameEnd` credits the retention streak. floors == 0
 * is an abandon carrying `floors` and `words_found`.
 * The caller once-guards; `trackGameEnd` also drops a second end for this mode.
 */
export function closeDailyTowerSession(
  stats: V2RunEndStats & { durationSec?: number },
): 'complete' | 'abandon' {
  return emitTowerEnd({ ...stats, daily: true }, stats.durationSec);
}
