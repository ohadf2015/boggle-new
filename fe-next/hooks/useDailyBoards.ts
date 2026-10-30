'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePolledBoard } from '@/hooks/usePolledBoard';
import { getWithAuth } from '@/utils/authFetch';
import { computeRankMovements, collectCountries, type RankMovement } from '@/components/daily/leaderboardLive';
import { fromMergedEntries, mergeAllTimeRows, mergeTodayRows } from '@/components/daily/leaderboardRows';
import type {
  AllTimeParticipant,
  DailyParticipant,
  LeaderboardScope,
  LeaderboardTab,
} from '@/components/daily/leaderboardTypes';

/* Per-mode routes answer `public, max-age=20`; a player who just finished
   refetches the same URL inside that window, so these reads skip the HTTP cache. */
const NO_STORE: RequestInit = { cache: 'no-store' };
const FULL_BOARD = 100;

export interface TodayBoard {
  rows: DailyParticipant[];
  total: number;
  huntSolved: number;
  wheelSolved: number;
  guestCount: number;
  countries: string[];
}

async function json(res: Response | null): Promise<Record<string, unknown> | null> {
  return res?.ok ? ((await res.json()) as Record<string, unknown>) : null;
}

/** The combined board is the server-merged one, so it matches the hub teaser exactly. */
async function loadCombinedToday(date: string, lang: string, fp: string | null | undefined, signal: AbortSignal): Promise<TodayBoard> {
  const qs = `date=${date}&lang=${lang}&limit=${FULL_BOARD}&friends=1${fp ? `&fp=${encodeURIComponent(fp)}` : ''}`;
  const body = await json(await getWithAuth(`/api/daily/leaderboard?${qs}`, { ...NO_STORE, signal }));
  if (!body) throw new Error('Failed to fetch leaderboard');
  const rows = fromMergedEntries(Array.isArray(body.data) ? body.data : []);
  return {
    rows,
    total: typeof body.total === 'number' ? body.total : rows.length,
    huntSolved: 0,
    wheelSolved: 0,
    guestCount: 0,
    countries: Array.isArray(body.countries) ? (body.countries as string[]) : [],
  };
}

async function loadScopedToday(date: string, lang: string, scope: LeaderboardScope, signal: AbortSignal): Promise<TodayBoard> {
  const wantHunt = scope === 'word-hunt';
  const [hunt, wheel] = await Promise.all([
    wantHunt ? json(await fetch(`/api/daily-challenge/word-hunt/leaderboard/${date}/${lang}?limit=${FULL_BOARD}`, { ...NO_STORE, signal })) : null,
    wantHunt ? null : json(await fetch(`/api/daily-challenge/word-wheel/leaderboard/${date}/${lang}?limit=${FULL_BOARD}`, { ...NO_STORE, signal })),
  ]);
  const source = hunt ?? wheel;
  if (!source) throw new Error('Failed to fetch leaderboard');
  const rows = mergeTodayRows(
    (hunt?.data as DailyParticipant[]) ?? [],
    (wheel?.data as DailyParticipant[]) ?? [],
  );
  const num = (v: unknown) => (typeof v === 'number' ? v : 0);
  return {
    rows,
    total: Math.max(rows.length, num(hunt?.totalPlayers), num(wheel?.totalParticipants)),
    huntSolved: num(hunt?.totalSolved),
    wheelSolved: num(wheel?.totalSolved),
    guestCount: num(source.guestPlayerCount),
    countries: collectCountries(rows),
  };
}

async function loadAllTime(language: string, scope: LeaderboardScope, signal: AbortSignal): Promise<AllTimeParticipant[]> {
  const wantHunt = scope !== 'word-wheel';
  const wantWheel = scope !== 'word-hunt';
  const [hunt, wheel] = await Promise.all([
    wantHunt ? fetch(`/api/daily-challenge/word-hunt/alltime-leaderboard/${language}?limit=${FULL_BOARD}`, { ...NO_STORE, signal }).then(json) : null,
    wantWheel ? fetch(`/api/daily-challenge/word-wheel/alltime-leaderboard/${language}?limit=${FULL_BOARD}`, { ...NO_STORE, signal }).then(json) : null,
  ]);
  if (!hunt && !wheel) throw new Error('Failed to fetch all-time leaderboard');
  return mergeAllTimeRows((hunt?.data as AllTimeParticipant[]) ?? [], (wheel?.data as AllTimeParticipant[]) ?? []);
}

/**
 * Today + all-time boards. Only the board on screen loads and polls: Today
 * (and Friends, which is filtered from it) or All-time.
 */
export function useDailyBoards(opts: {
  puzzleDate: string;
  language: string;
  fetchLanguage: string;
  scope: LeaderboardScope;
  activeTab: LeaderboardTab;
  guestFingerprint?: string | null;
}) {
  const { puzzleDate, language, fetchLanguage, scope, activeTab, guestFingerprint } = opts;
  const todayKey = `${puzzleDate}|${fetchLanguage}|${scope}|${guestFingerprint ?? ''}`;

  const today = usePolledBoard<TodayBoard>(
    (signal) => scope === 'combined'
      ? loadCombinedToday(puzzleDate, fetchLanguage, guestFingerprint, signal)
      : loadScopedToday(puzzleDate, fetchLanguage, scope, signal),
    { enabled: !!puzzleDate && (activeTab === 'today' || activeTab === 'friends'), key: todayKey },
  );

  const allTime = usePolledBoard<AllTimeParticipant[]>(
    (signal) => loadAllTime(language, scope, signal),
    { enabled: activeTab === 'alltime', key: `${language}|${scope}`, intervalMs: 5 * 60_000 },
  );

  // Rank movements between polls — the "who just passed whom" layer.
  const prevRanks = useRef<Map<string, number>>(new Map());
  const liveMovements = useRef<Map<string, RankMovement>>(new Map());
  const [movements, setMovements] = useState<Map<string, RankMovement>>(new Map());

  const resetMovements = useCallback(() => {
    prevRanks.current = new Map();
    liveMovements.current = new Map();
    setMovements(new Map());
  }, []);

  // A different population: previous ranks mean nothing for movement diffs.
  useEffect(resetMovements, [todayKey, resetMovements]);

  useEffect(() => {
    if (!today.data) return;
    const live = computeRankMovements(prevRanks.current, liveMovements.current, today.data.rows, Date.now());
    prevRanks.current = live.ranks;
    liveMovements.current = live.movements;
    setMovements(live.movements);
  }, [today.data]);

  return { today, allTime, movements };
}
