import { describe, it, expect, vi, beforeAll } from 'vitest';
import { brotliDecompressSync } from 'zlib';
import { decodeDictionaryPayload } from '@/lib/dictionary/sharedDictionaryFetch';

vi.mock('@/lib/server/sharedWordSets', () => ({
  getEnglishWordSet: () => new Set(['alpha']),
  getSpanishBaseWordSet: () => new Set(['uno']),
  getHebrewWordSet: () => new Set(['שלום', 'מים']),
  getSwedishWordSet: () => new Set(['ett']),
}));

let GET: (req: unknown) => Promise<Response>;

beforeAll(async () => {
  ({ GET } = (await import('../route')) as unknown as { GET: typeof GET });
});

const call = (query: string, acceptEncoding = 'br', ifNoneMatch: string | null = null) =>
  GET({
    url: `http://localhost/api/dictionary-words?${query}`,
    headers: {
      get: (n: string) => {
        const k = n.toLowerCase();
        if (k === 'accept-encoding') return acceptEncoding;
        if (k === 'if-none-match') return ifNoneMatch;
        return null;
      },
    },
  });

describe('GET /api/dictionary-words?enc=b64', () => {
  it('serves the same list with no Hebrew letter in the body', async () => {
    const res = await call('lang=he&enc=b64');
    expect(res.status).toBe(200);
    const body = brotliDecompressSync(Buffer.from(await res.arrayBuffer())).toString('utf-8');
    expect(body).not.toMatch(/[֐-׿]/);
    expect(decodeDictionaryPayload(body).split('\n').sort()).toEqual(['מים', 'שלום']);
  });

  it('tags the encoded body with its own ETag so a cache never swaps the two', async () => {
    const plain = await call('lang=he');
    const encoded = await call('lang=he&enc=b64');
    expect(encoded.headers.get('ETag')).not.toBe(plain.headers.get('ETag'));
    const revalidated = await call('lang=he&enc=b64', 'br', plain.headers.get('ETag'));
    expect(revalidated.status).toBe(200);
  });
});
