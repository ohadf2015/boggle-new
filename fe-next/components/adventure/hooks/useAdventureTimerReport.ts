/**
 * useAdventureTimerReport
 *
 * Reports timer state to a parent callback only on significant changes:
 * play/pause/entry-phase flip, 5s-bucket crossing, or within the final 10s
 * (where every tick matters for the HUD countdown). Avoids firing a callback
 * every 1s render-tick.
 *
 * Extracted from AdventureGame.tsx to shrink the orchestrator below 500 lines
 * and isolate the "significant-change" heuristic for testing.
 */

import { useEffect, useRef } from 'react';

export interface TimerReportState {
  timeRemaining: number;
  totalTime: number;
  isPlaying: boolean;
  isPaused: boolean;
}

interface LastReported {
  isPlaying: boolean;
  isPaused: boolean;
  phase: string;
  timeRemaining: number;
}

interface UseAdventureTimerReportProps {
  timeRemaining: number;
  totalTime: number;
  isPlaying: boolean;
  isPaused: boolean;
  entryPhase: string;
  onTimerStateChange?: (state: TimerReportState) => void;
}

export function useAdventureTimerReport({
  timeRemaining,
  totalTime,
  isPlaying,
  isPaused,
  entryPhase,
  onTimerStateChange,
}: UseAdventureTimerReportProps): void {
  const lastRef = useRef<LastReported | null>(null);

  useEffect(() => {
    const actuallyPlaying = isPlaying && entryPhase === 'playing';
    const last = lastRef.current;
    const isSignificantChange =
      !last ||
      last.isPlaying !== actuallyPlaying ||
      last.isPaused !== isPaused ||
      last.phase !== entryPhase ||
      Math.floor(last.timeRemaining / 5) !== Math.floor(timeRemaining / 5) ||
      timeRemaining <= 10;

    if (isSignificantChange && onTimerStateChange) {
      lastRef.current = { isPlaying: actuallyPlaying, isPaused, phase: entryPhase, timeRemaining };
      onTimerStateChange({ timeRemaining, totalTime, isPlaying: actuallyPlaying, isPaused });
    }
  }, [timeRemaining, totalTime, isPlaying, isPaused, entryPhase, onTimerStateChange]);
}
