'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getWithAuth } from '@/utils/authFetch';
import { getGuestFingerprint } from '@/utils/guestManager';
import type { RushBoardRow } from './rushHelpers';

interface ApiRow {
  rank: number;
  playerId?: string;
  username: string;
  bestHeightM: number;
  isYou?: boolean;
}

interface Args {
  setBoard: (rows: RushBoardRow[]) => void;
  daily: boolean;
  language: string;
  /** The daily board useV2Ready already fetched; reused so the daily makes no second request. */
  dailyBoard: ApiRow[] | null;
  /** Daily rows are metres grown today; the run's peak includes the restored tower, so rivals stand on it. */
  dailyBaseM: number;
}

export function toRushRows(rows: ApiRow[], offsetM: number): RushBoardRow[] {
  return rows.map((r) => ({ id: r.playerId ?? `${r.rank}-${r.username}`, name: r.username, bestHeightM: r.bestHeightM + offsetM, isYou: r.isYou }));
}

function fetchBoard(authed: boolean, language: string): Promise<ApiRow[] | null> {
  let url = '/api/word-tower/leaderboard';
  if (!authed) {
    const params = new URLSearchParams({ language });
    const fp = getGuestFingerprint();
    if (fp) params.set('guestFingerprint', fp);
    url = `/api/word-tower/daily/score?${params.toString()}`;
  }
  return getWithAuth(url)
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => (Array.isArray(d?.leaderboard) ? (d.leaderboard as ApiRow[]) : null));
}

export function useRushBoard({ setBoard, daily, language, dailyBoard, dailyBaseM }: Args): void {
  const { isAuthenticated, loading } = useAuth();
  const [freeRows, setFreeRows] = useState<ApiRow[] | null>(null);
  const fetchedRef = useRef(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // No per-effect cancel: StrictMode's re-run would cancel the only request the ref lets through.
  useEffect(() => {
    if (daily || loading || fetchedRef.current) return;
    fetchedRef.current = true;
    fetchBoard(isAuthenticated, language)
      .then((rows) => {
        if (aliveRef.current && rows) setFreeRows(rows);
      })
      .catch(() => undefined);
  }, [daily, loading, isAuthenticated, language]);

  const rows = daily ? dailyBoard : freeRows;
  const offsetM = daily ? dailyBaseM : 0;
  useEffect(() => {
    if (rows) setBoard(toRushRows(rows, offsetM));
  }, [rows, offsetM, setBoard]);
}
