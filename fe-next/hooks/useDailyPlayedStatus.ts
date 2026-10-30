/**
 * useDailyPlayedStatus - Unified daily challenge status across all modes
 *
 * Single source of truth for:
 * - Whether player has played each mode today (wordHunt, wordWheel, wordTower, connections)
 * - Current streak (server-backed for authed, localStorage for guests)
 * - Whether the player has ever finished a daily (newcomer UI)
 *
 * Strategy:
 * 1. Auth still resolving: loading (no guest guess that flips to server state)
 * 2. Authed: one shared /api/daily/status request for every consumer on the
 *    page; skeleton until the first answer, then silent revalidation
 * 3. Guests: localStorage, read before first paint
 * 4. Played flags are per UTC day: a new day drops yesterday's answer
 */

import { useState, useEffect, useLayoutEffect, useCallback, useSyncExternalStore } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { DailyPlayedStatus } from '@/app/api/daily/status/route';
import { getDailyStreak } from '@/utils/dailyChallenge/streaks';
import { getDailyChallengeDate, getSecondsUntilNextDaily } from '@/utils/dailyChallenge/dateUtils';
import { dailyBestKey, isDailyTowerPlayed } from '@/lib/wordTower/dailyBest';
import { utcDateKey } from '@/lib/wordTower/dailySeed';
import { hasPlayedConnectionsToday } from '@/lib/connections/dailyClient';
import { getWordHuntResultKey, getWordWheelResultKey } from '@/utils/dailyChallenge/constants';
import { ALL_LANGUAGES } from '@/lib/languageConfig';

type PlayedToday = DailyPlayedStatus['today'];

const NOTHING_PLAYED: PlayedToday = { wordHunt: false, wordWheel: false, wordTower: false, connections: false };
/** Consumers mounting within this window share the previous answer instead of refetching. */
const FRESH_MS = 5000;

/**
 * This device's "played today" flags, read from the keys the games actually
 * write: the per-language Word Hunt / Word Wheel result records (any language
 * counts — the server's answer is language-agnostic too), the Connections
 * played marker and the Word Tower daily best.
 */
function getLocalPlayedToday(): PlayedToday {
  const today = getDailyChallengeDate();
  const anyLanguage = (key: (lang: (typeof ALL_LANGUAGES)[number], date: string) => string) =>
    ALL_LANGUAGES.some((lang) => localStorage.getItem(key(lang, today)) !== null);
  return {
    wordHunt: anyLanguage(getWordHuntResultKey),
    wordWheel: anyLanguage(getWordWheelResultKey),
    // Tower keeps a per-UTC-day best climb; >0 means the daily was played.
    wordTower: isDailyTowerPlayed(localStorage.getItem(dailyBestKey(utcDateKey()))),
    connections: hasPlayedConnectionsToday(),
  };
}

/** Played is monotonic within a day: either source saying "played" wins. */
function mergePlayedToday(a: PlayedToday, b: PlayedToday | null): PlayedToday {
  if (!b) return a;
  return {
    wordHunt: a.wordHunt || b.wordHunt,
    wordWheel: a.wordWheel || b.wordWheel,
    wordTower: a.wordTower || b.wordTower,
    connections: a.connections || b.connections,
  };
}

const anyPlayed = (today: PlayedToday) => today.wordHunt || today.wordWheel || today.wordTower || today.connections;

interface LocalSnapshot {
  day: string;
  today: PlayedToday;
  streak: { current: number; longest: number };
  totalCompleted: number;
}

function readLocal(): LocalSnapshot | null {
  try {
    const streak = getDailyStreak();
    return {
      day: getDailyChallengeDate(),
      today: getLocalPlayedToday(),
      streak: { current: streak.currentStreak, longest: streak.longestStreak },
      totalCompleted: streak.totalDailiesCompleted ?? 0,
    };
  } catch {
    return null; // storage disabled
  }
}

// ── Shared server answer (one request per player per day, for every consumer) ──

interface Entry {
  key: string;
  data: DailyPlayedStatus | null;
  fetchedAt: number;
  settled: boolean;
  inflight: Promise<void> | null;
}

let entry: Entry | null = null;
let version = 0;
const listeners = new Set<() => void>();

