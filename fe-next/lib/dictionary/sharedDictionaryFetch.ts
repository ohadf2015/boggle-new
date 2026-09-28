/**
 * One in-flight network GET per dictionary URL.
 *
 * DictionaryPrewarmer (SW warm) and useDictionaryCache (in-memory Set) used
 * to fire /api/dictionary-words twice per page load — 2×704KB on PSI.
 * Callers must read a clone: a Response body can only be consumed once.
 */

const inflight = new Map<string, Promise<Response>>();

export function dictionaryWordsUrl(lang: string): string {
  return `/api/dictionary-words?lang=${lang}`;
}

export function fetchDictionaryWordsNetwork(
  lang: string,
  fetchFn: typeof fetch = fetch,
): Promise<Response> {
  const url = dictionaryWordsUrl(lang);
  let pending = inflight.get(url);
  if (!pending) {
    pending = fetchFn(url, { credentials: 'same-origin' });
    inflight.set(url, pending);
    pending.catch(() => {
      inflight.delete(url);
    });
  }
  return pending.then((response) =>
    typeof response.clone === 'function' ? response.clone() : response,
  );
}

/** Test-only: drop in-flight entries so cases cannot leak across tests. */
export function __resetSharedDictionaryFetchForTests(): void {
  inflight.clear();
}
