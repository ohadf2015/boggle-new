/**
 * `growth:account_first_game`: fired once per account, on its first completed
 * game after signup. AuthProvider arms it on the guest → authed flip of a fresh
 * account; trackGameEnd consumes it.
 */

/** Armed until the account's first completed game. Device-scoped, once. */
export const ACCOUNT_FIRST_GAME_PENDING_KEY = 'lexiclash_account_first_game_pending';
export const ACCOUNT_FIRST_GAME_DONE_KEY = 'lexiclash_account_first_game_done';

export interface FreshSignupMark {
  userId: string;
  surface: string;
}

export interface FreshSignupUser {
  id: string;
  is_anonymous?: boolean;
}

function localStore(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    const box = (window as unknown as { localStorage?: Storage }).localStorage;
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

/**
 * Idempotent. Does not re-arm the goal after this account already played.
 * Anonymous sessions (anon classroom students) are not signups.
 */
export function markFreshSignup(user: FreshSignupUser | null | undefined, surface: string | null | undefined): void {
  const userId = user?.id;
  if (!userId || user?.is_anonymous === true) return;
  const local = localStore();
  if (!local) return;
  try {
    if (local.getItem(ACCOUNT_FIRST_GAME_DONE_KEY) === userId) return;
    if (local.getItem(ACCOUNT_FIRST_GAME_PENDING_KEY)) return;
    local.setItem(
      ACCOUNT_FIRST_GAME_PENDING_KEY,
      JSON.stringify({ userId, surface: surface || 'header_or_menu' }),
    );
  } catch {
    /* attribution must never break auth */
  }
}

/**
 * Once per account. Returns the mark the first time a completed game lands
 * after signup, then null. Abandoned games must not call this.
 */
export function consumeAccountFirstGamePending(): FreshSignupMark | null {
  const local = localStore();
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
