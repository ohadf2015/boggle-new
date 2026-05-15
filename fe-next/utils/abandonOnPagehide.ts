/**
 * Emit canonical `game_abandoned` when the user navigates away mid-game.
 *
 * The PostHog "Game Abandoned" goal saw zero conversions over 30 days because
 * (a) no caller invoked `trackGameEnd(completed=false)` — players close the
 * tab rather than tap a quit button, and (b) `pagehide` alone misses
 * backgrounded Capacitor webviews and modern browser tab-park flows.
 *
 * This module listens for BOTH `pagehide` and `visibilitychange→hidden`,
 * sends the capture via `sendBeacon` transport so the request survives the
 * unload, and uses a 5s engagement threshold so rapid tab-switches don't
 * inflate the funnel.
 *
 * Active state is set by `trackGameStart` and cleared by `trackGameEnd` so
 * completed games do not emit a phantom abandon.
 */

import posthog from 'posthog-js';

const MIN_ENGAGED_MS = 5000;

interface ActiveGame {
  mode: string;
  startedAt: number;
}

let active: ActiveGame | null = null;
let alreadyEmitted = false;

export function markGameActive(mode: string): void {
  active = { mode, startedAt: Date.now() };
  alreadyEmitted = false;
}

export function markGameInactive(): void {
  active = null;
}

function emitAbandonIfActive(reason: 'pagehide' | 'visibilitychange') {
  if (!active || alreadyEmitted) return;
  const durationMs = Date.now() - active.startedAt;
  if (durationMs < MIN_ENGAGED_MS) return;

  alreadyEmitted = true;
  try {
    posthog.capture(
      'game_abandoned',
      {
        mode: active.mode,
        gameMode: active.mode,
        durationSec: Math.round(durationMs / 1000),
        reason,
      },
      { transport: 'sendBeacon' },
    );
  } catch {
    // PostHog not initialized — analytics never block UX
  }
}

export function installAbandonOnPagehide(): () => void {
  if (typeof window === 'undefined') return () => {};

  const pagehideHandler = () => emitAbandonIfActive('pagehide');
  const visibilityHandler = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      emitAbandonIfActive('visibilitychange');
    }
  };

  window.addEventListener('pagehide', pagehideHandler);
  document.addEventListener('visibilitychange', visibilityHandler);

  return () => {
    window.removeEventListener('pagehide', pagehideHandler);
    document.removeEventListener('visibilitychange', visibilityHandler);
  };
}

/** @internal Test-only reset hook. */
export function __resetAbandonStateForTests(): void {
  active = null;
  alreadyEmitted = false;
}
