/**
 * Multiplayer Win Streak Hook
 *
 * Tracks consecutive wins per multiplayer mode (classic, wordHunt).
 * Separate from the daily play streak in useWinStreak.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

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

/** Persist current state to Supabase profiles (fire-and-forget) */
function syncToSupabase(userId: string, state: MpWinStreakState): void {
  if (!supabase) return;
  supabase
    .from('profiles')
    .update({
      mp_win_streak_classic: state.classic.current,
      mp_win_streak_wordhunt: state.wordHunt.current,
      mp_best_streak_classic: state.classic.best,
      mp_best_streak_wordhunt: state.wordHunt.best,
    })
    .eq('id', userId)
    .then(() => { /* best-effort */ }, () => { /* best-effort */ });
}

export function useMpWinStreak() {
  const [state, setState] = useState<MpWinStreakState>(loadState);
  const { user, isAuthenticated } = useAuth();
  const hasSyncedRef = useRef(false);

  // Reload from localStorage on mount (for SSR safety)
  useEffect(() => {
    setState(loadState());
  }, []);

  // Fetch from Supabase on mount when authenticated
  useEffect(() => {
    if (!isAuthenticated || !user?.id || hasSyncedRef.current || !supabase) return;
    hasSyncedRef.current = true;

    supabase
      .from('profiles')
      .select('mp_win_streak_classic, mp_win_streak_wordhunt, mp_best_streak_classic, mp_best_streak_wordhunt')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) return; // fallback to localStorage
        const serverState: MpWinStreakState = {
          classic: {
            current: data.mp_win_streak_classic ?? 0,
            best: data.mp_best_streak_classic ?? 0,
          },
          wordHunt: {
            current: data.mp_win_streak_wordhunt ?? 0,
            best: data.mp_best_streak_wordhunt ?? 0,
          },
        };
        saveState(serverState);
        setState(serverState);
      }, () => { /* fallback to localStorage */ });
  }, [isAuthenticated, user?.id]);

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
    if (isAuthenticated && user?.id) syncToSupabase(user.id, next);
    return { newStreak: newCurrent, milestone };
  }, [isAuthenticated, user]);

  const recordLoss = useCallback((mode: MpMode): void => {
    const current = loadState();
    const next = { ...current, [mode]: { ...current[mode], current: 0 } };
    saveState(next);
    setState(next);
    if (isAuthenticated && user?.id) syncToSupabase(user.id, next);
  }, [isAuthenticated, user]);

  const getStreak = useCallback((mode: MpMode): ModeStreak => {
    return state[mode] ?? DEFAULT_MODE;
  }, [state]);

  return { recordWin, recordLoss, getStreak };
}
