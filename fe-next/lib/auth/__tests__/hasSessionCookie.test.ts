import { describe, it, expect } from 'vitest';
import { hasSupabaseSessionCookie } from '@/lib/auth/hasSessionCookie';

describe('hasSupabaseSessionCookie', () => {
  it('sees a whole or chunked Supabase auth cookie', () => {
    expect(hasSupabaseSessionCookie(['sb-abc123-auth-token'])).toBe(true);
    expect(hasSupabaseSessionCookie(['x', 'sb-abc123-auth-token.0'])).toBe(true);
  });
  it('ignores everything else', () => {
    expect(hasSupabaseSessionCookie([])).toBe(false);
    expect(hasSupabaseSessionCookie(['boggle_language', 'sb-abc123-auth-token-code-verifier'])).toBe(false);
  });
});
