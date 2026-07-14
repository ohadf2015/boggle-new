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

import posthog from '@/lib/analytics/lazyPosthog';

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

/**
 * Emit abandon when a React component unmounts mid-game (SPA navigation).
 * Distinct from the pagehide listener which only fires on tab close/background.
 * Guard: `active` is null after `markGameInactive()` (game completed normally),
 * so this is a no-op for games that reached the results screen.
 */
export function emitAbandonOnSpaNavigate(): void {
  if (!active || alreadyEmitted) return;
  const durationMs = Date.now() - active.startedAt;
  if (durationMs < MIN_ENGAGED_MS) return;

  alreadyEmitted = true;
  try {
    posthog.capture('growth:game_abandoned', {
      mode: active.mode,
      gameMode: active.mode,
      durationSec: Math.round(durationMs / 1000),
      reason: 'spa_navigate',
    });
  } catch {
    // PostHog not initialized — analytics never block UX
  }
}

/** @internal Test-only reset hook. */
export function __resetAbandonStateForTests(): void {
  active = null;
  alreadyEmitted = false;
}
