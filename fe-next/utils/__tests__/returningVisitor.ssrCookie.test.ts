/**
 * @supabase/ssr stores the session in a cookie as `base64-<base64url(JSON)>`,
 * split into `sb-<ref>-auth-token.0`, `.1`, ... chunks once it is long. A
 * signed-in user whose localStorage is empty (new device, cleared storage)
 * must still count as returning, or the homepage shows them the fresh
 * marketing page instead of their home.
 */
import { describe, it, expect } from 'vitest';
import { readReturningSignals, ONBOARDING_FLAG_KEY, ONBOARDING_FLAG_VALUES } from '../returningVisitor';

const session = JSON.stringify({ access_token: 'tok', refresh_token: 'r', user: { id: 'u1' } });
const b64url = (s: string) =>
  Buffer.from(s, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const ssrValue = 'base64-' + b64url(session);

const check = (cookie: string) =>
  readReturningSignals(null, cookie, ONBOARDING_FLAG_KEY, ONBOARDING_FLAG_VALUES, false);

describe('readReturningSignals with @supabase/ssr cookies', () => {
  it('treats a base64- encoded live session cookie as returning', () => {
    expect(check(`other=1; sb-abc-auth-token=${ssrValue}`)).toBe(true);
  });

  it('reassembles a chunked session cookie (.0, .1) in order', () => {
    const cut = Math.floor(ssrValue.length / 2);
    const cookie = `sb-abc-auth-token.1=${ssrValue.slice(cut)}; sb-abc-auth-token.0=${ssrValue.slice(0, cut)}`;
    expect(check(cookie)).toBe(true);
  });

  it('still ignores a signed-out cookie (no access_token)', () => {
    const out = 'base64-' + b64url(JSON.stringify({ user: null }));
    expect(check(`sb-abc-auth-token=${out}`)).toBe(false);
  });

  it('still accepts the legacy plain-JSON cookie', () => {
    expect(check(`sb-abc-auth-token=${encodeURIComponent(session)}`)).toBe(true);
  });
});
