/**
 * Guarantee the active-locale word dictionary is in the service-worker cache so
 * word validation (Boggle / blast / daily / adventure) works on a flight.
 *
 * Why this exists: the dictionary is normally loaded via a Web Worker that
 * stores the parsed Set in IndexedDB. That path does not reliably populate the
 * SW's Cache Storage (the SWR handler only caches a fetch it actually sees), so
 * a player who merely opened the app online could still find every word
 * rejected once offline. A plain main-thread `fetch` of the dictionary URL is
 * always intercepted by the SW and stale-while-revalidate-cached — making the
 * dictionary deterministically available offline after one online page load.
 *
 * Guarded to run once per locale (skips if already cached) so it costs nothing
 * on subsequent navigations, and skipped entirely when offline.
 */

export interface WarmDictionaryDeps {
  fetchFn?: typeof fetch;
  isOnline?: () => boolean;
  /** Whether the URL is already in any Cache Storage cache. */
  isCached?: (url: string) => Promise<boolean>;
}

export type WarmResult = 'offline' | 'already-cached' | 'warmed' | 'error';

function dictUrl(lang: string): string {
  return `/api/dictionary-words?lang=${lang}`;
}

async function defaultIsCached(url: string): Promise<boolean> {
  try {
    if (typeof caches === 'undefined') return false;
    return !!(await caches.match(url));
  } catch {
    return false;
  }
}

export async function warmDictionaryCache(
  lang: string,
  deps: WarmDictionaryDeps = {},
): Promise<WarmResult> {
  const isOnline = deps.isOnline ?? (() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  if (!isOnline()) return 'offline';

  const url = dictUrl(lang);
  const isCached = deps.isCached ?? defaultIsCached;
  if (await isCached(url)) return 'already-cached';

  const fetchFn = deps.fetchFn ?? (typeof fetch !== 'undefined' ? fetch : undefined);
  if (!fetchFn) return 'error';

  try {
    // The SW intercepts this and SWR-caches the response. We don't need the body.
    await fetchFn(url, { credentials: 'same-origin' });
    return 'warmed';
  } catch {
    return 'error';
  }
}
