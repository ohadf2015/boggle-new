/**
 * Socket handshake auth policy — shared by the main and /duel namespaces.
 *
 * WHY THIS EXISTS: the handshake previously called the remote
 * `supabase.auth.getUser(token)` on EVERY connect and reconnect. Supabase Auth's
 * `/user` endpoint was saturated (~2-3s p50, 29s tail), so every MP connection
 * blocked for seconds — the measured root cause of slow room entry and slow
 * reconnects (felt as disconnects). Local HS256 verification is sub-millisecond
 * and touches no network, so it removes the round-trip from the hot path and
 * relieves the self-inflicted load on GoTrue.
 *
 * Fast path: `verifyJwtLocal` (HS256 + SUPABASE_JWT_SECRET).
 * Fallback: remote `supabase.auth.getUser(token)` — reached only when the secret
 * is unset or the token was signed with a different secret. This keeps behaviour
 * identical to the old path when the secret is absent (no regression, no auth
 * outage), and is time-boxed so a hung Auth service degrades to "no user" rather
 * than blocking the handshake forever.
 *
 * Tradeoff: local verify cannot detect a token revoked before its expiry.
 * Signature/spoof protection is intact (wrong-secret tokens fail to verify);
 * only revocation-detection is traded away, which is acceptable for a game socket.
 */
import { verifyJwtLocal } from '../lib/auth/verifyJwt';

export interface VerifiedSocketUser {
  userId: string;
  email?: string;
}

/** Minimal shape of the Supabase client we depend on (just auth.getUser). */
interface SupabaseAuthLike {
  auth: {
    getUser: (token: string) => Promise<{
      data: { user: { id: string; email?: string | null } | null };
      error: unknown;
    }>;
  };
}

const DEFAULT_AUTH_TIMEOUT_MS = 5000;

/**
 * Resolve a verified user from a handshake token, or null if the token is
 * missing/invalid. Callers decide the namespace policy (main = guest fallthrough
 * on null; duel = reject on null).
 */
export async function verifySocketToken(
  token: string | undefined,
  supabase: SupabaseAuthLike | null,
  timeoutMs: number = DEFAULT_AUTH_TIMEOUT_MS,
): Promise<VerifiedSocketUser | null> {
  if (!token) return null;

  // Fast path: local verify, no network.
  const local = await verifyJwtLocal(token);
  if (local) {
    return { userId: local.id, email: local.email };
  }

  // Fallback: remote verify (secret unset, or token signed elsewhere).
  if (!supabase) return null;
  try {
    const result = await Promise.race([
      supabase.auth.getUser(token),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Auth verification timed out')), timeoutMs),
      ),
    ]);
    const user = result?.data?.user;
    if (!user) return null;
    return { userId: user.id, email: user.email ?? undefined };
  } catch {
    return null;
  }
}
