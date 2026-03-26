import Redis from 'ioredis';

let cacheClient: Redis | null = null;

export function getCacheClient(): Redis {
  if (cacheClient) return cacheClient;
  const url =
    process.env.REDIS_URL ||
    `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`;
  cacheClient = new Redis(url, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    enableReadyCheck: true,
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
