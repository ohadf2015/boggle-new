/**
 * shouldReloadAfterSignIn — decides whether a fresh sign-in should hard-reload
 * the page so every route re-renders in authenticated mode.
 */
import { describe, it, expect } from 'vitest';
import { shouldReloadAfterSignIn } from '@/contexts/auth/reloadOnSignIn';

describe('shouldReloadAfterSignIn', () => {
  it('reloads on a genuine guest → authenticated SIGNED_IN', () => {
    expect(
      shouldReloadAfterSignIn('SIGNED_IN', { wasUnauthenticated: true, pathname: '/en' })
    ).toBe(true);
  });

  it('does NOT reload on INITIAL_SESSION (page-load session restore → would loop)', () => {
    expect(
      shouldReloadAfterSignIn('INITIAL_SESSION', { wasUnauthenticated: true, pathname: '/en' })
    ).toBe(false);
  });

  it('does NOT reload on TOKEN_REFRESHED', () => {
    expect(
      shouldReloadAfterSignIn('TOKEN_REFRESHED', { wasUnauthenticated: false, pathname: '/en' })
    ).toBe(false);
  });

  it('does NOT reload when the user was already authenticated (refocus / same id)', () => {
    expect(
      shouldReloadAfterSignIn('SIGNED_IN', { wasUnauthenticated: false, pathname: '/en' })
    ).toBe(false);
  });

  it('does NOT reload while on the OAuth callback route (it navigates itself)', () => {
    expect(
      shouldReloadAfterSignIn('SIGNED_IN', { wasUnauthenticated: true, pathname: '/en/auth/callback' })
    ).toBe(false);
    expect(
      shouldReloadAfterSignIn('SIGNED_IN', {
        wasUnauthenticated: true,
        pathname: '/he/auth/callback',
      })
    ).toBe(false);
  });

  it('does NOT reload when the new session is anonymous (guest CREATION, not guest → registered)', () => {
    // `signInAnonymously()` emits SIGNED_IN with wasUnauthenticated=true, which is
    // indistinguishable from a real sign-up unless we look at is_anonymous. Reloading
    // here tears down the in-flight flow that just minted the guest — e.g. the
    // classroom-join POST and its success navigation.
    expect(
      shouldReloadAfterSignIn('SIGNED_IN', {
        wasUnauthenticated: true,
        pathname: '/en/join/4HCDMS',
        isAnonymous: true,
      })
    ).toBe(false);
  });

  it('still reloads when an anonymous guest upgrades to a real account', () => {
    expect(
      shouldReloadAfterSignIn('SIGNED_IN', {
        wasUnauthenticated: true,
        pathname: '/en',
        isAnonymous: false,
      })
    ).toBe(true);
  });

  it('reloads regardless of locale prefix on normal routes', () => {
    for (const p of ['/en', '/he/multiplayer', '/ja/daily', '/es/singleplayer']) {
      expect(shouldReloadAfterSignIn('SIGNED_IN', { wasUnauthenticated: true, pathname: p })).toBe(
        true
      );
    }
  });
});
