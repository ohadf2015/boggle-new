import { useCallback, useSyncExternalStore } from 'react';

export const PRACTICE_STREAK_LS_KEY = 'lc_practice_streak_v1';

interface StreakState {
  current: number;
  longest: number;
  /** UTC date stamp 'YYYY-MM-DD' of last recorded session, or '' if none. */
  lastDayKey: string;
}

const EMPTY: StreakState = { current: 0, longest: 0, lastDayKey: '' };

let cache: StreakState | null = null;
const subscribers = new Set<() => void>();

function todayKey(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function readStorage(): StreakState {
  if (typeof window === 'undefined') return { ...EMPTY };
  try {
    const raw = window.localStorage.getItem(PRACTICE_STREAK_LS_KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof parsed.current === 'number' &&
      typeof parsed.longest === 'number' &&
      typeof parsed.lastDayKey === 'string'
    ) {
      return {
        current: parsed.current,
        longest: parsed.longest,
        lastDayKey: parsed.lastDayKey,
      };
    }
  } catch {
    // malformed
  }
  return { ...EMPTY };
}

function writeStorage(state: StreakState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PRACTICE_STREAK_LS_KEY, JSON.stringify(state));
  } catch {
    // noop
  }
}

function getCache(): StreakState {
  if (cache === null) cache = readStorage();
  return cache;
}

function notifyAll(): void {
  subscribers.forEach((fn) => fn());
}

/**
 * Returns the cached state object directly (referentially stable until
 * a real change). useSyncExternalStore demands this — returning a fresh
 * spread every call would loop.
 */
export function getPracticeStreak(): StreakState {
  return getCache();
}

/**
 * Records a practice session for "today" (UTC). Two sessions same day
 * count as one. Skipping days does NOT break the streak — current always
 * increments on a new day. Longest is the max ever observed.
 */
export function recordPracticeSession(date: Date = new Date()): StreakState {
  const key = todayKey(date);
  const prev = getCache();
  if (prev.lastDayKey === key) {
    return { ...prev };
  }
  const nextCurrent = prev.current + 1;
  const next: StreakState = {
    current: nextCurrent,
    longest: Math.max(prev.longest, nextCurrent),
    lastDayKey: key,
  };
  cache = next;
  writeStorage(next);
  notifyAll();
  return { ...next };
}

export function resetPracticeStreak(): void {
  cache = null;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(PRACTICE_STREAK_LS_KEY);
    } catch {
      // noop
    }
  }
  notifyAll();
}

function subscribe(fn: () => void): () => void {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}

export interface UsePracticeStreakReturn extends StreakState {
  record: () => void;
}

export function usePracticeStreak(): UsePracticeStreakReturn {
  const state = useSyncExternalStore(
    subscribe,
    getPracticeStreak,
    () => EMPTY
  );

  const record = useCallback(() => {
    recordPracticeSession();
  }, []);

  return { ...state, record };
}
