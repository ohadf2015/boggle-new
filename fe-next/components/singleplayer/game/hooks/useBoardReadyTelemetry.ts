'use client';

import { useEffect, useRef } from 'react';
import { trackBoardReady } from '@/lib/singleplayer/boardReadyTelemetry';
import type { LetterGrid } from '@/shared/types/game';

/**
 * Fires the `sp_board_ready` signal once per round, the instant the grid
 * flips from null (loading) to set (interactive). See
 * lib/singleplayer/boardReadyTelemetry.ts for the event contract and why it
 * is its own event.
 */
export function useBoardReadyTelemetry(
  grid: LetterGrid | null,
  remainingTime: number,
  mode: string,
  timerSeconds: number
): void {
  // Read via a mount-only effect, not a useRef initializer — reading the
  // clock during render is impure (react-hooks/purity) and can produce
  // unstable timings across re-renders/Strict Mode double-invoke.
  const mountTimeRef = useRef<number>(0);
  const trackedRef = useRef(false);

  useEffect(() => {
    mountTimeRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now();
  }, []);

  useEffect(() => {
    if (grid && !trackedRef.current) {
      trackedRef.current = true;
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      trackBoardReady({
        mode,
        msToInteractive: Math.round(now - mountTimeRef.current),
        remainingTimeAtReady: remainingTime,
        timerSeconds,
      });
    }
  }, [grid, remainingTime, mode, timerSeconds]);
}
