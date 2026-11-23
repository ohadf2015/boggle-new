import { describe, it, expect, vi, beforeEach } from 'vitest';

const findWordsForBots = vi.fn(() => ({ easy: ['fei', 'cat'], medium: ['house', 'cat'], hard: ['ecu'] }));
const loadCommonWords = vi.fn(async (_l: string) => ['cat', 'house', 'dog']);

vi.mock('../../dictionary', () => ({ load: vi.fn(), ensureLanguageLoaded: vi.fn(async () => {}) }));
vi.mock('../../modules/boggleSolver', () => ({ findWordsForBots, resolveSolverLanguage: (l: string) => l }));
vi.mock('../../utils/logger', () => ({ default: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() } }));
vi.mock('../../modules/supabaseServer', () => ({ getSupabase: () => null }));
vi.mock('@/lib/adventure/play/commonWords', () => ({ loadCommonWords: (l: string) => loadCommonWords(l) }));

const grid = [['c', 'a', 't', 's'], ['h', 'o', 'u', 'e'], ['e', 'r', 'e', 'd'], ['d', 'o', 'g', 's']];

async function getPostHandler() {
  const mod = await import('../solveGrid');
  const router = mod.default as unknown as { stack: { route?: { stack: { handle: unknown }[] } }[] };
  const handlers = router.stack.find((l) => l.route)!.route!.stack;
  return handlers[handlers.length - 1].handle as (req: unknown, res: unknown) => Promise<void>;
}

function makeRes() {
  return {
    statusCode: 200,
    body: null as Record<string, unknown> | null,
    headersSent: false,
    status(code: number) { this.statusCode = code; return this; },
    json(body: Record<string, unknown>) { this.body = body; return this; },
  };
}

describe('POST /api/solve-grid everyday words', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('Given a board, Then the words that are everyday words in that language come back as common', async () => {
    const handler = await getPostHandler();
    const res = makeRes();
    await handler({ body: { grid, language: 'en' } }, res);
    expect(loadCommonWords).toHaveBeenCalledWith('en');
    expect((res.body?.words as { common: string[] }).common).toEqual(['cat', 'house']);
  });
});
