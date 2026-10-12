/**
 * Tests for local JWT verify helper.
 * Uses HS256 since Supabase auth tokens are HS256-signed with SUPABASE_JWT_SECRET.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { SignJWT } from 'jose';

const TEST_SECRET = 'test-secret-for-jwt-verify-needs-32-chars';
const ISSUER = 'https://proj.supabase.co/auth/v1';

beforeAll(() => {
  process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://proj.supabase.co';
});

async function makeToken(
  claims: Record<string, unknown>,
  { exp = '1h', iss = ISSUER, aud = 'authenticated' }: { exp?: string; iss?: string | null; aud?: string | null } = {},
): Promise<string> {
  const secret = new TextEncoder().encode(TEST_SECRET);
  const jwt = new SignJWT(claims).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime(exp);
  if (iss) jwt.setIssuer(iss);
  if (aud) jwt.setAudience(aud);
  return jwt.sign(secret);
}

const b64url = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('base64url');

describe('verifyJwtLocal', () => {
  it('returns user for valid token', async () => {
    const { verifyJwtLocal } = await import('../verifyJwt');
    const token = await makeToken({ sub: 'user-123', email: 'a@b.com', role: 'authenticated' });
    const user = await verifyJwtLocal(token);
    expect(user).toEqual({ id: 'user-123', email: 'a@b.com', role: 'authenticated' });
  });

  it.each(['https://proj.supabase.co/', 'https://proj.supabase.co//', ' https://proj.supabase.co/ '])(
    'accepts the Supabase issuer when NEXT_PUBLIC_SUPABASE_URL is %j',
    async (url) => {
      const { verifyJwtLocal } = await import('../verifyJwt');
      const previous = process.env.NEXT_PUBLIC_SUPABASE_URL;
      process.env.NEXT_PUBLIC_SUPABASE_URL = url;
      try {
        expect(await verifyJwtLocal(await makeToken({ sub: 'user-123' }))).toMatchObject({ id: 'user-123' });
        expect(await verifyJwtLocal(await makeToken({ sub: 'user-123' }, { iss: 'https://proj.supabase.co//auth/v1' }))).toBeNull();
      } finally {
        process.env.NEXT_PUBLIC_SUPABASE_URL = previous;
      }
    },
  );

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

  it('rejects a token from another issuer', async () => {
    const { verifyJwtLocal } = await import('../verifyJwt');
    expect(await verifyJwtLocal(await makeToken({ sub: 'user-123' }, { iss: 'https://other.supabase.co/auth/v1' }))).toBeNull();
    expect(await verifyJwtLocal(await makeToken({ sub: 'user-123' }, { iss: null }))).toBeNull();
  });

  it('rejects a token for another audience', async () => {
    const { verifyJwtLocal } = await import('../verifyJwt');
    expect(await verifyJwtLocal(await makeToken({ sub: 'user-123' }, { aud: 'anon' }))).toBeNull();
    expect(await verifyJwtLocal(await makeToken({ sub: 'user-123' }, { aud: null }))).toBeNull();
  });

  it('rejects an unsigned alg:none token', async () => {
    const { verifyJwtLocal } = await import('../verifyJwt');
    const now = Math.floor(Date.now() / 1000);
    const unsigned = `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url({ sub: 'user-123', iss: ISSUER, aud: 'authenticated', iat: now, exp: now + 3600 })}.`;
    expect(await verifyJwtLocal(unsigned)).toBeNull();
  });

  it('rejects a signed token with no subject (the anon/service key shape)', async () => {
    const { verifyJwtLocal } = await import('../verifyJwt');
    expect(await verifyJwtLocal(await makeToken({ role: 'service_role' }))).toBeNull();
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
