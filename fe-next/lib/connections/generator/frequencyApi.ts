export interface FetchPhraseHitsOptions {
  fetcher?: typeof fetch;
  userAgent?: string;
}

interface SearchResponse {
  query?: {
    searchinfo?: { totalhits?: number };
  };
}

export async function fetchPhraseTotalHits(
  host: string,
  phrase: string,
  opts: FetchPhraseHitsOptions = {},
): Promise<number> {
  const fetcher = opts.fetcher ?? fetch;
  const headers: Record<string, string> = {
    'user-agent': opts.userAgent ?? 'LexiClash-Connections-Generator/1.0 (https://lexiclash.app)',
  };

  const params = new URLSearchParams({
    action: 'query',
    list: 'search',
    srsearch: `"${phrase}"`,
    srinfo: 'totalhits',
    srprop: '',
    srlimit: '1',
    format: 'json',
    formatversion: '2',
  });

  const url = `https://${host}/w/api.php?${params.toString()}`;
  const res = await fetcher(url, { headers });
  if (!res.ok) {
    throw new Error(`MediaWiki search API error ${res.status} for ${url}`);
  }
  const json = (await res.json()) as SearchResponse;
  return json.query?.searchinfo?.totalhits ?? 0;
}

export type AsyncFreqLookup = (bigram: string) => Promise<number>;

export function makeCachedFreqLookup(backend: AsyncFreqLookup): AsyncFreqLookup {
  const cache = new Map<string, Promise<number>>();
  return (bigram: string) => {
    const key = bigram.trim().replace(/\s+/g, ' ');
    const hit = cache.get(key);
    if (hit) return hit;
    const pending = backend(key);
    cache.set(key, pending);
    return pending;
  };
}
