'use client';

import { useEffect, useState } from 'react';
import type { ModeXpSlice } from '@/lib/xp/xpByMode';

/**
 * Fetch a player's estimated XP-by-mode split from the public profile endpoint.
 *
 * The own-profile view loads `total_xp` from AuthContext (no game history), so it
 * has no breakdown of its own — this pulls the same `xpByMode` the public profile
 * uses, for the logged-in user's own id. Non-critical: returns [] on any failure.
 */
export function useXpByMode(playerId?: string | null): ModeXpSlice[] {
  const [xpByMode, setXpByMode] = useState<ModeXpSlice[]>([]);

  useEffect(() => {
    if (!playerId) {
      setXpByMode([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/player-profile/${playerId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setXpByMode(data?.xpByMode ?? []);
      })
      .catch(() => {
        if (!cancelled) setXpByMode([]);
      });
    return () => {
      cancelled = true;
    };
  }, [playerId]);

  return xpByMode;
}

export default useXpByMode;
