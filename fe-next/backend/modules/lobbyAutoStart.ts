/**
 * Lobby auto-start countdown.
 *
 * When every non-host human in a *waiting* lobby has marked ready, the host
 * frequently never clicks "Start" — the game stalls. This module owns a single,
 * server-authoritative countdown per game so the host AND every guest see the
 * exact same number ticking, then fires the host's normal start path at zero.
 *
 * The clock lives on the server (one source of truth, immune to a backgrounded
 * host tab throttling setInterval); the actual start still flows through the
 * host's existing `startGame` so all settings / animations / messageId handling
 * are reused unchanged.
 *
 * This is a NEW lobby phase that precedes the post-start 3-2-1 countdown
 * (`countdownComplete` / 8s fallback) — keep the two distinct.
 */

/** Seconds the host has to cancel before the game auto-starts. */
export const AUTO_START_SECONDS = 5;

export interface AutoStartCallbacks {
  /** Called immediately with the starting value, then once per second after. */
  onTick: (secondsLeft: number) => void;
  /** Called once when the countdown reaches zero. */
  onFire: () => void;
}

const countdowns = new Map<string, ReturnType<typeof setInterval>>();

/**
 * Pure gate: should an all-ready event begin the countdown?
 * Requires at least one human guest (totalPlayers > 0) so the solo-host
 * bot-countdown path stays the sole owner of the "host alone" case.
 */
export function shouldTriggerAutoStart(readyCount: number, totalPlayers: number): boolean {
  return totalPlayers > 0 && readyCount >= totalPlayers;
}

export function isAutoStartActive(gameCode: string): boolean {
  return countdowns.has(gameCode);
}

/**
 * Begin the countdown. No-op if one is already in flight for this game — a
 * second all-ready event must not reset the clock the host is watching.
 */
export function startAutoStartCountdown(
  gameCode: string,
  callbacks: AutoStartCallbacks,
  seconds: number = AUTO_START_SECONDS,
): void {
  if (countdowns.has(gameCode)) return;

  let secondsLeft = seconds;
  callbacks.onTick(secondsLeft);

  const timer = setInterval(() => {
    secondsLeft -= 1;
    if (secondsLeft <= 0) {
      clearInterval(timer);
      countdowns.delete(gameCode);
      callbacks.onFire();
      return;
    }
    callbacks.onTick(secondsLeft);
  }, 1000);

  countdowns.set(gameCode, timer);
}

/**
 * Cancel an in-flight countdown (un-ready, roster change, host clicked Start).
 * Returns true if something was actually running. `onCancel` lets the caller
 * broadcast the cancellation to the room.
 */
export function cancelAutoStartCountdown(gameCode: string, onCancel?: () => void): boolean {
  const timer = countdowns.get(gameCode);
  if (!timer) return false;
  clearInterval(timer);
  countdowns.delete(gameCode);
  onCancel?.();
  return true;
}

/**
 * Silently tear down any countdown for a game (game start/reset/cleanup).
 * Unlike cancel, this fires no callbacks — it is bookkeeping, not a UX event.
 */
export function clearAutoStartState(gameCode: string): void {
  const timer = countdowns.get(gameCode);
  if (timer) {
    clearInterval(timer);
    countdowns.delete(gameCode);
  }
}
