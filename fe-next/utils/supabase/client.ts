import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null;

/**
 * Auth lock that NEVER uses `{ steal: true }`.
 * Supabase's default lock steals after acquireTimeout, which surfaces as
 * GrowthRadar lock-steal / "Lock broken by another request with the steal
 * option" on adventure (and other) surfaces (t_a6fb639b). We wait up to the
 * timeout, then run the critical section without stealing so concurrent
 * getSession/getUser callers serialize or fall through quietly.
 */
async function quietLock<R>(name: string, acquireTimeout: number, fn: () => Promise<R>): Promise<R> {
  if (typeof navigator === 'undefined' || !navigator.locks?.request) {
    return await fn();
  }
  // acquireTimeout === 0 -> non-blocking probe (supabase init path).
  if (acquireTimeout === 0) {
    try {
      return await navigator.locks.request(
        name,
        { mode: 'exclusive', ifAvailable: true },
        async (lock) => {
          if (!lock) return await fn();
          return await fn();
        },
      );
    } catch {
      return await fn();
    }
  }
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer =
    controller && acquireTimeout > 0
      ? setTimeout(() => controller.abort(), acquireTimeout)
      : undefined;
  try {
    return await navigator.locks.request(
      name,
      {
        mode: 'exclusive',
        ...(controller ? { signal: controller.signal } : {}),
      },
      async () => await fn(),
    );
  } catch {
    // Timed out / aborted -- run without stealing the held lock.
    return await fn();
  } finally {
    if (timer) clearTimeout(timer);
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
