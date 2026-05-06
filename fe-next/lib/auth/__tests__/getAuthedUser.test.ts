/**
 * getAuthedUser: Tier-A wrapper that tries local JWT verify first,
 * falls back to remote auth.getUser() when local fails or env missing.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SignJWT } from 'jose';

const TEST_SECRET = 'test-secret-for-jwt-verify-needs-32-chars';

async function makeToken(claims: Record<string, unknown>): Promise<string> {
  const secret = new TextEncoder().encode(TEST_SECRET);
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
}

const mockGetUser = vi.fn();
vi.mock('@/utils/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
  }),
}));

describe('getAuthedUser', () => {
  beforeEach(() => {
    process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
    mockGetUser.mockReset();
  });

  afterEach(() => {
    delete process.env.SUPABASE_JWT_SECRET;
  });

  it('uses local verify when bearer token + secret present', async () => {
    const { getAuthedUser } = await import('../getAuthedUser');
    const token = await makeToken({ sub: 'u-1', email: 'a@b.com' });
    const req = new Request('http://x', { headers: { authorization: `Bearer ${token}` } });
    const user = await getAuthedUser(req);
    expect(user).toMatchObject({ id: 'u-1', email: 'a@b.com' });
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('falls back to remote when no bearer token', async () => {
    const { getAuthedUser } = await import('../getAuthedUser');
    mockGetUser.mockResolvedValue({ data: { user: { id: 'remote-1', email: 'r@x.com' } }, error: null });
    const req = new Request('http://x');
    const user = await getAuthedUser(req);
    expect(user).toEqual({ id: 'remote-1', email: 'r@x.com', role: undefined });
    expect(mockGetUser).toHaveBeenCalledTimes(1);
  });

  it('falls back to remote when SUPABASE_JWT_SECRET missing', async () => {
    delete process.env.SUPABASE_JWT_SECRET;
    const { getAuthedUser } = await import('../getAuthedUser?t=' + Date.now());
    mockGetUser.mockResolvedValue({ data: { user: { id: 'remote-2' } }, error: null });
    const token = await makeToken({ sub: 'u-1' });
    const req = new Request('http://x', { headers: { authorization: `Bearer ${token}` } });
    const user = await getAuthedUser(req);
    expect(user).toMatchObject({ id: 'remote-2' });
    expect(mockGetUser).toHaveBeenCalledTimes(1);
  });

  it('returns null when both local and remote fail', async () => {
    const { getAuthedUser } = await import('../getAuthedUser');
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'no session' } });
    const req = new Request('http://x', { headers: { authorization: 'Bearer not-a-jwt' } });
    const user = await getAuthedUser(req);
    expect(user).toBeNull();
  });

  it('falls back to remote when local verify fails (bad signature)', async () => {
    const { getAuthedUser } = await import('../getAuthedUser');
    const wrongSecret = new TextEncoder().encode('different-secret-also-32-chars-or-more');
    const tampered = await new SignJWT({ sub: 'u-1' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(wrongSecret);
    mockGetUser.mockResolvedValue({ data: { user: { id: 'remote-3' } }, error: null });
    const req = new Request('http://x', { headers: { authorization: `Bearer ${tampered}` } });
    const user = await getAuthedUser(req);
    expect(user).toMatchObject({ id: 'remote-3' });
    expect(mockGetUser).toHaveBeenCalledTimes(1);
  });
});
