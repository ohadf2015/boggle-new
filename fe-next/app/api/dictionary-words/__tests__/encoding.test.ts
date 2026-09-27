/**
 * The dictionary payload is the largest thing this app ships (Spanish is 6.73MB
 * raw / 1.39MB gzip). It is pre-compressed in-route and cached per language, so
 * adding brotli costs one ~153ms compression per language per process and takes
 * the Spanish payload to 1.21MB on the wire.
 *
 * The `br` branch is also required for correctness once preferBrotli() rewrites
 * Accept-Encoding to `br`: without it the old `.includes('gzip')` check misses
 * and every browser gets the raw 6.73MB body.
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { gunzipSync, brotliDecompressSync } from 'zlib';

vi.mock('@/lib/server/sharedWordSets', () => ({
  getEnglishWordSet: () => new Set(['alpha', 'bravo', 'charlie']),
  getSpanishBaseWordSet: () => new Set(['uno', 'dos']),
  getHebrewWordSet: () => new Set(['אחת']),
  getSwedishWordSet: () => new Set(['ett']),
}));

let GET: (req: unknown) => Promise<Response>;

beforeAll(async () => {
  ({ GET } = (await import('../route')) as unknown as { GET: typeof GET });
});

// `new Request(url, { headers })` silently drops Accept-Encoding — it is a
// forbidden header name in the Fetch spec — so stub the request shape instead.
const call = (acceptEncoding?: string) =>
  GET({
    url: 'http://localhost/api/dictionary-words?lang=en',
    headers: { get: (n: string) => (n.toLowerCase() === 'accept-encoding' ? acceptEncoding ?? null : null) },
  });

describe('GET /api/dictionary-words content negotiation', () => {
  it('serves brotli to a client that accepts it', async () => {
    const res = await call('br');
    expect(res.headers.get('Content-Encoding')).toBe('br');
    const body = brotliDecompressSync(Buffer.from(await res.arrayBuffer())).toString('utf-8');
    expect(body.split('\n')).toContain('alpha');
  });

  it('prefers brotli over gzip when the client offers both', async () => {
    const res = await call('gzip, deflate, br, zstd');
    expect(res.headers.get('Content-Encoding')).toBe('br');
  });

  it('still serves gzip to a client that cannot do brotli', async () => {
    const res = await call('gzip, deflate');
    expect(res.headers.get('Content-Encoding')).toBe('gzip');
    const body = gunzipSync(Buffer.from(await res.arrayBuffer())).toString('utf-8');
    expect(body.split('\n')).toContain('alpha');
  });

  it('does not serve brotli to a client that refuses it', async () => {
    const res = await call('gzip, br;q=0');
    expect(res.headers.get('Content-Encoding')).toBe('gzip');
  });

  it('falls back to an identity response when nothing is accepted', async () => {
    const res = await call('identity');
    expect(res.headers.get('Content-Encoding')).toBeNull();
    expect(await res.text()).toContain('alpha');
  });

  it('varies on Accept-Encoding so caches do not cross-serve encodings', async () => {
    const res = await call('br');
    expect(res.headers.get('Vary')).toBe('Accept-Encoding');
  });
});

describe('GET /api/dictionary-words conditional requests', () => {
  it('answers 304 with no body when the client already has this representation', async () => {
    const first = await call('br');
    const etag = first.headers.get('ETag')!;
    expect(etag).toBeTruthy();

    const second = await GET({
      url: 'http://localhost/api/dictionary-words?lang=en',
      headers: {
        get: (n: string) => {
          const k = n.toLowerCase();
          if (k === 'accept-encoding') return 'br';
          if (k === 'if-none-match') return etag;
          return null;
        },
      },
    });

    expect(second.status).toBe(304);
    expect((await second.arrayBuffer()).byteLength).toBe(0);
    // Validators must still be present so the client can refresh its freshness.
    expect(second.headers.get('ETag')).toBe(etag);
    expect(second.headers.get('Cache-Control')).toBeTruthy();
  });

  it('gives brotli and gzip DIFFERENT etags — they are different representations', async () => {
    // Sharing one etag across encodings lets a cache hand a gzip-cached client a
    // 304 for a body it never had, and vice versa.
    const br = await call('br');
    const gz = await call('gzip, deflate');
    expect(br.headers.get('ETag')).toBeTruthy();
    expect(br.headers.get('ETag')).not.toBe(gz.headers.get('ETag'));
  });

  it('does not 304 a client holding the etag for a different encoding', async () => {
    const gz = await call('gzip, deflate');
    const gzEtag = gz.headers.get('ETag')!;

    const res = await GET({
      url: 'http://localhost/api/dictionary-words?lang=en',
      headers: {
        get: (n: string) => {
          const k = n.toLowerCase();
          if (k === 'accept-encoding') return 'br';
          if (k === 'if-none-match') return gzEtag;
          return null;
        },
      },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Encoding')).toBe('br');
  });
});
