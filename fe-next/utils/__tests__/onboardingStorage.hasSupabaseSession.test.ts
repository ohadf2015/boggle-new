import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { hasSupabaseSession } from '@/utils/onboardingStorage';

describe('hasSupabaseSession', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns false when localStorage is empty', () => {
    expect(hasSupabaseSession()).toBe(false);
  });

  it('returns false when only unrelated keys exist', () => {
    localStorage.setItem('lexiclash_onboarding_completed', 'true');
    localStorage.setItem('some_other_key', 'value');
    expect(hasSupabaseSession()).toBe(false);
  });

  it('returns true when a Supabase auth token key exists with a value', () => {
    localStorage.setItem('sb-abc123-auth-token', JSON.stringify({ access_token: 'tok' }));
    expect(hasSupabaseSession()).toBe(true);
  });

  it('returns false when Supabase auth token key exists but value is empty', () => {
    localStorage.setItem('sb-abc123-auth-token', '');
    expect(hasSupabaseSession()).toBe(false);
  });

  it('returns false when key starts with sb- but does not end with -auth-token', () => {
    localStorage.setItem('sb-abc123-something-else', 'value');
    expect(hasSupabaseSession()).toBe(false);
  });

  it('returns true with a different project ref in the key', () => {
    localStorage.setItem('sb-xyzprojectref456-auth-token', '{"access_token":"tok2"}');
    expect(hasSupabaseSession()).toBe(true);
  });

  it('returns false when Supabase wrote literal "null" on signout', () => {
    // Regression: visitors who signed out had `!!getItem("null") === true`
    // and were wrongly flagged as authenticated → skipped FTUE.
    localStorage.setItem('sb-abc123-auth-token', 'null');
    expect(hasSupabaseSession()).toBe(false);
  });

  it('returns false when stored JSON has no access_token', () => {
    localStorage.setItem('sb-abc123-auth-token', JSON.stringify({ user: null, expires_at: 0 }));
    expect(hasSupabaseSession()).toBe(false);
  });

  it('returns false when stored value is non-JSON garbage', () => {
    localStorage.setItem('sb-abc123-auth-token', 'not-json');
    expect(hasSupabaseSession()).toBe(false);
  });

  it('returns true when @supabase/ssr cookie carries a live session', () => {
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      get: () => 'sb-abc123-auth-token=' + encodeURIComponent('{"access_token":"tokC"}'),
    });
    try {
      expect(hasSupabaseSession()).toBe(true);
    } finally {
      Object.defineProperty(document, 'cookie', { configurable: true, value: '' });
    }
  });

  it('returns false when cookie session has no access_token', () => {
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      get: () => 'sb-abc123-auth-token=' + encodeURIComponent('null'),
    });
    try {
      expect(hasSupabaseSession()).toBe(false);
    } finally {
      Object.defineProperty(document, 'cookie', { configurable: true, value: '' });
    }
  });
});
