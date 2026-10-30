/**
 * Emit `growth:game_abandoned` when the user navigates away mid-game.
 *
 * The PostHog "Game Abandoned" goal saw zero conversions over 30 days because
 * no caller invoked `trackGameEnd(completed=false)` — players close the tab
 * rather than tap a quit button. A `pagehide` listener catches that path, and
 * a `visibilitychange -> hidden` listener catches the iOS Safari path, which
 * often never fires pagehide when the tab is backgrounded or killed. Both
 * emit through the sendBeacon transport so the event survives the unload.
 *
 * Active state is set by `trackGameStart` and cleared by `trackGameEnd` so
 * completed games do not emit a phantom abandon.
 */

import posthog from '@/lib/analytics/lazyPosthog';

const MIN_ENGAGED_MS = 2000;

export type AbandonReason = 'pagehide' | 'hidden' | 'spa_navigate' | 'exit';

export interface AbandonExtras {
  words_found?: number;
  /** Standing floors when the mode's unit of progress is not words (Word Tower). */
  floors?: number;
  sp_mode?: string;
  landing_path?: string;
  /** Last coach step reached. Set only for sp_mode=challenge. */
  coach_step?: string;
  /** MP room code + flag, so the admin game log files an MP leave under its room. */
  gameCode?: string;
  isMultiplayer?: boolean;
}

interface ActiveGame {
  mode: string;
  startedAt: number;
  extras: AbandonExtras;
}

let active: ActiveGame | null = null;
let alreadyEmitted = false;
/**
 * Set when a hidden/pagehide abandon was emitted. The game may still resume
 * (bfcache restore, tab foregrounded) and finish — `trackGameEnd` consumes
 * this to stamp the completion `resumed_after_hidden: true` so analysis can
 * drop the earlier abandon instead of double-counting.
 */
let abandonedWhileHidden = false;
let pagehideFinalizer: (() => void) | null = null;
/**
 * Second destination for every abandon. PostHog is consent-gated, so without
 * this the first-party analytics_events table saw almost no mid-game exits.
 * growthTracking registers an unload-safe beacon here at module load.
 */
type AbandonPersistSink = (event: 'game_abandoned', payload: Record<string, unknown>) => void;
let persistSink: AbandonPersistSink | null = null;

export function setAbandonPersistSink(fn: AbandonPersistSink | null): void {
  persistSink = fn;
}

function persistAbandon(payload: Record<string, unknown>): void {
  if (!persistSink) return;
  try {
    persistSink('game_abandoned', payload);
  } catch {
    // A sink must never block the abandon path.
  }
}
/**
 * Words found before `trackGameStart` (deferred afterLoadIdle + 1500ms) used
 * to vanish: `updateActiveGameExtras` no-op'd while `active` was null, and
 * the effect does not re-run if the count is unchanged after start. The
 * abandon then reported words_found: 0 for a round that already had words.
 */
let pendingExtras: AbandonExtras | null = null;

/**
 * Lets a mode settle its own end on pagehide before the generic abandon
 * decides (daily Word Tower: floors > 0 is a completed climb).
 *
 * A mode's own `pagehide` listener cannot do this: Chromium runs `window`
 * listeners in registration order, capture or not, and this module's handler
 * is installed at app mount — so it always ran first, logged
 * `game_abandoned`, and the completion landed after PostHog's unload flush.
 * The finalizer runs inside the abandon handler instead; if it ends the game
 * (`trackGameEnd` → `markGameInactive`), no abandon is emitted.
 */
export function setPagehideFinalizer(fn: (() => void) | null): void {
  pagehideFinalizer = fn;
}

/** Clears the finalizer only if it is still the one the caller set. */
export function clearPagehideFinalizer(fn: () => void): void {
  if (pagehideFinalizer === fn) pagehideFinalizer = null;
}

function currentLandingPath(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return `${window.location.pathname}${window.location.search}`;
}

export function markGameActive(mode: string, extras: AbandonExtras = {}): void {
  const queued = pendingExtras;
  pendingExtras = null;
  abandonedWhileHidden = false;
  active = {
    mode,
    startedAt: Date.now(),
    extras: {
      words_found: extras.words_found ?? 0,
      sp_mode: extras.sp_mode,
      landing_path: extras.landing_path ?? currentLandingPath(),
      ...(extras.coach_step ? { coach_step: extras.coach_step } : {}),
      ...(extras.gameCode ? { gameCode: extras.gameCode } : {}),
      ...(extras.isMultiplayer === true ? { isMultiplayer: true } : {}),
      // Queued wins over the start payload's words_found: 0.
      ...(queued ?? {}),
    },
  };
  alreadyEmitted = false;
}

