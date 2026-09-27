/**
 * Regression test: /api/dictionary/check must lazy-load the requested language
 *
 * Bug (2026-07-29, reported by Ohad): Hebrew dictionary "not working" — every
 * Hebrew word (שלום, בית) returned { isValid:false, source:'unknown' } on prod.
 * Root cause: dictionaries load English-only at boot and idle languages get
 * unloaded by the memory manager; the /check handler validated against an
 * empty Hebrew set without ever calling ensureLanguageLoaded('he'), so
 * isDictionaryWord returned null and every Hebrew word fell through to
 * source:'unknown'. (בית/שלום are in hebrew_words.txt — never a data issue.)
 *
 * The fix: await ensureLanguageLoaded(language) before validating, and gate
 * on the per-language loaded flag (the global `loaded` flag only means
 * English finished).
 *
 * NOTE: handler is invoked directly (not via supertest) — in this vitest
 * setup the express Router module and the test's express resolve to different
 * optimized copies, and requests mis-dispatch through app.use().
 */

import { vi } from 'vitest';

// Mock side-effectful deps only — keep the REAL dictionary engine.
vi.mock('../../utils/logger', () => ({
  default: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../modules/communityWordManager', () => ({
  isWordCommunityValid: vi.fn(() => false),
  isWordValidForScoring: vi.fn(() => false),
}));

// Rate limiter middleware passthrough
vi.mock('../../utils/apiRateLimiter', () => ({
  createEndpointLimiter: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

interface FakeRes {
  statusCode: number;
  body: Record<string, unknown> | null;
  status(code: number): FakeRes;
  json(body: Record<string, unknown>): FakeRes;
}

function makeRes(): FakeRes {
  return {
    statusCode: 200,
    body: null,
    status(code: number) { this.statusCode = code; return this; },
    json(body: Record<string, unknown>) { this.body = body; return this; },
  };
}

async function getCheckHandler() {
  const mod = await import('../dictionary');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const router = mod.default as any;
  const layer = router.stack.find((l: { route?: unknown }) => l.route);
  const handlers = layer.route.stack;
  return handlers[handlers.length - 1].handle as (
    req: { body: { word: string; language: string } },
    res: FakeRes
  ) => Promise<void>;
}

describe('POST /api/dictionary/check — lazy language loading (real dictionary)', () => {
  it('validates שלום even when Hebrew was never loaded in this process', async () => {
    const handler = await getCheckHandler();
    const res = makeRes();
    await handler({ body: { word: 'שלום', language: 'he' } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ isValid: true, source: 'dictionary' });
  }, 30000);

  it('validates בית (final-letter normalization round-trip)', async () => {
    const handler = await getCheckHandler();
    const res = makeRes();
    await handler({ body: { word: 'בית', language: 'he' } }, res);

    expect(res.body).toEqual({ isValid: true, source: 'dictionary' });
  }, 30000);

  it('still rejects non-words after loading the real Hebrew corpus', async () => {
    const handler = await getCheckHandler();
    const res = makeRes();
    await handler({ body: { word: 'גבגבגבגב', language: 'he' } }, res);

    expect(res.body).toEqual({ isValid: false, source: 'unknown' });
  }, 30000);

  it('falls back to English for unsupported languages instead of loading them', async () => {
    const handler = await getCheckHandler();
    const res = makeRes();
    // 'zzqxx' is not an English word — proves no fr dictionary load, no crash
    await handler({ body: { word: 'zzqxx', language: 'fr' } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body?.isValid).toBe(false);
  }, 30000);

  it('rejects too-short words before touching the dictionary', async () => {
    const handler = await getCheckHandler();
    const res = makeRes();
    await handler({ body: { word: 'א', language: 'he' } }, res);

    expect(res.body).toEqual({ isValid: false, source: 'too_short' });
  });
});
