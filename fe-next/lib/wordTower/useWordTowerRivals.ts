'use client';

import { useEffect, useState } from 'react';
import { getWithAuth } from '@/utils/authFetch';
import type { LeaderboardRivalRow } from './rivals';

/** Poll cadence. The API caches per-user for 30 s, so anything faster just hits
 *  the browser cache; this is slow enough to be nearly free and fast enough that
 *  a rival who starts climbing shows up as LIVE within the same session. */
const REFRESH_MS = 60_000;

/**
 * The Word Tower leaderboard as raw rows, refreshed while the tab is visible.
 *
 * Returns rows rather than pre-mapped markers because the *selection* of which
 * rivals to race is a function of the viewer's live altitude (see
 * {@link useRivalRace}) — the board is the input to that, not the answer.
 *
 * Real leaderboard data only: on failure or an empty board this returns `[]` and
 * every rival surface downstream simply doesn't draw.
 */
export function useWordTowerRivals(): LeaderboardRivalRow[] {
  const [rows, setRows] = useState<LeaderboardRivalRow[]>([]);

  useEffect(() => {
    let alive = true;
    const load = () => {
      // Don't burn a request (or a rate-limit slot) refreshing a board nobody
      // is looking at — the next visible tick picks it up.
      if (typeof document !== 'undefined' && document.hidden) return;
      getWithAuth('/api/word-tower/leaderboard')
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { leaderboard?: LeaderboardRivalRow[] } | null) => {
          if (!alive || !data?.leaderboard) return;
          setRows(data.leaderboard);
        })
        .catch(() => { /* best-effort — no rail */ });
    };
    load();
    const id = setInterval(load, REFRESH_MS);
    // Coming back to the tab should refresh immediately rather than waiting out
    // the remainder of an interval that was skipped while hidden.
    const onVisible = () => { if (!document.hidden) load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return rows;
}
