/**
 * Local JWT verification — sub-millisecond auth check vs ~50-200ms for
 * `supabase.auth.getUser()` (network round-trip to Supabase Auth).
 *
 * Tradeoff: cannot detect token revoked between issuance and expiry. Use ONLY
 * for read-only paths where stale-by-up-to-jwt-expiry is acceptable. For
 * mutations or security-critical ops, keep using `supabase.auth.getUser()`.
 *
 * Setup: requires `SUPABASE_JWT_SECRET` from Supabase Dashboard → Settings →
 * API → JWT Secret. Add to `.env.local` and Railway env. Never expose as
 * `NEXT_PUBLIC_*` — leaking the secret = forged-token CVE.
 *
 * If `SUPABASE_JWT_SECRET` is not set, all calls return null. Caller should
 * fall back to `supabase.auth.getUser()` in that case.
 */
import { jwtVerify } from 'jose';

export type LocalUser = {
  id: string;
  email?: string;
  role?: string;
};

/** Returns the verified user, or null if invalid/expired/secret-missing. */
export async function verifyJwtLocal(token: string): Promise<LocalUser | null> {
  const rawSecret = process.env.SUPABASE_JWT_SECRET;
  if (!rawSecret || !token) return null;

  try {
    const secret = new TextEncoder().encode(rawSecret);
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
    if (!payload.sub || typeof payload.sub !== 'string') return null;
    return {
      id: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      role: typeof payload.role === 'string' ? payload.role : undefined,
    };
  } catch {
    return null;
  }
}

/** Extract Bearer token from `Authorization: Bearer <jwt>` header. */
export function bearerToken(req: Request): string | null {
  const h = req.headers.get('authorization') || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}
