'use client';

import { useEffect } from 'react';
import styles from './round.module.css';

/**
 * The page-level class that routes the SHARED toasters (react-hot-toast's
 * `[data-rht-toaster]` and the achievement capsule) off the round HUD. Both
 * toasters are app-wide and read-only for the round, so the round never edits
 * them — it only re-lanes their fixed containers from its own stylesheet
 * (round.module.css `.roundLive`) while a round view is mounted.
 */
export const ROUND_TOAST_LANE_CLASS: string = styles.roundLive;

// Ref-counted: host view + a StrictMode/keyed remount can overlap; the lane
// stays until the LAST round surface leaves.
let mounted = 0;

export function useRoundToastLane(): void {
  useEffect(() => {
    const root = document.documentElement;
    mounted += 1;
    root.classList.add(ROUND_TOAST_LANE_CLASS);
    return () => {
      mounted = Math.max(0, mounted - 1);
      if (mounted === 0) root.classList.remove(ROUND_TOAST_LANE_CLASS);
    };
  }, []);
}
