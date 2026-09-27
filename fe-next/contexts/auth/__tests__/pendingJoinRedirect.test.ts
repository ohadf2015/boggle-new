/**
 * shouldRedirectToPendingJoin — decides whether a SIGNED_IN event should send
 * the student back to `/join/<code>`.
 *
 * The bug this pins down (recurring pitfall class 3, asymmetric paths):
 * `/join/[code]` stores `joinClassroomReturnCode` for any logged-out visitor so
 * a student who picks "sign in" over "play as guest" lands back on the join
 * page afterwards. But the JOIN button itself mints an ANONYMOUS Supabase
 * session (`signInAsGuestStudent`), which emits the very same `SIGNED_IN`.
 * The redirect therefore fired in the middle of the guest join it was supposed
 * to be waiting for, and `window.location.href` — a hard document load — threw
 * away the `router.push('/multiplayer?room=…')` that the join had just queued.
 *
 * Observed as: first JOIN tap silently resets the form (typed name gone, live
 * game banner gone, no error), second tap works because the key was already
 * consumed and the student is now authenticated so no anonymous sign-in fires.
 *
 * The sibling branch — `shouldReloadAfterSignIn` — already carries exactly this
 * `isAnonymous` guard, with a comment naming this flow. Only one of the two
 * paths out of that `if` block ever got it.
 */
import { describe, it, expect } from 'vitest';
import { shouldRedirectToPendingJoin } from '@/contexts/auth/pendingJoinRedirect';

describe('shouldRedirectToPendingJoin', () => {
  it('redirects a real sign-in that has a pending join code', () => {
    expect(
      shouldRedirectToPendingJoin({ pendingJoinCode: 'UY6W8L', isAnonymous: false })
    ).toBe(true);
  });

  it('does NOT redirect when there is no pending join code', () => {
    expect(
      shouldRedirectToPendingJoin({ pendingJoinCode: null, isAnonymous: false })
    ).toBe(false);
  });

  it('does NOT redirect an ANONYMOUS sign-in — that IS the guest join in flight', () => {
    // The regression. The guest join mints this session itself and navigates to
    // the room a moment later; redirecting here destroys that navigation.
    expect(
      shouldRedirectToPendingJoin({ pendingJoinCode: 'UY6W8L', isAnonymous: true })
    ).toBe(false);
  });

  it('treats an empty/blank stored code as no code', () => {
    expect(shouldRedirectToPendingJoin({ pendingJoinCode: '', isAnonymous: false })).toBe(false);
    expect(shouldRedirectToPendingJoin({ pendingJoinCode: '   ', isAnonymous: false })).toBe(false);
  });
});
