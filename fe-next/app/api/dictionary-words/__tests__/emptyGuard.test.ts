import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Regression: never memoise an empty dictionary for the process lifetime.
 *
 * `gzippedPayloads` is a module-level cache with no TTL and no invalidation, so
 * whatever the FIRST request builds is what every client gets until the next
 * deploy. `getHebrewWordSet` / `getSwedishWordSet` skip a missing backend/*.txt
 * without a word, so "0 words" is a reachable state — and a 200 with an empty
 * body is worse than an error, because clients cache it and then reject every
 * real word the player types.
 */

vi.mock('next/server', () => {
  // The success path uses `new NextResponse(body, init)`, the guard uses
  // NextResponse.json — the mock has to be both.
  class MockResponse {
    status: number;
    body: unknown;
    constructor(body?: unknown, init?: { status?: number }) {
      this.body = body;
      this.status = init?.status ?? 200;
    }
  }
  return {
    NextRequest: vi.fn(),
    NextResponse: Object.assign(MockResponse, {
      json: (data: unknown, init?: { status?: number }) =>
        Object.assign(new MockResponse(data, init), { json: async () => data }),
    }),
  };
});

const getEnglishWordSet = vi.fn();
vi.mock('@/lib/server/sharedWordSets', () => ({
  getEnglishWordSet: () => getEnglishWordSet(),
  getSpanishBaseWordSet: async () => new Set<string>(),
  getHebrewWordSet: () => new Set<string>(),
  getSwedishWordSet: () => new Set<string>(),
}));

function req(lang: string) {
  return { url: `https://x/api/dictionary-words?lang=${lang}`, headers: { get: () => null } } as never;
}

beforeEach(() => {
  vi.resetModules();
  getEnglishWordSet.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('GET /api/dictionary-words — empty guard', () => {
  it('returns 503 instead of an empty 200 when the word set loads to nothing', async () => {
    getEnglishWordSet.mockResolvedValue(new Set<string>());
    const { GET } = await import('../route');

    const res = await GET(req('en'));

    expect(res.status).toBe(503);
  });

  it('does not poison the process-lifetime cache — a later good load still serves', async () => {
    const { GET } = await import('../route');

    getEnglishWordSet.mockResolvedValue(new Set<string>());
    expect((await GET(req('en'))).status).toBe(503);

    getEnglishWordSet.mockResolvedValue(new Set(['ice', 'cat']));
    const ok = await GET(req('en'));
    expect(ok.status).toBe(200);
  });
});
