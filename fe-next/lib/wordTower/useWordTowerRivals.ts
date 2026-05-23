'use client';

import { useEffect, useState } from 'react';
import { rivalsFromLeaderboard, type RivalMarker, type LeaderboardRivalRow } from './rivals';

/**
 * Fetch the top Word Tower records once and expose them as rival markers to
 * climb past. Real leaderboard data only (no fabricated rivals); the viewer's
 * own record is excluded server-side (`isYou`) via {@link rivalsFromLeaderboard}
 * so you never "pass yourself". On failure / empty board returns [] (no rail).
 */
export function useWordTowerRivals(max = 8): RivalMarker[] {
  const [rivals, setRivals] = useState<RivalMarker[]>([]);

  useEffect(() => {
    let alive = true;
    fetch('/api/word-tower/leaderboard')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { leaderboard?: LeaderboardRivalRow[] } | null) => {
        if (!alive || !data?.leaderboard) return;
        setRivals(rivalsFromLeaderboard(data.leaderboard, max));
      })
      .catch(() => { /* best-effort — no rail */ });
    return () => { alive = false; };
  }, [max]);

  return rivals;
}
