/**
 * Higgsfield token resolver — DB-backed so the prod token can be rotated LIVE
 * (device-login tokens expire). Precedence: DB value (app_secrets) → env fallback.
 *
 * SERVER ONLY (uses the service-role Supabase client). The token is a secret:
 * the `app_secrets` row is service-role-only (RLS on, no policies). Never returned
 * to the client. See spec Track B §6b.
 */

import { getSupabaseAdmin } from '@/lib/admin/server';

const SECRET_KEY = 'higgsfield_token';
const CACHE_TTL_MS = 30_000;

let cache: { token: string | null; ts: number } | null = null;

/** Resolve the active Higgsfield bearer token (cached ~30s). */
export async function getHiggsfieldToken(now: number = Date.now()): Promise<string | null> {
  if (cache && now - cache.ts < CACHE_TTL_MS) return cache.token;

  let token: string | null = null;
  try {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { data } = await supabase
        .from('app_secrets')
        .select('value')
        .eq('key', SECRET_KEY)
        .maybeSingle();
      token = (data?.value as string | undefined) ?? null;
    }
  } catch {
    // table may not exist yet → fall through to env
  }

  if (!token) token = process.env.HIGGSFIELD_TOKEN ?? null;

  cache = { token, ts: now };
  return token;
}

/** Persist a new token (admin rotation). Clears the read cache. */
export async function setHiggsfieldToken(token: string, updatedBy: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Service client unavailable');
  const { error } = await supabase
    .from('app_secrets')
    .upsert(
      { key: SECRET_KEY, value: token, updated_by: updatedBy, updated_at: new Date().toISOString() },
      { onConflict: 'key' },
    );
  if (error) throw new Error(`Failed to store token: ${error.message}`);
  cache = null;
}

/** Test/refresh hook — drop the in-memory cache. */
export function clearHiggsfieldTokenCache(): void {
  cache = null;
}
