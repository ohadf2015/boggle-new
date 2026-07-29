/**
 * Server-side Supabase client configured for connection pooling.
 * Uses PgBouncer pooled connection (port 6543) for better connection reuse.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let pooledClient: SupabaseClient | null = null;

export function getPooledSupabaseClient(): SupabaseClient {
  if (pooledClient) return pooledClient;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  // Use pooled connection string if available, otherwise fall back to direct
  const pooledUrl = process.env.SUPABASE_POOLED_URL || supabaseUrl;

  pooledClient = createClient(pooledUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'public' },
  });

  return pooledClient;
}

/**
 * Check if the pooled client can connect to the database.
 * Used by health check endpoints.
 */
export async function checkPoolHealth(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    const client = getPooledSupabaseClient();
    const { error } = await client.from('profiles').select('id').limit(1);
    if (error) throw new Error(error.message || JSON.stringify(error));
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - start, error: err instanceof Error ? err.message : String(err) };
  }
}
