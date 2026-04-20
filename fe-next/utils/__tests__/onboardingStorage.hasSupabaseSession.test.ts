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
});
