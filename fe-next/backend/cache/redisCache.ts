import Redis from 'ioredis';

let cacheClient: Redis | null = null;

let loggedConnError = false;

export function getCacheClient(): Redis {
  if (cacheClient) return cacheClient;
  const url =
    process.env.REDIS_URL ||
    `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`;
  cacheClient = new Redis(url, {
    maxRetriesPerRequest: 1,
    lazyConnect: true,
    enableReadyCheck: true,
    // Fail FAST to the DB fetcher when Redis is unreachable. A cache that hangs
    // is slower than no cache: commandTimeout bounds every op so cacheAside's
    // catch falls through to Postgres within ~1s instead of stalling the request.
    connectTimeout: 1000,
    commandTimeout: 1000,
  });
  // Without an 'error' listener ioredis surfaces connection failures as
  // unhandled events. We degrade silently to the DB (errors also reject the
  // pending command, handled below), but log the first one so an outage isn't
  // invisible.
  // Optional-chain: real ioredis always has .on; some test mocks don't, and a
  // missing listener must not crash client creation.
  cacheClient.on?.('error', (err: Error) => {
    if (!loggedConnError) {
      loggedConnError = true;
      console.warn('[apiCache] Redis unavailable, serving from DB:', err?.message);
    }
  });
  return cacheClient;
}

/** Cache-aside pattern: check cache, call fetcher on miss, store result */
export async function cacheAside<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 300
): Promise<T> {
  const redis = getCacheClient();
  try {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached) as T;
  } catch {
    /* cache miss or error — fall through to fetcher */
  }

  const result = await fetcher();
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(result));
  } catch {
    /* cache write failure is non-fatal */
  }
  return result;
}

/**
 * Delete exact keys in one DEL (no SCAN). Use on hot mutation paths where the
 * key is known — far cheaper than invalidateCache's pattern scan. Non-fatal:
 * if Redis is down the stale entry simply expires on its TTL.
 */
export async function invalidateKeys(...keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  try {
    await getCacheClient().del(...keys);
  } catch {
    /* non-fatal — entry expires via TTL */
  }
}

export async function invalidateCache(pattern: string): Promise<void> {
  const redis = getCacheClient();
  const stream = redis.scanStream({ match: pattern, count: 100 });
  const keysToDelete: string[] = [];
  for await (const chunk of stream) {
    keysToDelete.push(...(chunk as string[]));
  }
  if (keysToDelete.length > 0) await redis.del(...keysToDelete);
}

export async function closeCacheClient(): Promise<void> {
  if (cacheClient) {
    await cacheClient.quit();
    cacheClient = null;
  }
}
