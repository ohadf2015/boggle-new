/**
 * feedbackThrottle — shared anti-annoyance policy for in-game feedback prompts.
 *
 * One small card asks players "how was that?" on various end-of-game surfaces
 * (multiplayer round, single-player, daily). To never nag, all surfaces share
 * ONE budget:
 *   - global cooldown: at most one prompt per COOLDOWN_DAYS across every surface
 *   - min-games gate: never prompt before a player has finished MIN_GAMES games
 *     (game #1 is the worst time to ask and yields the worst signal)
 *   - per-surface session de-dupe: a given surface asks at most once per session
 *
 * State is intentionally localStorage (cooldown + games survive reloads) +
 * sessionStorage (per-surface de-dupe resets each visit). All access is guarded
 * so SSR / private-mode / quota failures degrade to "don't prompt".
 */

const COOLDOWN_DAYS = 3;
const COOLDOWN_MS = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
const MIN_GAMES = 2;

const LS_LAST_PROMPT = 'lc_fb_last';
const LS_GAMES_SEEN = 'lc_fb_games';

function ls(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function ss(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function getSessionId(): string {
  return ss()?.getItem('lexiclash_session_id') || 'nosession';
}

/** Count this end-of-game view toward the min-games gate (idempotent-ish). */
export function noteGameSeen(): void {
  const store = ls();
  if (!store) return;
  try {
    const n = parseInt(store.getItem(LS_GAMES_SEEN) || '0', 10) || 0;
    store.setItem(LS_GAMES_SEEN, String(n + 1));
  } catch {
    /* ignore */
  }
}

export function gamesSeen(): number {
  const store = ls();
  if (!store) return 0;
  try {
    return parseInt(store.getItem(LS_GAMES_SEEN) || '0', 10) || 0;
  } catch {
    return 0;
  }
}

function withinCooldown(): boolean {
  const store = ls();
  if (!store) return false;
  try {
    const last = parseInt(store.getItem(LS_LAST_PROMPT) || '0', 10) || 0;
    return last > 0 && Date.now() - last < COOLDOWN_MS;
  } catch {
    return false;
  }
}

/** True when the shared budget allows a prompt right now (before per-surface checks). */
export function canPromptGlobally(): boolean {
  return gamesSeen() >= MIN_GAMES && !withinCooldown();
}

/** Open the global cooldown — called whenever a prompt is answered OR dismissed. */
export function markPrompted(): void {
  const store = ls();
  if (!store) return;
  try {
    store.setItem(LS_LAST_PROMPT, String(Date.now()));
  } catch {
    /* ignore */
  }
}

function surfaceKey(surface: string, throttleKey?: string): string {
  return `lc_fb_sess_${getSessionId()}_${surface}_${throttleKey ?? ''}`;
}

export function surfaceHandledThisSession(surface: string, throttleKey?: string): boolean {
  const store = ss();
  if (!store) return false;
  try {
    return store.getItem(surfaceKey(surface, throttleKey)) === '1';
  } catch {
    return false;
  }
}

export function markSurfaceHandled(surface: string, throttleKey?: string): void {
  const store = ss();
  if (!store) return;
  try {
    store.setItem(surfaceKey(surface, throttleKey), '1');
  } catch {
    /* ignore */
  }
}
