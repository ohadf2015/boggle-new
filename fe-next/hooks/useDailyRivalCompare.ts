'use client';

import { useEffect, useState } from 'react';

export interface RivalCompareData {
  name: string;
  emoji: string;
  score: number;
  puzzleNumber: number;
}

/**
 * Reads a captured daily-challenge rival from sessionStorage (written by
 * useDailyRivalChallenge on the /daily landing) and returns it for the results
 * screen's head-to-head card — but only when it matches the puzzle just played.
 *
 * Clears the entry after a successful read so it does not re-show on remount.
 * The score axis is the caller's responsibility: pass the SAME metric to the
 * compare card's myScore that the challenger sent (Word Hunt = efficiencyScore).
 */
export function useDailyRivalCompare(puzzleNumber: number): RivalCompareData | null {
  const [rival, setRival] = useState<RivalCompareData | null>(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('daily_challenge_rival');
      if (!stored) return;
      const data = JSON.parse(stored) as RivalCompareData;
      if (data && data.puzzleNumber === puzzleNumber) {
        setRival(data);
        sessionStorage.removeItem('daily_challenge_rival');
      }
    } catch (err) {
      console.error('Failed to read daily rival compare data:', err);
    }
  }, [puzzleNumber]);

  return rival;
}
