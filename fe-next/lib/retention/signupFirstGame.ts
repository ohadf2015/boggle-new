/**
 * Post-signup first game (t_3b095edf, reach fix t_5ebe9081).
 *
 * 45% of new student accounts never play in the 24h after signup, and those
 * almost never come back. Signups that start from a game moment keep playing;
 * signups from navigation (header/menu, edu access as a student, a first-win
 * sheet with nothing to resume) need one visible door into a game.
 *
 * Eligibility comes from the fresh-signup mark AuthProvider writes on the
 * guest → authed flip (FRESH_SIGNUP_KEY) plus the CURRENT ROUTE — not from
 * the auth/callback redirect. Google One Tap / in-page ID-token signups (the
 * large majority) never navigate through /auth/callback, and redirect
 * providers always carry next=<the page they were on>, so a "landed on home
 * by default redirect" marker can never arm for them (0 exposures in the
 * first 16h of #1503).
 *
 * Assignment is a Growth Radar flag (`signup-first-game`). Null or `control`
 * renders nothing. Only `play` renders the card. getFlag logs the exposure,
 * so callers must pass enabled=false until the visitor is actually eligible.
 * Teachers, anonymous sessions, explicit game deep links, and active game /
 * room / daily routes never enter the test.
 *
 * The goal both arms can reach is `growth:account_first_game`, fired once
 * per account on its first completed game after signup — not `growth:game_started`
 * (control already converts ~89% on that).
 */

import { stripLocalePrefix } from '@/lib/perf/heavyGamePath';
import { quickMatchHref, wordWheelBridgeHref } from './firstGameBridge';

export const SIGNUP_FIRST_GAME_KEY = 'signup-first-game';
export const SIGNUP_FIRST_GAME_TREATMENT = 'play';

/** Set by AuthProvider for a genuinely fresh account. Session-scoped. */
export const FRESH_SIGNUP_KEY = 'lexiclash_fresh_signup';
/** Armed until the account's first completed game. Device-scoped, once. */
export const ACCOUNT_FIRST_GAME_PENDING_KEY = 'lexiclash_account_first_game_pending';
export const ACCOUNT_FIRST_GAME_DONE_KEY = 'lexiclash_account_first_game_done';

const GAME_CONTEXT_SURFACES = new Set([
  'results_inline',
  'practice_results',
  'mp_sheet',
  'multi_games_sheet',
  'multi_games_dialog',
  'multi_game_prompt',
  'multi_game',
]);

const FIRST_WIN_SURFACES = new Set([
  'first_win_sheet',
  'first_win_dialog',
  'first_win_prompt',
  'first_win',
]);

export interface FreshSignupMark {
  userId: string;
  surface: string;
}

export interface SignupFirstGameOffer {
  expose: boolean;
  surface: string;
  userId: string;
}

export function isTeacherRole(role: string | null | undefined): boolean {
  return role === 'teacher' || role === 'admin';
}

/**
 * Navigation signups that have nothing to resume. A first-win sheet only
 * qualifies when no game is waiting (room invite or pending daily result);
 * an explicit game deep link is excluded by route eligibility instead
 * (isSignupFirstGamePath). Game-context surfaces already have a reason to
 * play and stay out.
 */
export function isSignupFirstGameSurface(
  surface: string | null | undefined,
  pendingGame: boolean,
): boolean {
  const value = (surface || 'header_or_menu').trim();
  if (GAME_CONTEXT_SURFACES.has(value)) return false;
  if (FIRST_WIN_SURFACES.has(value) || value.startsWith('first_win')) return !pendingGame;
  if (/sheet|inline|results|multi_game|mp_/.test(value)) return false;
  return true;
}

export function signupQuickPlayHref(locale: string): string {
  return quickMatchHref(locale);
}

/**
 * Routes where the card must never arm: an active game or room, a daily in
 * progress, and the auth flow itself. SEO landings (`/sv/swedish-multiplayer-word-game`,
 * `/blast`, `/word-tower`, …) stay eligible — they are content pages with game
 * links, exactly where an in-page Google signup leaves a fresh account.
 */
const GAME_ROUTE_PREFIXES = [
  '/singleplayer',
  '/multiplayer',
  '/player',
  '/join',
  '/quick-play',
  '/daily',
  '/challenge',
  '/friend-challenge',
  '/adventure',
  '/education/live',
  '/custom',
  '/brain',
  '/embed',
  '/auth',
] as const;

