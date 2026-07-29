import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null;

async function quietLock<R>(name: string, acquireTimeout: number, fn: () => Promise<R>): Promise<R> {
  if (typeof navigator === 'undefined' || !navigator.locks?.request) {
    return await fn();
  }
  try {
    return await navigator.locks.request(
      name,
      { mode: 'exclusive', ifAvailable: acquireTimeout === 0 },
      async () => await fn(),
    );
  } catch {
    return await fn();
  }
}

export function createClient(): SupabaseClient {
  if (_client) return _client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (process.env.NODE_ENV === 'test') {
      // In test environments, allow creation with placeholder values so mocks can intercept
      _client = createBrowserClient('http://localhost', 'anon-key-placeholder', {
        auth: { detectSessionInUrl: false, flowType: 'pkce', lock: quietLock }
      });
      return _client;
    }
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  _client = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      detectSessionInUrl: false,
      flowType: 'pkce',
      lock: quietLock,
    }
  });

  return _client;
}
