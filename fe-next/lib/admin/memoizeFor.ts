/** Per-process TTL memo with in-flight sharing: concurrent readers share one call, failures are never kept. */
export function memoizeFor<T>(cache: Map<string, { at: number; value: Promise<T> }>, key: string, ttlMs: number, fn: () => Promise<T>, now = Date.now()): Promise<T> {
  const hit = cache.get(key);
  if (hit && now - hit.at < ttlMs) return hit.value;
  const value = fn();
  cache.set(key, { at: now, value });
  value.catch(() => {
    if (cache.get(key)?.value === value) cache.delete(key);
  });
  return value;
}
