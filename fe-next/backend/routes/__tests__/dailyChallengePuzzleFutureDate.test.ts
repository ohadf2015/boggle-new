import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../modules/supabaseServer', () => ({
  getSupabase: vi.fn(() => null),
  isSupabaseConfigured: vi.fn(() => false),
}));

vi.mock('../../utils/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('../redisClient', () => ({
  getCachedDailyLeaderboard: vi.fn(async () => null),
  cacheDailyLeaderboard: vi.fn(async () => {}),
  getCachedDailyPuzzle: vi.fn(async () => null),
  cacheDailyPuzzle: vi.fn(async () => {}),
}));

vi.mock('../../utils/requestCoalescing', () => ({
  coalesce: vi.fn(async (_key, fn) => fn()),
}));

vi.mock('../../../utils/dailyChallenge/gridGeneration.server', () => ({
  generateDailyPuzzleAsync: vi.fn(async (date: string, language: string) => ({
    grid: [['A', 'B'], ['C', 'D']],
    targetWord: `WORD-${date}`,
    puzzleDate: date,
    puzzleNumber: 1,
    language,
    meaning: null,
  })),
}));

import dailyChallengeRouter from '../dailyChallenge';

type RouteHandler = (req: unknown, res: unknown) => Promise<void> | void;

const puzzleHandler: RouteHandler = (() => {
  const router = dailyChallengeRouter as unknown as {
    stack: Array<{ route?: { path: string; stack: Array<{ handle: RouteHandler }> } }>;
  };
  const layer = router.stack.find((l) => l.route?.path === '/puzzle/:date/:language');
  if (!layer?.route) throw new Error('GET /puzzle/:date/:language route not found');
  return layer.route.stack[layer.route.stack.length - 1].handle;
})();

async function callPuzzle(date: string) {
  const out = { status: 200, body: null as unknown, headers: {} as Record<string, string> };
  const res = {
    status(code: number) { out.status = code; return this; },
    setHeader(k: string, v: string) { out.headers[k.toLowerCase()] = v; return this; },
    json(payload: unknown) { out.body = payload; return this; },
  };
  await puzzleHandler({ params: { date, language: 'en' }, query: {} }, res);
  return out;
}

describe('GET /api/daily-challenge/puzzle/:date/:language', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-05-12T23:30:00Z'));
  });

  it('serves today\'s puzzle', async () => {
    const res = await callPuzzle('2026-05-12');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ targetWord: 'WORD-2026-05-12' });
  });

  it('refuses a day that has not started in UTC, without a shared cache header', async () => {
    const res = await callPuzzle('2026-05-13');
    expect(res.status).toBe(404);
    expect(JSON.stringify(res.body)).not.toContain('WORD-2026-05-13');
    expect(res.headers['cache-control'] ?? '').not.toContain('public');
  });
});
