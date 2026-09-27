/**
 * Tier-A auth helper: tries local JWT verify first (sub-ms),
 * falls back to remote `supabase.auth.getUser()` if local fails or
 * SUPABASE_JWT_SECRET is not configured.
 *
 * Use only on read-only paths. For mutations, keep `auth.getUser()` direct.
 *
 * Migration: replace
 *   const supabase = await createClient();
 *   const { data: { user } } = await supabase.auth.getUser();
 *   if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 * with
 *   const user = await getAuthedUser(request);
 *   if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 */
import { verifyJwtLocal, bearerToken, type LocalUser } from './verifyJwt';

export async function getAuthedUser(req: Request): Promise<LocalUser | null> {
  // Fast path: local JWT verify when secret + bearer token present.
  if (process.env.SUPABASE_JWT_SECRET) {
    const token = bearerToken(req);
    if (token) {
      const local = await verifyJwtLocal(token);
      if (local) return local;
      // Fall through to remote on local-verify failure (token might be cookie-derived).
    }
  }

  // Slow path: cookie-based session via Supabase auth helper.
  const { createClient } = await import('@/utils/supabase/server');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    role: user.role,
  };
}
