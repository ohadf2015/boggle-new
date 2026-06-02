import { useCallback, useEffect, useState } from 'react';

interface UseAutoAdvanceStepOptions {
  /** Total number of steps in the carousel. */
  count: number;
  /** Delay between auto-advances, in ms. */
  intervalMs?: number;
  /** When true, the timer is suspended (e.g. hover/focus/reduced-motion). */
  paused?: boolean;
  /** Changing this value resets the active step back to 0 (e.g. mode switch). */
  resetKey?: unknown;
}

/**
 * Drives an auto-advancing carousel index that wraps around and can be paused.
 *
 * Auto-advance loops (last → first); manual `setIndex` jumps to any step and
 * restarts the interval so the slide the user landed on gets a full dwell.
 * Disabled when paused or when there are fewer than two steps.
 */
export function useAutoAdvanceStep({
  count,
  intervalMs = 6000,
  paused = false,
  resetKey,
}: UseAutoAdvanceStepOptions): readonly [number, (next: number) => void] {
  const [index, setIndexState] = useState(0);
  // Bumping the nonce on manual selection tears down + re-creates the interval
  // so the freshly-selected step gets a full interval before the next advance.
  const [nonce, setNonce] = useState(0);

  // Reset to the first step whenever the carousel identity changes.
  useEffect(() => {
    setIndexState(0);
  }, [resetKey]);

  const setIndex = useCallback((next: number) => {
    setIndexState(next);
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    if (paused || count <= 1) return;
    const id = setInterval(() => {
      setIndexState((i) => (i + 1) % count);
    }, intervalMs);
    return () => clearInterval(id);
  }, [paused, count, intervalMs, nonce]);

  return [index, setIndex] as const;
}
