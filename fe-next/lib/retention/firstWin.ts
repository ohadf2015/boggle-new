/**
 * First-win-fast helpers — the D1 activation lever. A first-time player should
 * reach a win-feeling moment within 60 seconds of starting their first game.
 *
 * Three pieces:
 *  1. A monotonic "first-win clock" stamped when a brand-new player starts
 *     their first-ever game; consumed when the first win lands, yielding
 *     `time_to_first_win_sec` on the `first_game_won` PostHog event.
 *  2. The first-win game config: a brand-new player's first solo-bots round
 *     is an EASY 60-second board against ONE easy bot — nearly unwinnable to
 *     lose, over in a minute.
 *  3. A pending flag + window event so the push-notification prompt can fire
 *     immediately after the first win (instead of waiting for the
 *     MIN_GAMES_BEFORE_PROMPT threshold).
 */

export const FIRST_WIN_WON_KEY = 'lexiclash_first_game_won';
export const FIRST_WIN_PLAYED_KEY = 'lexiclash_first_game_played';
const FIRST_WIN_CLOCK_KEY = 'lexiclash_first_win_clock_started_at';
export const FIRST_WIN_PROMPT_PENDING_KEY = 'lexiclash_first_win_prompt_pending';
export const FIRST_WIN_EVENT = 'lexiclash:first-win';

/** True when this device has not recorded a first win yet. */
export function isFirstWinPending(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return !window.localStorage.getItem(FIRST_WIN_WON_KEY);
  } catch {
    return false;
  }
}

/** True for a brand-new player: no completed game and no win on this device. */
export function isFirstSessionPlayer(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return (
      !window.localStorage.getItem(FIRST_WIN_PLAYED_KEY) &&
      !window.localStorage.getItem(FIRST_WIN_WON_KEY)
    );
  } catch {
    return false;
  }
}

/**
 * Stamp the first-win clock on a brand-new player's first game start.
 * No-op for returning players (win already recorded or clock already running).
 */
export function stampFirstWinClockStart(nowMs: number = Date.now()): void {
  if (typeof window === 'undefined') return;
  try {
    if (!isFirstSessionPlayer()) return;
    if (window.localStorage.getItem(FIRST_WIN_CLOCK_KEY)) return;
    window.localStorage.setItem(FIRST_WIN_CLOCK_KEY, String(nowMs));
  } catch {
    /* localStorage unavailable — clock is best-effort */
  }
}

/**
 * Read + clear the first-win clock, returning elapsed seconds. Returns null
 * when no clock was stamped (returning player, or storage unavailable).
 */
export function consumeFirstWinClockSeconds(nowMs: number = Date.now()): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(FIRST_WIN_CLOCK_KEY);
    if (!raw) return null;
    window.localStorage.removeItem(FIRST_WIN_CLOCK_KEY);
    const started = parseInt(raw, 10);
    if (Number.isNaN(started) || started <= 0) return null;
    return Math.max(0, Math.round((nowMs - started) / 1000));
  } catch {
    return null;
  }
}

/**
 * Flag that a first win just landed and the push prompt should show at the
 * next opportunity, and notify any mounted prompt immediately.
 */
export function markFirstWinPromptPending(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(FIRST_WIN_PROMPT_PENDING_KEY, '1');
  } catch {
    /* best-effort */
  }
  try {
    window.dispatchEvent(new Event(FIRST_WIN_EVENT));
  } catch {
    /* non-DOM environment */
  }
}

/** Read + clear the pending first-win prompt flag. */
export function consumeFirstWinPromptPending(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const pending = window.localStorage.getItem(FIRST_WIN_PROMPT_PENDING_KEY) === '1';
    if (pending) window.localStorage.removeItem(FIRST_WIN_PROMPT_PENDING_KEY);
    return pending;
  } catch {
    return false;
  }
}

/** Peek at the pending flag without clearing (the prompt decides when to consume). */
export function hasFirstWinPromptPending(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(FIRST_WIN_PROMPT_PENDING_KEY) === '1';
  } catch {
    return false;
  }
}
