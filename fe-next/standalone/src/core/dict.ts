/**
 * Dictionary loader for the standalone build.
 *
 * Fetches the bundled gzipped word list (relative same-origin asset — no
 * external request) and inflates it in-browser via DecompressionStream (gzip),
 * which is Baseline widely available. Format: newline-delimited lowercase words.
 * Returns a Set for O(1) membership.
 */

// public/ asset → served at the bundle root. BASE_URL is './' (vite base),
// so this resolves relative to index.html regardless of JS chunk nesting.
const DICT_URL = `${import.meta.env.BASE_URL}en.dict.gz`;

/** Inflate a gzip stream to text using the platform DecompressionStream. */
export async function inflateGzip(body: ReadableStream<Uint8Array>): Promise<string> {
  const ds = new DecompressionStream('gzip');
  // DOM lib types for pipeThrough/DecompressionStream generics mismatch; the
  // runtime contract (bytes in → bytes out) is correct. Cast narrowly.
  const stream = body.pipeThrough(ds as unknown as ReadableWritablePair<Uint8Array, Uint8Array>);
  return new Response(stream).text();
}

export function parseWordList(text: string): Set<string> {
  const set = new Set<string>();
  for (const line of text.split('\n')) {
    const w = line.trim().toLowerCase();
    if (w) set.add(w);
  }
  return set;
}

export async function loadDictionary(url: string | URL = DICT_URL): Promise<Set<string>> {
  const resp = await fetch(url);
  if (!resp.ok || !resp.body) throw new Error(`dict fetch failed: ${resp.status}`);
  const text = await inflateGzip(resp.body);
  return parseWordList(text);
}

export function isRealWord(dict: Set<string>, word: string): boolean {
  return dict.has(String(word ?? '').trim().toLowerCase());
}
