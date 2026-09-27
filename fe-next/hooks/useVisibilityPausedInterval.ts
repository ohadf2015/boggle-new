import { useEffect, useRef } from 'react';

interface Options {
  /** Fire `callback` once immediately when the tab becomes visible again, to
   *  catch up stale data. Default true. Set false for sinks where a manufactured
   *  off-cadence call is undesirable (e.g. analytics events). */
  fireOnResume?: boolean;
  /** Gate the whole thing (e.g. requires auth / active session). Default true. */
  enabled?: boolean;
}

/**
 * Runs `callback` every `intervalMs`, but PAUSES the interval while the tab is
 * hidden (`document.hidden`) and resumes when it becomes visible again — sparing
 * background tabs needless network/CPU/server load. Mirrors the hand-rolled
 * visibility gate in WordWheelGame, standardized so new polls don't re-roll it.
 *
 * Does NOT fire on mount — call sites own their initial fetch; this hook only
 * manages the recurring tick. Read-poll use ONLY: never wrap a liveness
 * heartbeat in this (pausing it changes server-observed presence).
 */
export function useVisibilityPausedInterval(
  callback: () => void,
  intervalMs: number,
  { fireOnResume = true, enabled = true }: Options = {},
): void {
  // Keep the latest callback without restarting the interval each render.
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    if (!enabled) return;
    let id: ReturnType<typeof setInterval> | null = null;
    const isHidden = () => typeof document !== 'undefined' && document.hidden;

    const start = () => {
      if (id == null && !isHidden()) id = setInterval(() => cbRef.current(), intervalMs);
    };
    const stop = () => {
      if (id != null) { clearInterval(id); id = null; }
    };
    const onVisibility = () => {
      if (isHidden()) {
        stop();
      } else {
        if (fireOnResume) cbRef.current();
        start();
      }
    };

    start();
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility);
    }
    return () => {
      stop();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility);
      }
    };
  }, [intervalMs, fireOnResume, enabled]);
}
