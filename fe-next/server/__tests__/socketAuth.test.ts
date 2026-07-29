/**
 * Tests for verifySocketToken — the shared socket-handshake auth policy.
 *
 * Root cause it fixes: the socket handshake used remote `supabase.auth.getUser(token)`
 * on every connect/reconnect. Supabase Auth `/user` was saturated (~2-3s p50, 29s tail),
 * so every MP connection blocked seconds. Local HS256 verify is sub-ms and removes the
 * round-trip; remote is kept only as a fallback (secret unset / foreign token).
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { SignJWT } from 'jose';

const TEST_SECRET = 'test-secret-for-socket-auth-needs-32-chars';

beforeAll(() => {
  process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
});

async function makeToken(secret: string, claims: Record<string, unknown>, exp = '1h'): Promise<string> {
  const key = new TextEncoder().encode(secret);
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(key);
}

/** Minimal supabase stub exposing only auth.getUser. */
function stubSupabase(getUser: (token: string) => Promise<unknown>) {
  return { auth: { getUser: vi.fn(getUser) } };
}

describe('verifySocketToken', () => {
  it('returns null for missing token without touching remote', async () => {
    const { verifySocketToken } = await import('../socketAuth');
    const supabase = stubSupabase(async () => ({ data: { user: null }, error: null }));
    const result = await verifySocketToken(undefined, supabase as never);
    expect(result).toBeNull();
    expect(supabase.auth.getUser).not.toHaveBeenCalled();
  });

  it('verifies a valid token LOCALLY without any remote call (the fix)', async () => {
    const { verifySocketToken } = await import('../socketAuth');
    const supabase = stubSupabase(async () => {
      throw new Error('remote should not be called on local hit');
    });
    const token = await makeToken(TEST_SECRET, { sub: 'user-abc', email: 'p@q.com', role: 'authenticated' });
    const result = await verifySocketToken(token, supabase as never);
    expect(result).toEqual({ userId: 'user-abc', email: 'p@q.com' });
    expect(supabase.auth.getUser).not.toHaveBeenCalled();
  });

  it('falls back to remote when local verify misses (foreign-signed token)', async () => {
    const { verifySocketToken } = await import('../socketAuth');
    const foreign = await makeToken('a-totally-different-secret-32-characters', { sub: 'user-xyz' });
    const supabase = stubSupabase(async () => ({
      data: { user: { id: 'user-xyz', email: 'remote@x.com' } },
      error: null,
    }));
    const result = await verifySocketToken(foreign, supabase as never);
    expect(result).toEqual({ userId: 'user-xyz', email: 'remote@x.com' });
    expect(supabase.auth.getUser).toHaveBeenCalledTimes(1);
  });

  it('returns null when remote fallback finds no user', async () => {
    const { verifySocketToken } = await import('../socketAuth');
    const foreign = await makeToken('another-different-secret-32-characters!!', { sub: 'nope' });
    const supabase = stubSupabase(async () => ({ data: { user: null }, error: { message: 'invalid' } }));
    const result = await verifySocketToken(foreign, supabase as never);
    expect(result).toBeNull();
  });

  it('returns null (no throw) when remote fallback hangs past timeout', async () => {
    const { verifySocketToken } = await import('../socketAuth');
    const foreign = await makeToken('yet-another-different-secret-32-charsss!!', { sub: 'slow' });
    const supabase = stubSupabase(() => new Promise(() => {})); // never resolves
    const result = await verifySocketToken(foreign, supabase as never, 50);
    expect(result).toBeNull();
  });

  it('returns null when local misses and no supabase client is available', async () => {
    const { verifySocketToken } = await import('../socketAuth');
    const foreign = await makeToken('sixth-distinct-secret-32-characters!!!!!', { sub: 'noclient' });
    const result = await verifySocketToken(foreign, null, 50);
    expect(result).toBeNull();
  });
});
