/**
 * isCountableSignupUser (t_b6131f7d) — anonymous Supabase sessions (classroom
 * guest students) must never count as signups: no signup_completed, no
 * fresh-signup mark, no attribution write.
 */
import { describe, expect, it } from 'vitest';
import { isCountableSignupUser } from '../signupCountability';

describe('isCountableSignupUser', () => {
  it('rejects an anonymous (classroom guest) session', () => {
    expect(isCountableSignupUser({ is_anonymous: true })).toBe(false);
  });

  it('accepts a regular registered user', () => {
    expect(isCountableSignupUser({ is_anonymous: false })).toBe(true);
  });

  it('accepts a user whose flag is missing or null (non-anon default)', () => {
    expect(isCountableSignupUser({})).toBe(true);
    expect(isCountableSignupUser({ is_anonymous: null })).toBe(true);
  });

  it('rejects a missing user (no signup without an account)', () => {
    expect(isCountableSignupUser(null)).toBe(false);
    expect(isCountableSignupUser(undefined)).toBe(false);
  });
});
