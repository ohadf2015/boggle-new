/**
 * Tier-A auth helper: read-only requests try local JWT verify first (sub-ms) and
 * fall back to remote `supabase.auth.getUser()` if local fails or
 * SUPABASE_JWT_SECRET is not configured. Writes always verify remotely.
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
export async function cookieAccessToken(req: Pick<Request, 'headers'>): Promise<string | null> {
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

/**
 * Local verification only for read-only requests. A write (non-GET/HEAD, or a GET
 * flagged `writes`) always goes remote so a revoked session can't write — Bearer
 * and cookie alike.
 */
export async function getAuthedUser(req: Request, opts: { writes?: boolean } = {}): Promise<LocalUser | null> {
  const bearer = bearerToken(req);
  const readOnly = READ_METHODS.has(req.method) && !opts.writes;
  if (readOnly && process.env.SUPABASE_JWT_SECRET) {
    const token = bearer ?? (await cookieAccessToken(req));
    if (token) {
      const local = await verifyJwtLocal(token);
      if (local) return local;
    }
  }

  const { createClient } = await import('@/utils/supabase/server');
  const supabase = await createClient();
  if (bearer && !readOnly) {
    const { data: { user } } = await supabase.auth.getUser(bearer);
    if (user) return toLocalUser(user);
  }
  const { data: { user } } = await supabase.auth.getUser();
  return user ? toLocalUser(user) : null;
}

function toLocalUser(user: { id: string; email?: string; role?: string }): LocalUser {
  return { id: user.id, email: user.email, role: user.role };
}
