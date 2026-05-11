import { useEffect, useRef } from 'react';

interface UseTimerStallWatchdogOptions {
  remainingTime: number | null;
  gameActive: boolean;
  waitingForResults: boolean;
  onStall: () => void;
  /**
   * How long the timer can stay frozen before we treat it as stuck.
   * Server emits `timeUpdate` every 1s, so >5s without movement during
   * active play is a real desync, not network jitter.
   */
  stallMs?: number;
}

/**
 * MP "timer frozen mid-game" recovery watchdog.
 *
 * Server keeps ticking and emits `timeUpdate` every second, but the client
 * display can freeze when:
 *   - `gameSessionId` filter rejects emits after a stale ref (session bumped
 *     past the live server value, e.g., rolling deploy or duplicate sessions)
 *   - server's authoritative clock hasn't started (countdownComplete ack lost)
 *   - socket transport buffered emits during a tab-throttle / network blip
 *
 * Many independent failures land on the same symptom, so this watchdog is
 * the generic recovery layer: if `remainingTime` stays unchanged for
 * `stallMs` while game is active, fire `onStall` so the caller can
 * `socket.emit('requestGameState')` and force a fresh sync.
 *
 * Pairs with `useTimerZeroWatchdog` (which handles the frozen-at-0 case).
 */
export function useTimerStallWatchdog({
  remainingTime,
  gameActive,
  waitingForResults,
  onStall,
  stallMs = 5000,
}: UseTimerStallWatchdogOptions): void {
  const firedForValueRef = useRef<number | null>(null);
  const onStallRef = useRef(onStall);

  useEffect(() => {
    onStallRef.current = onStall;
  }, [onStall]);

  useEffect(() => {
    // Inactive states — don't watchdog. Reset fire-latch on exit so the
    // next active session re-arms cleanly.
    if (
      !gameActive ||
      waitingForResults ||
      remainingTime === null ||
      remainingTime <= 0
    ) {
      firedForValueRef.current = null;
      return;
    }

    // Already fired for this stuck value — don't spam recovery emits while
    // server is still catching up.
    if (firedForValueRef.current === remainingTime) {
      return;
    }

    const id = setTimeout(() => {
      firedForValueRef.current = remainingTime;
      onStallRef.current();
    }, stallMs);

    // Cleanup re-runs the effect whenever remainingTime changes, so a normal
    // tick (120 → 119) cancels the pending stall and rearms with the new
    // value.
    return () => clearTimeout(id);
  }, [remainingTime, gameActive, waitingForResults, stallMs]);
}
