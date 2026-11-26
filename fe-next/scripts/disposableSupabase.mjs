/** Hosted Supabase is prod (or a shared project). The funnel harness must not touch it. */
export function isHostedSupabaseUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.endsWith('.supabase.co') || host.endsWith('.supabase.in');
  } catch {
    return /supabase\.(co|in)/i.test(url);
  }
}

export function assertDisposableSupabase(url) {
  if (isHostedSupabaseUrl(url)) {
    const err = new Error(
      `refusing to run verify-teacher-funnel against hosted Supabase (${url}). Use the script's local Postgres or a branch database. Do not create @lexiclash.test accounts in prod.`,
    );
    err.code = 'PROD_SUPABASE_REFUSED';
    throw err;
  }
}

/** Keys a Supabase client reads. A harness that inherits prod env must not keep these. */
const HOSTED_ENV_KEYS = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL'];

/**
 * Delete hosted project URLs from `env` before any client is constructed.
 * Returns the keys that were stripped. Loopback and branch URLs are left alone.
 */
export function stripHostedSupabaseEnv(env) {
  const stripped = [];
  for (const key of HOSTED_ENV_KEYS) {
    if (!isHostedSupabaseUrl(env[key])) continue;
    stripped.push(key);
    delete env[key];
  }
  return stripped;
}
