import { describe, it, expect } from 'vitest';
import { shouldDeferLandingGotrue } from '../landingGotrueDefer';

describe('shouldDeferLandingGotrue', () => {
  it('defers locale landing until the auth chunk has evaluated', () => {
    expect(shouldDeferLandingGotrue('/en', false)).toBe(true);
    expect(shouldDeferLandingGotrue('/en/', false)).toBe(true);
    expect(shouldDeferLandingGotrue('/', false)).toBe(true);
    expect(shouldDeferLandingGotrue('/he', false)).toBe(true);
  });

  it('does not defer once AuthProvider has mounted, even on landing', () => {
    expect(shouldDeferLandingGotrue('/en', true)).toBe(false);
  });

  it('keeps auth eager on auth-required and nested routes', () => {
    expect(shouldDeferLandingGotrue('/en/teacher', false)).toBe(false);
    expect(shouldDeferLandingGotrue('/en/teacher/classroom', false)).toBe(false);
    expect(shouldDeferLandingGotrue('/en/auth/callback', false)).toBe(false);
    expect(shouldDeferLandingGotrue('/en/settings', false)).toBe(false);
    expect(shouldDeferLandingGotrue('', false)).toBe(false);
    expect(shouldDeferLandingGotrue(null, false)).toBe(false);
  });
});
