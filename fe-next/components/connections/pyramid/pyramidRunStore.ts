/**
 * The unfinished daily pyramid, saved on every move (same idea as the chain's
 * dailyRunStore). Pyramid days submit a score, so a reload that restarted the
 * run would let a player see the answers, reload and play perfect.
 */
import { useEffect } from 'react';
import type { PyramidState } from '@/lib/connections/pyramid/gameLogic';
import type { BridgeOutcome } from '@/lib/connections/shareGrid';

export interface StoredPyramidRun {
  pyramidId: string;
  language: string;
  state: Omit<PyramidState, 'pyramid'>;
  outcomes: [number, BridgeOutcome][];
  wrongByStage: Record<number, number>;
  elapsedMs: number;
}

const runKey = (dateISO: string) => `connections-daily-pyramid-run-${dateISO}`;

export function savePyramidRun(dateISO: string, run: StoredPyramidRun): void {
  try {
    window.localStorage.setItem(runKey(dateISO), JSON.stringify(run));
  } catch {
    /* storage disabled — the run just isn't resumable */
  }
}

export function loadPyramidRun(dateISO: string): StoredPyramidRun | null {
  try {
    const raw = window.localStorage.getItem(runKey(dateISO));
    const run = raw ? (JSON.parse(raw) as StoredPyramidRun) : null;
    return run && typeof run.pyramidId === 'string' && run.state ? run : null;
  } catch {
    return null;
  }
}

export function clearPyramidRun(dateISO: string): void {
  try {
    window.localStorage.removeItem(runKey(dateISO));
  } catch {
    /* storage disabled */
  }
}

/** An untouched pyramid reveals nothing, so it must not pin the day to one pyramid. */
export function pyramidRunStarted(state: PyramidState): boolean {
  return state.stage > 0 || state.wrongAttempts > 0 || state.hintRevealed || state.status !== 'playing';
}

/** Daily host only: persist every transition after the first move until the run ends. */
export function usePyramidRunSave(opts: {
  enabled: boolean;
  today: string;
  language: string;
  state: PyramidState;
  isTerminal: boolean;
  snapshot: () => Pick<StoredPyramidRun, 'outcomes' | 'wrongByStage' | 'elapsedMs'>;
}): void {
  const { enabled, today, language, state, isTerminal, snapshot } = opts;
  useEffect(() => {
    if (!enabled || isTerminal || !pyramidRunStarted(state)) return;
    const { pyramid, ...rest } = state;
    savePyramidRun(today, { pyramidId: pyramid.id, language, state: rest, ...snapshot() });
    // snapshot reads refs; the state change is what marks a new transition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, isTerminal, state, today, language]);
}
