'use client';

import { useEffect } from 'react';
import styles from './round.module.css';

/**
 * Page-level classes that keep the SHARED toasters off the round HUD. Both
 * toasters are app-wide and read-only for the round, so the round never edits
 * them — it only re-lanes their fixed containers from its own stylesheet
 * (round.module.css) while a round surface is mounted.
 *
 * - `roundLive` (every in-round view): holds the achievement capsule back; the
 *   unlock is listed on the results player card (server end-of-game payload).
 * - `roundFrame` (the MpRoundLayout frame: classic / word-hunt / blast): moves
 *   react-hot-toast under the phone HUD and into the desktop/TV start-rail
 *   lane — positions measured against THAT frame, so other modes keep theirs.
 */
export const ROUND_TOAST_LANE_CLASS: string = styles.roundLive;
export const ROUND_FRAME_LANE_CLASS: string = styles.roundFrame;

// Ref-counted per class: a view + a StrictMode/keyed remount can overlap; the
// class stays until the LAST surface that set it leaves.
const counts = new Map<string, number>();

function usePageClass(cls: string): void {
  useEffect(() => {
    const root = document.documentElement;
    counts.set(cls, (counts.get(cls) ?? 0) + 1);
    root.classList.add(cls);
    return () => {
      const next = Math.max(0, (counts.get(cls) ?? 1) - 1);
      counts.set(cls, next);
      if (next === 0) root.classList.remove(cls);
    };
  }, [cls]);
}

/** Every in-round view (host + joiner, all modes). */
export function useRoundToastLane(): void {
  usePageClass(ROUND_TOAST_LANE_CLASS);
}

/** The shared round frame only. */
export function useRoundFrameToastLane(): void {
  usePageClass(ROUND_FRAME_LANE_CLASS);
}
