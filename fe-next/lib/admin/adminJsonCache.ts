const TTL_MS = 60_000;
const store = new Map<string, { at: number; p: Promise<unknown> }>();

/** GET json with a 60s memo and shared in-flight request; failures are never kept. */
export function cachedAdminJson<T>(url: string, token?: string): Promise<T> {
  const hit = store.get(url);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.p as Promise<T>;
  const p = (token ? fetch(url, { headers: { Authorization: `Bearer ${token}` } }) : fetch(url)).then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<T>;
  });
  store.set(url, { at: Date.now(), p });
  p.catch(() => store.delete(url));
  return p;
}

export const DRILL_URLS = [
  '/api/admin/activity/daily?days=30',
  '/api/game-mode-stats?days=30',
  '/api/admin/analytics/signup-growth?weeks=26',
  '/api/admin/analytics/revenue',
] as const;

/** Warm the closed drill-down sections so opening one is instant. */
export function prefetchDrillSections(token: string): void {
  for (const url of DRILL_URLS) cachedAdminJson(url, token).catch(() => {});
}

export function clearAdminJsonCache(): void {
  store.clear();
}
