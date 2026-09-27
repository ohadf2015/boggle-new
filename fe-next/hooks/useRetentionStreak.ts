'use client';

import { useSyncExternalStore } from 'react';
import {
  displayStreak,
  getRetentionStreak,
  isoWeekKey,
  subscribeRetentionStreak,
  utcTodayKey,
} from '@/lib/retention/streak';

export interface UseRetentionStreakReturn {
  /** Streak to show right now (0 once lapsed beyond freeze cover). */
  streak: number;
  /** All-time best. */
  best: number;
  /** True while this ISO week's streak freeze is still in inventory. */
  freezeAvailable: boolean;
}

const SERVER_SNAPSHOT: UseRetentionStreakReturn = {
  streak: 0,
  best: 0,
  freezeAvailable: false,
};

function getSnapshot(): UseRetentionStreakReturn {
  const state = getRetentionStreak();
  const today = utcTodayKey();
  const weekKey = isoWeekKey(today);
  return {
    streak: displayStreak(state, today),
    best: state.best,
    freezeAvailable: state.freeze.weekKey !== weekKey ? true : state.freeze.available,
  };
}

// getSnapshot returns a fresh object per call; cache it so useSyncExternalStore
// only re-renders when the underlying store notifies (values are compared
// against the last emitted snapshot).
let lastRaw: ReturnType<typeof getRetentionStreak> | null = null;
let lastSnapshot: UseRetentionStreakReturn = SERVER_SNAPSHOT;

function getStableSnapshot(): UseRetentionStreakReturn {
  const raw = getRetentionStreak();
  if (raw !== lastRaw) {
    lastRaw = raw;
    lastSnapshot = getSnapshot();
  }
  return lastSnapshot;
}

/**
 * Global daily-streak state for UI chrome (header badge). Re-renders the
 * moment any mode records a play. SSR-safe: renders 0 on the server and
 * hydrates from localStorage on the client.
 */
export function useRetentionStreak(): UseRetentionStreakReturn {
  return useSyncExternalStore(
    subscribeRetentionStreak,
    getStableSnapshot,
    () => SERVER_SNAPSHOT,
  );
}
