'use client';

/**
 * useWordPace — Tracks words-per-minute and detects "flow state" (above-average pace).
 *
 * Shows a "You're on fire!" indicator when the player's recent WPM exceeds
 * their rolling average by 50%+. This creates a positive reinforcement loop
 * that makes flow state visible and encourages maintaining the pace.
 *
 * Uses a sliding window of the last 30 seconds for recent pace,
 * compared against the full-game average. No state stored — derived from timestamps.
 */

import { useCallback, useRef, useMemo } from 'react';

/** Pace tier thresholds (recent WPM / average WPM ratio) */
const PACE_TIERS = {
  /** Normal pace — no indicator */
  normal: 1.0,
  /** Above average — subtle glow */
  fast: 1.5,
  /** Significantly above average — "on fire" indicator */
  blazing: 2.0,
} as const;

export type PaceTier = 'normal' | 'fast' | 'blazing';

export interface WordPaceState {
  /** Current pace tier */
  tier: PaceTier;
  /** Recent words per minute (last 30s window) */
  recentWpm: number;
  /** Overall average words per minute */
  averageWpm: number;
  /** Ratio of recent to average (1.0 = same pace) */
  paceRatio: number;
}

export interface UseWordPaceReturn {
  /** Record a word submission timestamp */
  recordWord: () => void;
  /** Get current pace state (call in render) */
  getPaceState: () => WordPaceState;
  /** Reset pace tracking (new game) */
  reset: () => void;
}

const WINDOW_MS = 30_000; // 30-second sliding window

export function useWordPace(): UseWordPaceReturn {
  const timestampsRef = useRef<number[]>([]);
  const gameStartRef = useRef<number>(0);

  const recordWord = useCallback(() => {
    const now = Date.now();
    if (gameStartRef.current === 0) {
      gameStartRef.current = now;
    }
    timestampsRef.current.push(now);
  }, []);

  const getPaceState = useCallback((): WordPaceState => {
    const timestamps = timestampsRef.current;
    const now = Date.now();
    const gameStart = gameStartRef.current;

    if (timestamps.length < 3 || gameStart === 0) {
      return { tier: 'normal', recentWpm: 0, averageWpm: 0, paceRatio: 1 };
    }

    // Overall average WPM
    const totalElapsedMin = (now - gameStart) / 60_000;
    const averageWpm = totalElapsedMin > 0 ? timestamps.length / totalElapsedMin : 0;

    // Recent WPM (last 30s window)
    const windowStart = now - WINDOW_MS;
    const recentWords = timestamps.filter(t => t >= windowStart).length;
    const recentWpm = recentWords * (60_000 / WINDOW_MS); // Normalize to per-minute

    // Pace ratio
    const paceRatio = averageWpm > 0 ? recentWpm / averageWpm : 1;

    // Determine tier
    let tier: PaceTier = 'normal';
    if (paceRatio >= PACE_TIERS.blazing) {
      tier = 'blazing';
    } else if (paceRatio >= PACE_TIERS.fast) {
      tier = 'fast';
    }

    return { tier, recentWpm: Math.round(recentWpm * 10) / 10, averageWpm: Math.round(averageWpm * 10) / 10, paceRatio };
  }, []);

  const reset = useCallback(() => {
    timestampsRef.current = [];
    gameStartRef.current = 0;
  }, []);

  return useMemo(() => ({ recordWord, getPaceState, reset }), [recordWord, getPaceState, reset]);
}
