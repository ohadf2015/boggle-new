// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SignJWT } from 'jose';
import { createChunks, stringToBase64URL } from '@supabase/ssr';

const TEST_SECRET = 'test-secret-for-jwt-verify-needs-32-chars';
const COOKIE_KEY = 'sb-proj-auth-token';

async function makeToken(claims: Record<string, unknown>, opts: { secret?: string; exp?: string | number } = {}) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(opts.exp ?? '1h')
    .setIssuer('https://proj.supabase.co/auth/v1')
    .setAudience('authenticated')
    .sign(new TextEncoder().encode(opts.secret ?? TEST_SECRET));
}

function sessionCookie(accessToken: string, padding = ''): string {
  const value = `base64-${stringToBase64URL(JSON.stringify({ access_token: accessToken, refresh_token: 'r', padding }))}`;
  return createChunks(COOKIE_KEY, value).map((c) => `${c.name}=${c.value}`).join('; ');
}

function req(method: string, cookie: string): Request {
  return new Request('http://x/api/thing', { method, headers: { cookie } });
}

const mockGetUser = vi.fn();
vi.mock('@/utils/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mockGetUser } }),
}));

import { getAuthedUser } from '../getAuthedUser';

describe('getAuthedUser with a cookie session', () => {
  beforeEach(() => {
    vi.stubEnv('SUPABASE_JWT_SECRET', TEST_SECRET);
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://proj.supabase.co');
    mockGetUser.mockReset();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'remote-1' } }, error: null });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('verifies a GET locally from the session cookie without calling Supabase Auth', async () => {
    const token = await makeToken({ sub: 'u-cookie', email: 'c@x.com' });
    const user = await getAuthedUser(req('GET', sessionCookie(token)));
    expect(user).toMatchObject({ id: 'u-cookie', email: 'c@x.com' });
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('reads a session split across chunked cookies', async () => {
    const token = await makeToken({ sub: 'u-chunked' });
    const cookie = sessionCookie(token, 'x'.repeat(5000));
    expect(cookie).toContain(`${COOKIE_KEY}.1=`);
    const user = await getAuthedUser(req('GET', cookie));
    expect(user?.id).toBe('u-chunked');
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('keeps remote verification for a POST even with a valid session cookie', async () => {
    const token = await makeToken({ sub: 'u-cookie' });
    const user = await getAuthedUser(req('POST', sessionCookie(token)));
    expect(user?.id).toBe('remote-1');
    expect(mockGetUser).toHaveBeenCalledTimes(1);
  });

  it('keeps remote verification for a GET that writes, even with a valid session cookie', async () => {
    const token = await makeToken({ sub: 'u-cookie' });
    const user = await getAuthedUser(req('GET', sessionCookie(token)), { writes: true });
    expect(user?.id).toBe('remote-1');
    expect(mockGetUser).toHaveBeenCalledTimes(1);
  });

  it('falls back to remote for a token signed with another secret', async () => {
    const token = await makeToken({ sub: 'forged' }, { secret: 'another-secret-that-is-32-chars-long!!' });
    const user = await getAuthedUser(req('GET', sessionCookie(token)));
    expect(user?.id).toBe('remote-1');
    expect(mockGetUser).toHaveBeenCalledTimes(1);
  });

  it('falls back to remote for an expired token', async () => {
    const token = await makeToken({ sub: 'u-old' }, { exp: Math.floor(Date.now() / 1000) - 60 });
    const user = await getAuthedUser(req('GET', sessionCookie(token)));
    expect(user?.id).toBe('remote-1');
  });

  it('falls back to remote for a malformed cookie', async () => {
    const user = await getAuthedUser(req('GET', `${COOKIE_KEY}=base64-%%%not-json`));
    expect(user?.id).toBe('remote-1');
  });
});
