import { describe, it, expect } from 'vitest';
import { isRefreshTokenError, isNetworkError } from '../authUtils';

/**
 * Sentry JAVASCRIPT-NEXTJS-21K — `TypeError: e.code?.toLowerCase is not a function`,
 * unhandled rejection on /he/teacher. `SupabaseAuthError.code` is TYPED `string?`, but
 * the value arriving at runtime is whatever the rejected promise carried: PostgREST
 * errors carry a numeric `code`, and a thrown non-auth object can carry anything.
 * `?.` only guards null/undefined, not "present but not a string", so the predicate
 * that exists to CLASSIFY an error became the thing that threw — replacing the real
 * failure with a TypeError. Same hazard on `message`.
 */
describe('auth error predicates — non-string code/message', () => {
  it('does not throw when code is a number (PostgREST-shaped error)', () => {
    expect(() =>
      isRefreshTokenError({ code: 401 } as never)
    ).not.toThrow();
    expect(isRefreshTokenError({ code: 401 } as never)).toBe(false);
  });

  it('does not throw when message is a non-string', () => {
    expect(() => isRefreshTokenError({ message: { nested: true } } as never)).not.toThrow();
    expect(() => isNetworkError({ message: 500 } as never)).not.toThrow();
  });

  it('still matches real refresh-token errors by code and by message', () => {
    expect(isRefreshTokenError({ code: 'refresh_token_not_found' })).toBe(true);
    expect(isRefreshTokenError({ code: 'BAD_JWT' })).toBe(true);
    expect(isRefreshTokenError({ message: 'JWT expired' })).toBe(true);
  });

  it('returns false for nullish input', () => {
    expect(isRefreshTokenError(null)).toBe(false);
    expect(isNetworkError(undefined)).toBe(false);
  });
});
