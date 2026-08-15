/**
 * Regression: /api/solve-grid called dictionary.load() ("load everything"), which
 * early-returns the moment `loaded` is true — and loadEnglishOnly() sets that flag
 * at boot. So the requested language was never actually loaded, the solver got an
 * empty word Set and logged "[SOLVER] No dictionary available for language: es"
 * (Sentry JAVASCRIPT-NEXTJS-208), returning zero words to the caller.
 *
 * Same shape as the /api/dictionary/check bug — see dictionaryCheckLazyLoad.test.ts.
 * The success response also needs the `headersSent` guard the error branch already
 * had: the 30s global Express timeout fires first on a slow solve, and the late
 * res.json() then threw "Cannot set headers after they are sent to the client"
 * (Sentry JAVASCRIPT-NEXTJS-1ZW).
 *
 * Handler is invoked directly, not via supertest — see the note in
 * dictionaryCheckLazyLoad.test.ts for why.
 */

import { vi } from 'vitest';

const ensureLanguageLoaded = vi.fn(async () => {});
const load = vi.fn(async () => {});
const findWordsForBots = vi.fn(() => ({ easy: ['gato'], medium: [], hard: [] }));
const logError = vi.fn();

vi.mock('../../dictionary', () => ({ load, ensureLanguageLoaded }));
vi.mock('../../modules/boggleSolver', () => ({ findWordsForBots }));
vi.mock('../../utils/logger', () => ({
  default: { warn: vi.fn(), error: logError, info: vi.fn(), debug: vi.fn() },
}));
vi.mock('../../modules/supabaseServer', () => ({ getSupabase: () => null }));

interface FakeRes {
  statusCode: number;
  body: Record<string, unknown> | null;
  headersSent: boolean;
  status(code: number): FakeRes;
  json(body: Record<string, unknown>): FakeRes;
}

function makeRes(headersSent = false): FakeRes {
  return {
    statusCode: 200,
    body: null,
    headersSent,
    status(code: number) { this.statusCode = code; return this; },
    json(body: Record<string, unknown>) {
      if (this.headersSent) throw new Error('Cannot set headers after they are sent to the client');
      this.body = body;
      return this;
    },
  };
}

const grid = [
  ['g', 'a', 't', 'o'],
  ['a', 't', 'o', 'g'],
  ['t', 'o', 'g', 'a'],
  ['o', 'g', 'a', 't'],
];

async function getPostHandler() {
  const mod = await import('../solveGrid');

  const router = mod.default as any;
  const layer = router.stack.find((l: { route?: unknown }) => l.route);
  const handlers = layer.route.stack;
  return handlers[handlers.length - 1].handle as (
    req: unknown,
    res: unknown,
  ) => Promise<void>;
}

describe('POST /api/solve-grid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lazy-loads the requested language instead of the no-op global load()', async () => {
    const handler = await getPostHandler();

    await handler({ body: { grid, language: 'es' } }, makeRes());

    expect(ensureLanguageLoaded).toHaveBeenCalledWith('es');
    expect(findWordsForBots).toHaveBeenCalledWith(grid, 'es', expect.anything());
  });

  it('does not write a response once the timeout middleware already sent one', async () => {
    const handler = await getPostHandler();
    const res = makeRes(true);

    await handler({ body: { grid, language: 'en' } }, res);

    expect(res.body).toBeNull();
    const messages = logError.mock.calls.map((c) => String(c[1] ?? ''));
    expect(messages.some((m) => m.includes('Cannot set headers'))).toBe(false);
  });
});
