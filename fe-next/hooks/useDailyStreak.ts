'use client';

import { useEffect, useState } from 'react';
import { getDailyStreak } from '@/utils/dailyChallenge';

export interface DailyStreakState {
  /** Consecutive-day daily streak (the "fire" number). */
  streak: number;
  /** True until the authoritative server value resolves. */
  loading: boolean;
}

/**
 * useDailyStreak — the single source of truth for the daily "fire" streak.
 *
 * Why this exists: the fire icon used to read a Word-Hunt-only counter from
 * localStorage (`DAILY_STREAK_KEY`), while the weekly chest counts a day as done
 * if ANY daily mode (Hunt / Wheel / Puzzle) was completed — and it's
 * streak-freeze aware and server-authoritative. The two drifted constantly
 * (cross-device play, freezes, or simply playing the Wheel but not the Hunt).
 *
 * This hook makes the fire icon agree with the chest by reading the SAME
 * server-computed all-modes consecutive-day streak (`/api/daily/weekly-chest/status`
 * → `currentStreak`). It seeds from the local counter for an instant first paint,
 * then the server value wins. On error (offline, or a guest's 401) it keeps the
 * local seed, so guests/offline behave exactly as before.
 */
export function useDailyStreak(): DailyStreakState {
  const [streak, setStreak] = useState<number>(() =>
    typeof window === 'undefined' ? 0 : getDailyStreak().currentStreak,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const sync = async () => {
      try {
        const res = await fetch('/api/daily/weekly-chest/status');
        if (!res.ok) return; // guest 401 / rate-limit / 5xx — keep the local seed
        const json = await res.json();
        const value = Number(json?.currentStreak);
        if (active && Number.isFinite(value)) {
          setStreak(Math.max(0, Math.trunc(value)));
        }
      } catch {
        // Offline / fetch unavailable — keep the localStorage fallback.
      } finally {
        if (active) setLoading(false);
      }
    };

    sync();

    // Refresh when the player returns to the tab so a just-completed daily (or a
    // cross-device play) updates the fire icon without a hard reload — the same
    // freshness contract the rest of the daily surfaces follow.
    const onVisible = () => {
      if (document.visibilityState === 'visible') sync();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', sync);

    return () => {
      active = false;
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', sync);
    };
  }, []);

  return { streak, loading };
}

export default useDailyStreak;
