/**
 * getBearerUser: auth helper for Bearer-token API routes (client sends
 * `Authorization: Bearer <jwt>`, no cookie session). Tries local JWT verify
 * first (sub-ms, no network) and only falls back to a remote token round-trip
 * when local verify misses — so the per-request network call that caused the
 * churn-signals Railway 502 disappears for the legit-token hot path, while the
 * remote fallback keeps behavior identical when SUPABASE_JWT_SECRET is absent
 * or the provisioned secret doesn't match (no regression, no 401 outage).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SignJWT } from 'jose';

const TEST_SECRET = 'test-secret-for-jwt-verify-needs-32-chars';

async function makeToken(claims: Record<string, unknown>, secret = TEST_SECRET): Promise<string> {
  const key = new TextEncoder().encode(secret);
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(key);
}

const mockGetUser = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ auth: { getUser: mockGetUser } })),
}));

const mockCaptureMessage = vi.fn();
vi.mock('@sentry/nextjs', () => ({
  captureMessage: (...a: unknown[]) => mockCaptureMessage(...a),
}));

const bearer = (token: string) =>
  new Request('http://x/api', { headers: { authorization: `Bearer ${token}` } });

describe('getBearerUser', () => {
  beforeEach(() => {
    process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    mockGetUser.mockReset();
    mockCaptureMessage.mockReset();
  });

  afterEach(() => {
    delete process.env.SUPABASE_JWT_SECRET;
  });

  it('verifies locally with NO network call when secret + valid token present', async () => {
    const { getBearerUser } = await import('../getBearerUser');
    const token = await makeToken({ sub: 'u-1', email: 'a@b.com' });
    const user = await getBearerUser(bearer(token));
    expect(user).toMatchObject({ id: 'u-1', email: 'a@b.com' });
    // The whole point of the fix: the legit-token path never hits the network.
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('returns null and skips the network when no Authorization header', async () => {
    const { getBearerUser } = await import('../getBearerUser');
    const user = await getBearerUser(new Request('http://x/api'));
    expect(user).toBeNull();
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('falls back to remote token verify when SUPABASE_JWT_SECRET is absent (no regression)', async () => {
    delete process.env.SUPABASE_JWT_SECRET;
    const { getBearerUser } = await import('../getBearerUser?t=' + Date.now());
    mockGetUser.mockResolvedValue({ data: { user: { id: 'remote-1', email: 'r@x.com' } }, error: null });
    const token = await makeToken({ sub: 'u-1' });
    const user = await getBearerUser(bearer(token));
    expect(user).toMatchObject({ id: 'remote-1', email: 'r@x.com' });
    expect(mockGetUser).toHaveBeenCalledTimes(1);
    expect(mockGetUser).toHaveBeenCalledWith(token);
  });

  it('falls back to remote token verify when local verify fails (wrong-secret token)', async () => {
    const { getBearerUser } = await import('../getBearerUser');
    const tampered = await makeToken({ sub: 'u-1' }, 'a-totally-different-secret-32-chars-min');
    mockGetUser.mockResolvedValue({ data: { user: { id: 'remote-2' } }, error: null });
    const user = await getBearerUser(bearer(tampered));
    expect(user).toMatchObject({ id: 'remote-2' });
    expect(mockGetUser).toHaveBeenCalledTimes(1);
  });

  it('returns null when local verify fails and remote has no user', async () => {
    const { getBearerUser } = await import('../getBearerUser');
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'invalid' } });
    const user = await getBearerUser(bearer('not.a.jwt'));
    expect(user).toBeNull();
  });

  // Canary: when the secret is ENTIRELY ABSENT, every bearer call takes the
  // uncapped remote-auth round-trip that hangs Railway's proxy → the real root of
  // the churn-signals 502s (JAVASCRIPT-NEXTJS-1KQ). The client beacon no longer
  // alarms on those 502s, so this server-side warning is the signal that the
  // provisioned secret has dropped — kept while the client noise is silenced.
  it('alarms (throttled Sentry warning) when SUPABASE_JWT_SECRET is absent on the fallback path', async () => {
    delete process.env.SUPABASE_JWT_SECRET;
    const { getBearerUser } = await import('../getBearerUser?canary=' + Date.now());
    mockGetUser.mockResolvedValue({ data: { user: { id: 'remote-1' } }, error: null });
    const token = await makeToken({ sub: 'u-1' });

    await getBearerUser(bearer(token));

    expect(mockCaptureMessage).toHaveBeenCalledTimes(1);
    expect(String(mockCaptureMessage.mock.calls[0][0])).toMatch(/SUPABASE_JWT_SECRET/);
    expect(mockCaptureMessage.mock.calls[0][1]).toBe('warning');
  });

  it('does NOT alarm when the secret is present (local-verify hot path, no fallback)', async () => {
    const { getBearerUser } = await import('../getBearerUser?present=' + Date.now());
    const token = await makeToken({ sub: 'u-1' });

    await getBearerUser(bearer(token));

    expect(mockCaptureMessage).not.toHaveBeenCalled();
  });

  it('throttles the missing-secret alarm to once per window despite repeated calls', async () => {
    delete process.env.SUPABASE_JWT_SECRET;
    const { getBearerUser } = await import('../getBearerUser?throttle=' + Date.now());
    mockGetUser.mockResolvedValue({ data: { user: { id: 'remote-1' } }, error: null });
    const token = await makeToken({ sub: 'u-1' });

    await getBearerUser(bearer(token));
    await getBearerUser(bearer(token));
    await getBearerUser(bearer(token));

    expect(mockCaptureMessage).toHaveBeenCalledTimes(1);
  });
});
