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
import { combineChunks, stringFromBase64URL } from '@supabase/ssr';
import { verifyJwtLocal, bearerToken, type LocalUser } from './verifyJwt';

const READ_METHODS = new Set(['GET', 'HEAD']);

function readCookies(header: string): Map<string, string> {
  const jar = new Map<string, string>();
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const raw = part.slice(eq + 1).trim();
    let value = raw;
    try { value = decodeURIComponent(raw); } catch { /* keep raw */ }
    jar.set(part.slice(0, eq).trim(), value);
  }
  return jar;
}

/** The access token from the @supabase/ssr session cookie (chunked, base64url). */
async function cookieAccessToken(req: Request): Promise<string | null> {
  const header = req.headers.get('cookie');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!header || !url) return null;
  try {
    const key = `sb-${new URL(url).hostname.split('.')[0]}-auth-token`;
    const jar = readCookies(header);
    const raw = await combineChunks(key, (name) => jar.get(name));
    if (!raw) return null;
    const json = raw.startsWith('base64-') ? stringFromBase64URL(raw.slice(7)) : raw;
    const token = (JSON.parse(json) as { access_token?: unknown })?.access_token;
    return typeof token === 'string' ? token : null;
  } catch {
    return null;
  }
}

/** `writes`: the handler writes even on GET, so a cookie session keeps the remote (revocation-aware) check. */
export async function getAuthedUser(req: Request, opts: { writes?: boolean } = {}): Promise<LocalUser | null> {
  if (process.env.SUPABASE_JWT_SECRET) {
    const cookieLocal = READ_METHODS.has(req.method) && !opts.writes;
    const token = bearerToken(req) ?? (cookieLocal ? await cookieAccessToken(req) : null);
    if (token) {
      const local = await verifyJwtLocal(token);
      if (local) return local;
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
