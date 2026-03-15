'use client';

import { useState, useEffect, useRef } from 'react';

interface PersonalBest {
  bestScore: number;
  bestCombo: number;
}

/**
 * Fetches the player's blast personal bests on mount.
 * Returns null if not authenticated or fetch fails (non-blocking).
 */
export function useBlastPersonalBest(): PersonalBest | null {
  const [best, setBest] = useState<PersonalBest | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    fetch('/api/blast/result')
      .then(res => {
        if (!res.ok) return null;
        return res.json();
      })
      .then(data => {
        if (data?.personalBests) {
          // Aggregate best across all difficulties
          const bests = Object.values(data.personalBests) as Array<{ bestScore?: number; bestCombo?: number }>;
          const bestScore = Math.max(0, ...bests.map(b => b.bestScore ?? 0));
          const bestCombo = Math.max(0, ...bests.map(b => b.bestCombo ?? 0));
          if (bestScore > 0) {
            setBest({ bestScore, bestCombo });
          }
        }
      })
      .catch(() => {
        // Non-fatal — guest users or network issues
      });
  }, []);

  return best;
}