export function isSignupFirstGamePath(pathname: string | null | undefined): boolean {
  // Unknown route: no evidence of a game context — the storage guards still decide.
  if (!pathname) return true;
  const path = stripLocalePrefix(pathname);
  return !GAME_ROUTE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

/** Home (`/` or `/{locale}`) — the inline slot there wins over the floating card. */
export function isSignupFirstGameHomePath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return stripLocalePrefix(pathname) === '/';
}

export function signupDailyHref(locale: string): string {
  return wordWheelBridgeHref(locale);
}

export function signupFirstName(
  displayName?: string | null,
  username?: string | null,
): string {
  const raw = (displayName || username || '').trim();
  if (!raw) return '';
  return raw.split(/\s+/)[0].slice(0, 24);
}

function storage(kind: 'localStorage' | 'sessionStorage'): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    const box = (window as unknown as Record<string, Storage | undefined>)[kind];
    if (!box || typeof box.getItem !== 'function') return null;
    return box;
  } catch {
    return null;
  }
}

function readJson(raw: string | null): FreshSignupMark | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { userId?: unknown; surface?: unknown };
    if (typeof parsed.userId !== 'string' || !parsed.userId) return null;
    return {
      userId: parsed.userId,
      surface: typeof parsed.surface === 'string' ? parsed.surface : 'header_or_menu',
    };
  } catch {
    return null;
  }
}

export interface FreshSignupUser {
  id: string;
  is_anonymous?: boolean;
}

/**
 * Idempotent. Does not re-arm the goal after this account already played.
 * Anonymous sessions (anon classroom students) are not signups: they never
 * arm the card or the goal (signup-event-anon-guard, t_5ebe9081).
 */
export function markFreshSignup(user: FreshSignupUser | null | undefined, surface: string | null | undefined): void {
  const userId = user?.id;
  if (!userId || user?.is_anonymous === true) return;
  const session = storage('sessionStorage');
  const local = storage('localStorage');
  if (!session || !local) return;
  const safeSurface = surface || 'header_or_menu';
  try {
    session.setItem(
      FRESH_SIGNUP_KEY,
      JSON.stringify({ userId, surface: safeSurface }),
    );
    if (local.getItem(ACCOUNT_FIRST_GAME_DONE_KEY) === userId) return;
    if (local.getItem(ACCOUNT_FIRST_GAME_PENDING_KEY)) return;
    local.setItem(
      ACCOUNT_FIRST_GAME_PENDING_KEY,
      JSON.stringify({ userId, surface: safeSurface }),
    );
  } catch {
    /* attribution must never break auth */
  }
}

export function peekAccountFirstGamePending(): FreshSignupMark | null {
  const local = storage('localStorage');
  if (!local) return null;
  try {
    return readJson(local.getItem(ACCOUNT_FIRST_GAME_PENDING_KEY));
  } catch {
    return null;
  }
}

/**
 * Once per account. Returns the mark the first time a completed game lands
 * after signup, then null. Abandoned games must not call this.
 */
export function consumeAccountFirstGamePending(): FreshSignupMark | null {
  const local = storage('localStorage');
  if (!local) return null;
  try {
    const pending = readJson(local.getItem(ACCOUNT_FIRST_GAME_PENDING_KEY));
    if (!pending) return null;
    local.removeItem(ACCOUNT_FIRST_GAME_PENDING_KEY);
    local.setItem(ACCOUNT_FIRST_GAME_DONE_KEY, pending.userId);
    return pending;
  } catch {
    return null;
  }
}

export interface SignupFirstGameRead {
  /** Current route is not an active game / room / daily / auth page. */
  pathEligible: boolean;
  fresh: FreshSignupMark | null;
  pendingGame: boolean;
  role: string | null | undefined;
  userId: string | null | undefined;
  isAnonymous?: boolean;
  stillPending: boolean;
}

export function offerFromRead(read: SignupFirstGameRead): SignupFirstGameOffer | null {
  if (!read.pathEligible || !read.fresh) return null;
  if (!read.userId || read.fresh.userId !== read.userId) return null;
  if (read.isAnonymous === true) return null;
  if (isTeacherRole(read.role)) return null;
  if (!isSignupFirstGameSurface(read.fresh.surface, read.pendingGame)) return null;
  if (!read.stillPending) return null;
  return { expose: true, surface: read.fresh.surface, userId: read.userId };
}

export function shouldShowSignupFirstGame(
  offer: SignupFirstGameOffer | null,
  variant: string | null,
): boolean {
  return offer?.expose === true && variant === SIGNUP_FIRST_GAME_TREATMENT;
}
