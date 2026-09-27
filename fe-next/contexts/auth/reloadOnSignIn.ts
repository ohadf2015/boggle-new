/**
 * Decide whether a Supabase auth-state-change should trigger a full page reload.
 *
 * Why reload at all: large parts of the app (server components, authed chrome,
 * gated landing/onboarding) only re-resolve on a fresh document load. After a
 * guest signs up we want EVERY page to flip into authenticated mode, so we hard
 * reload once on the genuine guest → authenticated transition.
 *
 * Why these exact guards:
 * - `SIGNED_IN` only: a page-load session *restore* fires `INITIAL_SESSION`, so
 *   gating on `SIGNED_IN` means the post-reload restore can't re-trigger a reload
 *   (no loop).
 * - `wasUnauthenticated` only: token refreshes / tab-refocus `SIGNED_IN` events
 *   carry the same user id (already authenticated) — don't reload those.
 * - skip on the OAuth callback route: it performs its own `router.replace`, so a
 *   blind reload there would fight / duplicate that navigation.
 * - skip anonymous sessions: `signInAnonymously()` also emits `SIGNED_IN` with no
 *   prior user, so it looks exactly like a sign-up. But that is guest *creation*,
 *   not the guest → registered upgrade this reload is for, and it happens midway
 *   through a flow that is still running (guest classroom-join mints the session,
 *   then POSTs, then navigates). Reloading there destroys the rest of that flow.
 */
const CALLBACK_PATH_RE = /\/auth\/callback(\/|$|\?|#)/;

export interface ReloadDecisionContext {
  /** True when no user was authenticated immediately before this event. */
  wasUnauthenticated: boolean;
  /** Current `window.location.pathname`. */
  pathname: string;
  /** True when the newly signed-in user is a Supabase anonymous (guest) user. */
  isAnonymous?: boolean;
}

export function shouldReloadAfterSignIn(event: string, ctx: ReloadDecisionContext): boolean {
  if (event !== 'SIGNED_IN') return false;
  if (!ctx.wasUnauthenticated) return false;
  if (CALLBACK_PATH_RE.test(ctx.pathname)) return false;
  if (ctx.isAnonymous) return false;
  return true;
}
