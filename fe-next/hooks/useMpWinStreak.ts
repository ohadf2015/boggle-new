/**
 * Multiplayer Win Streak Hook
 *
 * Tracks consecutive wins per multiplayer mode (classic, wordHunt).
 * Separate from the daily play streak in useWinStreak.
 */

import { useState, useCallback, useEffect } from 'react';

export type MpMode = 'classic' | 'wordHunt';

const MILESTONES = [3, 5, 10] as const;

interface ModeStreak {
  current: number;
  best: number;
}

interface MpWinStreakState {
  classic: ModeStreak;
  wordHunt: ModeStreak;
}

interface RecordWinResult {
  newStreak: number;
  milestone: number | null;
}

const STORAGE_KEY = 'lexiclash_mp_win_streak';

const DEFAULT_MODE: ModeStreak = { current: 0, best: 0 };
const DEFAULT_STATE: MpWinStreakState = {
  classic: { ...DEFAULT_MODE },
  wordHunt: { ...DEFAULT_MODE },
};

function loadState(): MpWinStreakState {
  if (typeof window === 'undefined') return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    return {
      classic: { current: parsed.classic?.current ?? 0, best: parsed.classic?.best ?? 0 },
      wordHunt: { current: parsed.wordHunt?.current ?? 0, best: parsed.wordHunt?.best ?? 0 },
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function saveState(state: MpWinStreakState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function useMpWinStreak() {
  const [state, setState] = useState<MpWinStreakState>(loadState);

  // Reload from localStorage on mount (for SSR safety)
  useEffect(() => {
    setState(loadState());
  }, []);

  const recordWin = useCallback((mode: MpMode): RecordWinResult => {
    // Compute from latest localStorage to avoid stale closure
    const current = loadState();
    const modeData = current[mode];
    const newCurrent = modeData.current + 1;
    const newBest = Math.max(newCurrent, modeData.best);
    const milestone = (MILESTONES as readonly number[]).includes(newCurrent) ? newCurrent : null;
    const next = { ...current, [mode]: { current: newCurrent, best: newBest } };
    saveState(next);
    setState(next);
    return { newStreak: newCurrent, milestone };
  }, []);

  const recordLoss = useCallback((mode: MpMode): void => {
    const current = loadState();
    const next = { ...current, [mode]: { ...current[mode], current: 0 } };
    saveState(next);
    setState(next);
  }, []);

  const getStreak = useCallback((mode: MpMode): ModeStreak => {
    return state[mode] ?? DEFAULT_MODE;
  }, [state]);

  return { recordWin, recordLoss, getStreak };
}
