'use client';

import { useEffect, useState } from 'react';
import type { RivalMarker } from './rivals';

interface LeaderboardRow {
  rank?: number;
  username?: string;
  bestHeightM?: number;
}

/**
 * Fetch the top Word Tower records once and expose them as rival markers to
 * climb past. Real leaderboard data only (no fabricated rivals); on failure or
 * an empty board it simply returns [] and the rail renders nothing.
 */
export function useWordTowerRivals(max = 8): RivalMarker[] {
  const [rivals, setRivals] = useState<RivalMarker[]>([]);

  useEffect(() => {
    let alive = true;
    fetch('/api/word-tower/leaderboard')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { leaderboard?: LeaderboardRow[] } | null) => {
        if (!alive || !data?.leaderboard) return;
        const list = data.leaderboard
          .filter((row) => Number(row.bestHeightM) > 0)
          .slice(0, max)
          .map((row, i) => ({
            id: String(row.rank ?? i),
            name: String(row.username ?? 'Player'),
            heightM: Number(row.bestHeightM),
          }));
        setRivals(list);
      })
      .catch(() => { /* best-effort — no rail */ });
    return () => { alive = false; };
  }, [max]);

  return rivals;
}
