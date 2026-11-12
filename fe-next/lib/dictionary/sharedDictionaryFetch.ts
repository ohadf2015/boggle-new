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

export function dictionaryWordsUrl(lang: string, opts: { encoded?: boolean } = {}): string {
  return `/api/dictionary-words?lang=${lang}${opts.encoded ? '&enc=b64' : ''}`;
}

/** Filtered networks answer the plain Hebrew list with a 418 our server never sends; base64 is the fallback. */
export function encodeDictionaryPayload(raw: string): string {
  const bytes = new TextEncoder().encode(raw);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

export function decodeDictionaryPayload(wire: string): string {
  const binary = atob(wire.trim());
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export async function fetchEncodedDictionaryText(
  lang: string,
  fetchFn: typeof fetch = fetch,
): Promise<string | null> {
  try {
    const res = await fetchFn(dictionaryWordsUrl(lang, { encoded: true }), { credentials: 'same-origin' });
    if (!res.ok) return null;
    return decodeDictionaryPayload(await res.text());
  } catch {
    return null;
  }
}

async function withEncodedFallback(
  lang: string,
  plain: Response,
  fetchFn: typeof fetch,
): Promise<Response> {
  if (plain.ok) return plain;
  const text = await fetchEncodedDictionaryText(lang, fetchFn);
  if (text == null) return plain;
  return new Response(text, { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
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
    pending = fetchFn(url, { credentials: 'same-origin' }).then((plain) =>
      withEncodedFallback(lang, plain, fetchFn),
    );
    const settled = pending;
    inflight.set(url, settled);
    settled.then(
      (res) => {
        if (!res.ok && inflight.get(url) === settled) inflight.delete(url);
      },
      () => {
        if (inflight.get(url) === settled) inflight.delete(url);
      },
    );
  }
  return pending.then((response) =>
    typeof response.clone === 'function' ? response.clone() : response,
  );
}

/** Test-only: drop in-flight entries so cases cannot leak across tests. */
export function __resetSharedDictionaryFetchForTests(): void {
  inflight.clear();
}
