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

/** Whether a game is currently in progress (set by trackGameStart/trackGameEnd). */
export function isGameActive(): boolean {
  return active !== null;
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
  const snapshot = active;
  const durationMs = Date.now() - snapshot.startedAt;
  if (durationMs < MIN_ENGAGED_MS) return;

  // Settle on the next macrotask instead of emitting straight away. React runs
  // a component's cleanup BEFORE the effects of the same commit, so when a
  // round ends normally this fires while `markGameInactive()` — called from the
  // end-of-game effect — is still one tick away. `active` is therefore still
  // set, and a COMPLETED game was logged as abandoned: 1,218 of them in 30d,
  // spiking at the exact round length (302 of classic's 515 at 90-99s against a
  // 90s round), none with a `game_completed` beside it. Re-checking after the
  // tick lets the real completion cancel the phantom. A genuine navigation away
  // clears nothing, so it still emits; tab-close is covered by `pagehide`.
  setTimeout(() => {
    if (alreadyEmitted || active !== snapshot) return;
    alreadyEmitted = true;
    try {
      posthog.capture('growth:game_abandoned', {
        mode: snapshot.mode,
        gameMode: snapshot.mode,
        durationSec: Math.round(durationMs / 1000),
        reason: 'spa_navigate',
      });
    } catch {
      // PostHog not initialized — analytics never block UX
    }
  }, 0);
}

/** @internal Test-only reset hook. */
export function __resetAbandonStateForTests(): void {
  active = null;
  alreadyEmitted = false;
}
