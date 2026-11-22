/**
 * One surface id per signup prompt (t_39705c3f).
 *
 * Shown, clicked, dismissed, and signup_completed must share this id or the
 * funnel cannot be read. Click-side aliases (`multi_games_sheet`,
 * `first_win_sheet`) collapse onto the id the shown event already fires.
 *
 * The click latch is mirrored to localStorage because an OAuth redirect can
 * drop sessionStorage (in-app browser, partitioned storage). The shown latch
 * is the fallback when the Google tap never emitted a click.
 */

export const SIGNUP_SOURCE_PENDING_KEY = 'lexiclash_signup_source_pending';
export const SIGNUP_SHOWN_SURFACE_KEY = 'lexiclash_signup_surface_shown';

const SURFACE_RE = /^[a-z0-9_-]{1,64}$/;

const ALIASES: Record<string, string> = {
  'soft-sheet': 'soft-sheet',
  soft_sheet: 'soft-sheet',
  multi_games_sheet: 'soft-sheet',
  first_win_sheet: 'soft-sheet',
  first_win_prompt: 'soft-sheet',
  control: 'control',
  dialog: 'control',
  multi_games_dialog: 'control',
  first_win_dialog: 'control',
  mp_sheet: 'mp_sheet',
  edu_access: 'edu_access',
  header_or_menu: 'header_or_menu',
  results_card: 'results_card',
};

/** Map a raw analytics string to the one id that surface uses everywhere. */
export function canonicalSignupSurface(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const id = raw.trim().toLowerCase();
  if (!id) return null;
  if (ALIASES[id]) return ALIASES[id];
  return SURFACE_RE.test(id) ? id : null;
}

/** Id the post-game host prompt emits on shown and on click. */
export function promptSurfaceId(kind: 'sheet' | 'dialog'): string {
  return kind === 'sheet' ? 'soft-sheet' : 'control';
}

function writeBoth(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* private mode */
  }
  try {
    localStorage.setItem(key, value);
  } catch {
    /* quota */
  }
}

function readBoth(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const fromSession = sessionStorage.getItem(key);
    if (fromSession) return fromSession;
  } catch {
    /* ignore */
  }
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function removeBoth(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function consumeKey(key: string): string | null {
  const value = canonicalSignupSurface(readBoth(key));
  removeBoth(key);
  return value;
}

/** Click latch. Canonical id, session + local, so the OAuth return can read it. */
export function latchSignupSurface(source: string): void {
  const id = canonicalSignupSurface(source);
  if (!id) return;
  writeBoth(SIGNUP_SOURCE_PENDING_KEY, id);
}

export function peekSignupSurface(): string | null {
  return canonicalSignupSurface(readBoth(SIGNUP_SOURCE_PENDING_KEY));
}

export function consumeSignupSurface(): string | null {
  return consumeKey(SIGNUP_SOURCE_PENDING_KEY);
}

/** Set when a prompt is shown. Session only — a later tab must not inherit it.
 *  Cleared on dismiss. Same-tab OAuth keeps sessionStorage, so a missed click
 *  still attributes. The click latch (localStorage) is what survives a redirect
 *  that drops sessionStorage. */
export function rememberShownSurface(surface: string): void {
  const id = canonicalSignupSurface(surface);
  if (!id || typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(SIGNUP_SHOWN_SURFACE_KEY, id);
  } catch {
    /* private mode */
  }
}

export function peekShownSurface(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return canonicalSignupSurface(sessionStorage.getItem(SIGNUP_SHOWN_SURFACE_KEY));
  } catch {
    return null;
  }
}

export function consumeShownSurface(): string | null {
  const value = peekShownSurface();
  clearShownSurface();
  return value;
}

export function clearShownSurface(): void {
  removeBoth(SIGNUP_SHOWN_SURFACE_KEY);
}

/**
 * Click wins, then the surface that was still showing, then metadata stashed
 * on the account (email confirm in another browser). `funnelPending` covers
 * a session that showed the prompt before this id existed.
 */
export function resolveSignupSource(args: {
  latched: string | null;
  shown: string | null;
  stashed: string | null;
  funnelPending?: string | null;
}): string {
  return (
    canonicalSignupSurface(args.latched) ??
    canonicalSignupSurface(args.shown) ??
    canonicalSignupSurface(args.stashed) ??
    (args.funnelPending === 'first_win' || args.funnelPending === 'multi_game' ? 'soft-sheet' : null) ??
    'header_or_menu'
  );
}
