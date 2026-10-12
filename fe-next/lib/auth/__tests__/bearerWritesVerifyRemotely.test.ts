import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SignJWT } from 'jose';

const TEST_SECRET = 'test-secret-for-jwt-verify-needs-32-chars';
const SUPABASE_URL = 'https://proj.supabase.co';

const serverGetUser = vi.fn();
vi.mock('@/utils/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: serverGetUser } }),
}));

const anonGetUser = vi.fn();
vi.mock('@/utils/supabase/anon', () => ({
  getAnonClient: () => ({ auth: { getUser: anonGetUser } }),
}));

vi.mock('@sentry/nextjs', () => ({ captureMessage: vi.fn() }));

import { getAuthedUser } from '../getAuthedUser';
import { getBearerUser } from '../getBearerUser';

async function makeToken(opts: { secret?: string; exp?: number | string } = {}): Promise<string> {
  return new SignJWT({ sub: 'u-local', email: 'local@x.com' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
    .setExpirationTime(opts.exp ?? '1h')
    .setIssuer(`${SUPABASE_URL}/auth/v1`)
    .setAudience('authenticated')
    .sign(new TextEncoder().encode(opts.secret ?? TEST_SECRET));
}

const bearerReq = (token: string, method = 'GET') =>
  new Request('http://x/api', {
    method,
    headers: { authorization: `Bearer ${token}` },
    body: method === 'GET' ? undefined : '{}',
  });

const remoteUserFor = (expected: string) => async (token?: string) =>
  token === expected
    ? { data: { user: { id: 'u-remote', email: 'remote@x.com', role: 'authenticated' } }, error: null }
    : { data: { user: null }, error: { message: 'invalid' } };

const noUser = async () => ({ data: { user: null }, error: { message: 'invalid' } });

beforeEach(() => {
  vi.stubEnv('SUPABASE_JWT_SECRET', TEST_SECRET);
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', SUPABASE_URL);
  serverGetUser.mockReset();
  anonGetUser.mockReset();
});

afterEach(() => vi.unstubAllEnvs());

describe.each([
  ['getAuthedUser', getAuthedUser, serverGetUser],
  ['getBearerUser', getBearerUser, anonGetUser],
] as const)('%s with a Bearer token', (_name, helper, remoteGetUser) => {
  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])('%s verifies the token remotely', async (method) => {
    const token = await makeToken();
    remoteGetUser.mockImplementation(remoteUserFor(token));
    const user = await helper(bearerReq(token, method));
    expect(remoteGetUser).toHaveBeenCalledWith(token);
    expect(user).toMatchObject({ id: 'u-remote' });
  });

  it('GET flagged writes verifies the token remotely', async () => {
    const token = await makeToken();
    remoteGetUser.mockImplementation(remoteUserFor(token));
    const user = await helper(bearerReq(token), { writes: true });
    expect(remoteGetUser).toHaveBeenCalledWith(token);
    expect(user).toMatchObject({ id: 'u-remote' });
  });

  it('plain GET verifies locally with no network call', async () => {
    const token = await makeToken();
    const user = await helper(bearerReq(token));
    expect(user).toMatchObject({ id: 'u-local' });
    expect(remoteGetUser).not.toHaveBeenCalled();
  });

  it('POST rejects a token revoked server-side even though it verifies locally', async () => {
    const token = await makeToken();
    remoteGetUser.mockImplementation(noUser);
    expect(await helper(bearerReq(token, 'POST'))).toBeNull();
  });

  it.each([
    ['forged', () => makeToken({ secret: 'attacker-secret-that-is-32-chars-long' })],
    ['expired', () => makeToken({ exp: Math.floor(Date.now() / 1000) - 60 })],
  ])('rejects a %s token on the read and the write path', async (_label, mint) => {
    const token = await mint();
    remoteGetUser.mockImplementation(noUser);
    expect(await helper(bearerReq(token))).toBeNull();
    expect(await helper(bearerReq(token, 'POST'))).toBeNull();
  });
});
