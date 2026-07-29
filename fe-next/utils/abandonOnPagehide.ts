/**
 * Emit `growth:game_abandoned` when the user navigates away mid-game.
 *
 * The PostHog "Game Abandoned" goal saw zero conversions over 30 days because
 * no caller invoked `trackGameEnd(completed=false)` — players close the tab
 * rather than tap a quit button. A `pagehide` listener catches that path.
 *
 * Active state is set by `trackGameStart` and cleared by `trackGameEnd` so
 * completed games do not emit a phantom abandon.
 */

import posthog from 'posthog-js';

const MIN_ENGAGED_MS = 2000;

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

function emitAbandonIfActive() {
  if (!active || alreadyEmitted) return;
  const durationMs = Date.now() - active.startedAt;
  if (durationMs < MIN_ENGAGED_MS) return;

  alreadyEmitted = true;
  try {
    posthog.capture('growth:game_abandoned', {
      mode: active.mode,
      gameMode: active.mode,
      durationSec: Math.round(durationMs / 1000),
      reason: 'pagehide',
    });
  } catch {
    // PostHog not initialized — analytics never block UX
  }
}

export function installAbandonOnPagehide(): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = () => emitAbandonIfActive();
  window.addEventListener('pagehide', handler);

  return () => {
    window.removeEventListener('pagehide', handler);
  };
}

/** @internal Test-only reset hook. */
export function __resetAbandonStateForTests(): void {
  active = null;
  alreadyEmitted = false;
}
