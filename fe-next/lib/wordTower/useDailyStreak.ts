'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  EMPTY_STREAK,
  recordDailyPlay,
  displayStreak,
  type DailyStreakState,
} from './dailyStreak';
import { utcDateKey } from './dailySeed';

const STORAGE_KEY = 'wt-daily-streak';

function readStreak(): DailyStreakState {
  if (typeof localStorage === 'undefined') return EMPTY_STREAK;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STREAK;
    const parsed = JSON.parse(raw) as Partial<DailyStreakState>;
    return {
      current: Number(parsed.current) || 0,
      best: Number(parsed.best) || 0,
      lastPlayedDate: typeof parsed.lastPlayedDate === 'string' ? parsed.lastPlayedDate : null,
    };
  } catch {
    return EMPTY_STREAK;
  }
}

/**
 * Daily-streak habit hook — a thin localStorage shell over the pure
 * {@link recordDailyPlay} math. `streak` is the count to SHOW right now (0 once
 * lapsed); `best` is the all-time high; `recordPlay()` marks today as played
 * (idempotent — safe to call on every floor) and grows/keeps the streak.
 */
export function useDailyStreak() {
  const [state, setState] = useState<DailyStreakState>(EMPTY_STREAK);

  // Hydrate from localStorage on mount (client-only — avoids SSR mismatch).
  useEffect(() => { setState(readStreak()); }, []);

  const recordPlay = useCallback(() => {
    setState((prev) => {
      const today = utcDateKey();
      if (prev.lastPlayedDate === today) return prev; // already counted today
      const next = recordDailyPlay(prev, today);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* best-effort */ }
      return next;
    });
  }, []);

  return {
    streak: displayStreak(state, utcDateKey()),
    best: state.best,
    recordPlay,
  };
}
