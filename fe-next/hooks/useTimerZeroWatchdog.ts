import { useEffect, useRef } from 'react';

interface UseTimerZeroWatchdogOptions {
  remainingTime: number | null;
  gameActive: boolean;
  waitingForResults: boolean;
  onTrigger: () => void;
  /** Grace window before firing — lets the normal endGame/timeUpdate path catch up. */
  delayMs?: number;
}

/**
 * MP "stuck at 0" recovery watchdog.
 *
 * Server-driven games end via two paths: an `endGame` socket event AND a
 * `timeUpdate` carrying remainingTime=0. Either can be missed (rate-limit drop,
 * brief disconnect, gameSessionId filter). When both miss, the player is stuck
 * on a frozen 0:00 board with no fallback.
 *
 * This watchdog observes `remainingTime` reaching 0 after a previously-active
 * game and fires a recovery callback after a grace window. The caller wires it
 * to `setWaitingForResults(true)` + `socket.emit('requestResults')` so the
 * server's cached results path takes over.
 */
export function useTimerZeroWatchdog({
  remainingTime,
  gameActive,
  waitingForResults,
  onTrigger,
  delayMs = 2000,
}: UseTimerZeroWatchdogOptions): void {
  const wasActiveRef = useRef(false);
  const firedRef = useRef(false);
  const onTriggerRef = useRef(onTrigger);

  useEffect(() => {
    onTriggerRef.current = onTrigger;
  }, [onTrigger]);

  useEffect(() => {
    if (gameActive) wasActiveRef.current = true;
  }, [gameActive]);

  useEffect(() => {
    if (remainingTime !== 0) {
      firedRef.current = false;
      return;
    }
    if (!wasActiveRef.current) return;
    if (waitingForResults) return;
    if (firedRef.current) return;

    const id = setTimeout(() => {
      firedRef.current = true;
      onTriggerRef.current();
    }, delayMs);

    return () => clearTimeout(id);
  }, [remainingTime, waitingForResults, delayMs]);
}
