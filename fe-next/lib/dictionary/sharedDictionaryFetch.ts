/**
 * One in-flight network GET per dictionary URL.
 *
 * DictionaryPrewarmer (SW warm) and useDictionaryCache (in-memory Set) used
 * to fire /api/dictionary-words twice per page load — 2×704KB on PSI.
 * Callers must read a clone: a Response body can only be consumed once.
 */

import { SUPPORTED_GAME_LANGUAGES } from '@/lib/languageConfig';

const inflight = new Map<string, Promise<Response>>();

/**
 * /api/dictionary-words derives its allow-list from SUPPORTED_GAME_LANGUAGES,
 * so a language outside it can only ever 400. Skip the request entirely (no
 * 400 loop, no console noise) — the non-OK synthetic response sends callers
 * down their existing server-validation fallback.
 */
export function hasClientDictionary(lang: string): boolean {
  return (SUPPORTED_GAME_LANGUAGES as readonly string[]).includes(lang);
}

export function dictionaryWordsUrl(lang: string): string {
  return `/api/dictionary-words?lang=${lang}`;
}

export function fetchDictionaryWordsNetwork(
  lang: string,
  fetchFn: typeof fetch = fetch,
): Promise<Response> {
  if (!hasClientDictionary(lang)) {
    return Promise.resolve(
      new Response(null, { status: 404, statusText: 'No client dictionary' }),
    );
  }
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
