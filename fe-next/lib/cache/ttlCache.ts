/**
 * In-process TTL cache with single-flight coalescing.
 *
 * Purpose: amortize repeated, identical, non-realtime server work (e.g. SSR
 * data fetches that are the same for every visitor of a locale) so the
 * expensive call runs at most once per TTL window per key — instead of once
 * per request. On a long-lived Node server (our custom Express + Next runtime)
 * this turns a per-request DB round-trip into a ~0ms memory read at scale.
 *
 * Design notes:
 *  - Single-flight: concurrent misses for the same key share ONE in-flight
 *    loader promise (prevents thundering-herd against the DB on cache expiry).
 *  - Fail-open: a rejected loader is never cached, so the next call retries.
 *  - `now` is injectable purely so tests can advance the clock deterministically.
 *
 * Scope: per-process memory. With N server instances each holds its own copy,
 * so worst-case load is N fetches per TTL window — bounded and acceptable for
 * data that tolerates a few seconds of staleness. For cross-instance sharing or
 * strong consistency, back the loader with Redis instead.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export interface TtlCacheOptions {
  /** Time-to-live in milliseconds. */
  ttlMs: number;
  /** Clock source; injectable for tests. Defaults to Date.now. */
  now?: () => number;
}

const store = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

/**
 * Returns the cached value for `key` if still fresh, otherwise invokes `loader`,
 * caches its resolved value for `ttlMs`, and returns it. Concurrent misses for
 * the same key are coalesced into a single loader invocation.
 */
export async function cachedWithTtl<T>(
  key: string,
  loader: () => Promise<T>,
  { ttlMs, now = Date.now }: TtlCacheOptions,
): Promise<T> {
  const cached = store.get(key) as CacheEntry<T> | undefined;
  if (cached && cached.expiresAt > now()) {
    return cached.value;
  }

  const pending = inflight.get(key) as Promise<T> | undefined;
  if (pending) {
    return pending;
  }

  const load = (async () => {
    try {
      const value = await loader();
      store.set(key, { value, expiresAt: now() + ttlMs });
      return value;
    } finally {
      // Always clear the in-flight marker — on success the value is cached, on
      // failure nothing is cached so the next caller retries (fail-open).
      inflight.delete(key);
    }
  })();

  inflight.set(key, load);
  return load;
}

/** Test-only: wipe all cached and in-flight state for isolation between cases. */
export function __resetTtlCache(): void {
  store.clear();
  inflight.clear();
}
