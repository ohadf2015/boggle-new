/**
 * Tests for local JWT verify helper.
 * Uses HS256 since Supabase auth tokens are HS256-signed with SUPABASE_JWT_SECRET.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { SignJWT } from 'jose';

const TEST_SECRET = 'test-secret-for-jwt-verify-needs-32-chars';

beforeAll(() => {
  process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
});

async function makeToken(claims: Record<string, unknown>, exp = '1h'): Promise<string> {
  const secret = new TextEncoder().encode(TEST_SECRET);
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(secret);
}

describe('verifyJwtLocal', () => {
  it('returns user for valid token', async () => {
    const { verifyJwtLocal } = await import('../verifyJwt');
    const token = await makeToken({ sub: 'user-123', email: 'a@b.com', role: 'authenticated' });
    const user = await verifyJwtLocal(token);
    expect(user).toEqual({ id: 'user-123', email: 'a@b.com', role: 'authenticated' });
  });

  it('returns null for invalid signature', async () => {
    const { verifyJwtLocal } = await import('../verifyJwt');
    const wrongSecret = new TextEncoder().encode('wrong-secret-also-32-chars-or-more');
    const tampered = await new SignJWT({ sub: 'user-123' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(wrongSecret);
    const user = await verifyJwtLocal(tampered);
    expect(user).toBeNull();
  });

  it('returns null for expired token', async () => {
    const { verifyJwtLocal } = await import('../verifyJwt');
    const secret = new TextEncoder().encode(TEST_SECRET);
    const expired = await new SignJWT({ sub: 'user-123' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 3600)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 1)
      .sign(secret);
    const user = await verifyJwtLocal(expired);
    expect(user).toBeNull();
  });

  it('returns null for malformed token', async () => {
    const { verifyJwtLocal } = await import('../verifyJwt');
    expect(await verifyJwtLocal('not-a-jwt')).toBeNull();
    expect(await verifyJwtLocal('')).toBeNull();
  });

  it('returns null when SUPABASE_JWT_SECRET not configured', async () => {
    const original = process.env.SUPABASE_JWT_SECRET;
    delete process.env.SUPABASE_JWT_SECRET;
    // Re-import after env change to pick up the absence.
    const mod = await import('../verifyJwt?t=' + Date.now());
    expect(await mod.verifyJwtLocal('any.token.here')).toBeNull();
    process.env.SUPABASE_JWT_SECRET = original;
  });
});

describe('bearerToken', () => {
  it('extracts bearer token from header', async () => {
    const { bearerToken } = await import('../verifyJwt');
    const req = new Request('http://x', { headers: { authorization: 'Bearer xyz.123.abc' } });
    expect(bearerToken(req)).toBe('xyz.123.abc');
  });

  it('returns null when no auth header', async () => {
    const { bearerToken } = await import('../verifyJwt');
    const req = new Request('http://x');
    expect(bearerToken(req)).toBeNull();
  });

  it('returns null for non-bearer scheme', async () => {
    const { bearerToken } = await import('../verifyJwt');
    const req = new Request('http://x', { headers: { authorization: 'Basic xyz' } });
    expect(bearerToken(req)).toBeNull();
  });
});
