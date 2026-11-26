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