export function updateActiveGameExtras(patch: AbandonExtras): void {
  if (!active) {
    pendingExtras = { ...(pendingExtras ?? {}), ...patch };
    return;
  }
  active.extras = { ...active.extras, ...patch };
}

export function markGameInactive(): void {
  active = null;
  pendingExtras = null;
}

/** Whether a game is currently in progress (set by trackGameStart/trackGameEnd). */
export function isGameActive(): boolean {
  return active !== null;
}

/**
 * Read-and-clear the "abandoned while hidden" flag. Called by `trackGameEnd`
 * on a completed game: if an abandon already went out on hidden/pagehide and
 * the player came back and finished, the completion is stamped
 * `resumed_after_hidden: true` so funnels can drop the phantom abandon.
 */
export function consumeResumedAfterHidden(): boolean {
  const was = abandonedWhileHidden;
  abandonedWhileHidden = false;
  return was;
}

function emitAbandonIfActive(reason: 'hidden' | 'pagehide') {
  if (pagehideFinalizer) {
    try {
      pagehideFinalizer();
    } catch {
      // A finalizer must never block the abandon path.
    }
  }
  if (!active || alreadyEmitted) return;
  const durationMs = Date.now() - active.startedAt;
  if (durationMs < MIN_ENGAGED_MS) return;

  alreadyEmitted = true;
  abandonedWhileHidden = true;
  const payload = {
    mode: active.mode,
    gameMode: active.mode,
    durationSec: Math.round(durationMs / 1000),
    reason,
    ...active.extras,
  };
  try {
    // sendBeacon transport: a hidden/pagehide handler is the last code that
    // runs before unload — the default XHR (and lazyPosthog's own rate-limit
    // deferral) routinely never leaves the device on mobile. iOS Safari in
    // particular often fires ONLY visibilitychange, never pagehide.
    posthog.captureBeacon('growth:game_abandoned', payload);
  } catch {
    // PostHog not initialized — analytics never block UX
  }
  persistAbandon(payload);
}

export function installAbandonOnPagehide(): () => void {
  if (typeof window === 'undefined') return () => {};

  const onPagehide = () => emitAbandonIfActive('pagehide');
  // iOS Safari often never fires pagehide when the tab is backgrounded or
  // killed; visibilitychange -> hidden is the last reliable signal there.
  // `alreadyEmitted` makes whichever fires second a no-op.
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') emitAbandonIfActive('hidden');
  };
  window.addEventListener('pagehide', onPagehide);
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    window.removeEventListener('pagehide', onPagehide);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}

/**
 * Emit abandon when a mode's own exit path fires (Word Tower V2 `wt2_exit`)
 * while a run is unfinished — that trail used to end at wt2_exit with neither
 * game_completed nor game_abandoned, an orphan start.
 *
 * Deferred one macrotask like `emitAbandonOnSpaNavigate`: a run -> results
 * transition can fire the exit a tick before the completion, and the
 * completion must cancel the phantom abandon.
 */
export function emitAbandonOnExit(): void {
  if (!active || alreadyEmitted) return;
  const snapshot = active;
  const durationMs = Date.now() - snapshot.startedAt;
  if (durationMs < MIN_ENGAGED_MS) return;

  setTimeout(() => {
    if (alreadyEmitted || active !== snapshot) return;
    alreadyEmitted = true;
    const payload = {
      mode: snapshot.mode,
      gameMode: snapshot.mode,
      durationSec: Math.round(durationMs / 1000),
      reason: 'exit',
      ...snapshot.extras,
    };
    try {
      posthog.capture('growth:game_abandoned', payload);
    } catch {
      // PostHog not initialized — analytics never block UX
    }
    persistAbandon(payload);
  }, 0);
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
    const payload = {
      mode: snapshot.mode,
      gameMode: snapshot.mode,
      durationSec: Math.round(durationMs / 1000),
      reason: 'spa_navigate',
      ...snapshot.extras,
    };
    try {
      posthog.capture('growth:game_abandoned', payload);
    } catch {
      // PostHog not initialized — analytics never block UX
    }
    persistAbandon(payload);
  }, 0);
}

/** @internal Test-only reset hook. */
export function __resetAbandonStateForTests(): void {
  active = null;
  alreadyEmitted = false;
  abandonedWhileHidden = false;
  pagehideFinalizer = null;
  pendingExtras = null;
}