function notify() {
  version += 1;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

const getVersion = () => version;
const getServerVersion = () => 0;

const entryKey = (playerId: string, day: string) => `${playerId}:${day}`;

function revalidate(playerId: string, force = false): Promise<void> {
  const key = entryKey(playerId, getDailyChallengeDate());
  if (!entry || entry.key !== key) {
    entry = { key, data: null, fetchedAt: 0, settled: false, inflight: null };
  }
  const current = entry;
  if (current.inflight) return current.inflight;
  if (!force && current.data && Date.now() - current.fetchedAt < FRESH_MS) return Promise.resolve();

  const request = (async () => {
    try {
      const response = await fetch(`/api/daily/status?userId=${encodeURIComponent(playerId)}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        current.data = (await response.json()) as DailyPlayedStatus;
        current.fetchedAt = Date.now();
      } else {
        console.warn('[useDailyPlayedStatus] status', response.status);
      }
    } catch (error) {
      console.warn('[useDailyPlayedStatus] fetch error:', error);
    } finally {
      current.settled = true;
      current.inflight = null;
      notify();
    }
  })();
  current.inflight = request;
  return request;
}

/** Test-only: drop the shared answer between tests. */
export function __resetDailyPlayedStatusStore() {
  entry = null;
  version = 0;
}

export type DailyPlayedStatusResult = DailyPlayedStatus & {
  /** Has this player ever finished a daily (any mode, any day)? */
  hasPlayedBefore: boolean;
  /** Silent revalidation: never flips `loading` back on once resolved. */
  refresh: () => Promise<void>;
};

export function useDailyPlayedStatus(): DailyPlayedStatusResult {
  const { user, isAuthenticated, loading: authLoading = false } = useAuth();
  const playerId = isAuthenticated && user?.id ? user.id : null;

  useSyncExternalStore(subscribe, getVersion, getServerVersion);

  // This device's flags. Read in a layout effect, never during render: the hub
  // SSRs, and touching localStorage there throws / mismatches hydration.
  const [local, setLocal] = useState<LocalSnapshot | null>(null);
  const syncLocal = useCallback(() => setLocal(readLocal()), []);

  useLayoutEffect(() => {
    syncLocal();
  }, [syncLocal, playerId]);

  useEffect(() => {
    if (authLoading || !playerId) return;
    void revalidate(playerId);
  }, [authLoading, playerId]);

  // Tab return / focus re-checks the day and revalidates; a timer rolls the
  // day over at 00:00 UTC for a tab left open.
  useEffect(() => {
    if (authLoading) return undefined;
    const recheck = () => {
      if (document.visibilityState !== 'visible') return;
      syncLocal();
      if (playerId) void revalidate(playerId);
    };
    const rollover = setTimeout(() => {
      syncLocal();
      if (playerId) void revalidate(playerId, true);
    }, (getSecondsUntilNextDaily() + 1) * 1000);
    document.addEventListener('visibilitychange', recheck);
    window.addEventListener('focus', recheck);
    return () => {
      clearTimeout(rollover);
      document.removeEventListener('visibilitychange', recheck);
      window.removeEventListener('focus', recheck);
    };
  }, [authLoading, playerId, syncLocal, local?.day]);

  const refresh = useCallback(async () => {
    syncLocal();
    if (playerId) await revalidate(playerId, true);
  }, [playerId, syncLocal]);

  const day = local?.day ?? getDailyChallengeDate();
  const localToday = local && local.day === day ? local.today : null;
  const localEver = Boolean(local && (local.totalCompleted > 0 || local.streak.longest > 0));

  if (authLoading) {
    return {
      today: NOTHING_PLAYED,
      streak: { current: 0, longest: 0 },
      allCompletedDates: [],
      freezeCount: 0,
      loading: true,
      fromServer: false,
      hasPlayedBefore: false,
      refresh,
    };
  }

  if (!playerId) {
    const today = localToday ?? NOTHING_PLAYED;
    return {
      today,
      streak: local?.streak ?? { current: 0, longest: 0 },
      allCompletedDates: [],
      freezeCount: 0,
      loading: false,
      fromServer: false,
      hasPlayedBefore: localEver || anyPlayed(today),
      refresh,
    };
  }

  const shared = entry && entry.key === entryKey(playerId, day) ? entry : null;
  const data = shared?.data ?? null;
  if (data) {
    // Server is authoritative across devices, but a score post from this
    // device may not have landed yet — keep what this device knows.
    const today = mergePlayedToday(data.today, localToday);
    return {
      ...data,
      today,
      loading: false,
      hasPlayedBefore: data.allCompletedDates.length > 0 || data.streak.longest > 0 || anyPlayed(today) || localEver,
      refresh,
    };
  }

  // No server answer yet: skeleton until the first request settles; if it
  // failed, fall back to this device so the CTA never points at a finished mode.
  const today = localToday ?? NOTHING_PLAYED;
  return {
    today,
    streak: { current: 0, longest: 0 },
    allCompletedDates: [],
    freezeCount: 0,
    loading: !shared?.settled,
    fromServer: false,
    hasPlayedBefore: localEver || anyPlayed(today),
    refresh,
  };
}
