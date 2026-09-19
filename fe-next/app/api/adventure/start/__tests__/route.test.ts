/**
 * POST /api/adventure/start route tests.
 */
// @ts-nocheck
import { vi } from 'vitest';

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({ data, status: init?.status ?? 200, json: async () => data })),
  },
}));

const mockCheckApiRateLimit = vi.fn().mockReturnValue({ success: true });
vi.mock('@/lib/apiRateLimit', () => ({
  checkApiRateLimit: (...args: unknown[]) => mockCheckApiRateLimit(...args),
}));

const mockGetAuthedUser = vi.fn();
vi.mock('@/lib/auth/getAuthedUser', () => ({
  getAuthedUser: (...args: unknown[]) => mockGetAuthedUser(...args),
}));

const mockCreateAdminClient = vi.fn();
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: (...args: unknown[]) => mockCreateAdminClient(...args),
}));

vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));

import { POST } from '../route';
import { getPlayLevel } from '@/lib/adventure/play/levels';
import { verifyAttempt } from '@/lib/adventure/play/attemptToken';
import { freshRun, signRun, verifyRun, makeOffer } from '@/lib/adventure/play/runToken';
import { isWordOnBoard } from '@/utils/clientWordValidator';

function makeRequest(body?: unknown) {
  return {
    headers: { get: vi.fn().mockReturnValue('127.0.0.1') },
    json: async () => body,
  };
}

/** Small in-memory fake for the service-role client, per the repo's supabase mocking idiom. */
function makeFakeDb(seed: Record<string, any[]> = {}) {
  const tables: Record<string, any[]> = {
    level_completions: seed.level_completions ?? [],
    player_inventory: seed.player_inventory ?? [],
    player_progression: seed.player_progression ?? [],
  };
  const upserts: { table: string; row: any; options: any }[] = [];

  function matchRow(row: any, filters: [string, unknown][]) {
    return filters.every(([col, val]) => row[col] === val);
  }

  function from(table: string) {
    return {
      select: () => {
        const filters: [string, unknown][] = [];
        const builder: any = {
          eq(col: string, val: unknown) {
            filters.push([col, val]);
            return builder;
          },
          maybeSingle() {
            const rows = (tables[table] || []).filter((r) => matchRow(r, filters));
            return Promise.resolve({ data: rows[0] ?? null, error: null });
          },
          then(resolve: any, reject: any) {
            const rows = (tables[table] || []).filter((r) => matchRow(r, filters));
            return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
          },
        };
        return builder;
      },
      upsert: (row: any, options: any) => {
        upserts.push({ table, row, options });
        tables[table] = tables[table] || [];
        tables[table].push(row);
        return Promise.resolve({ error: null });
      },
    };
  }

  return { db: { from } as any, upserts, tables };
}

describe('POST /api/adventure/start', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckApiRateLimit.mockReturnValue({ success: true });
    process.env = { ...ORIGINAL_ENV, SUPABASE_SERVICE_ROLE_KEY: 'test-key' };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('given no authenticated user, when POST is called, then returns 401', async () => {
    mockGetAuthedUser.mockResolvedValue(null);

    const res = await POST(makeRequest({ world: 1, level: 1, language: 'en' }));

    expect(res.status).toBe(401);
  });

  it('given world 0, when POST is called, then returns 400 Invalid level', async () => {
    mockGetAuthedUser.mockResolvedValue({ id: 'user-1' });

    const res = await POST(makeRequest({ world: 0, level: 1, language: 'en' }));

    expect(res.status).toBe(400);
    expect(res.data.error).toBe('Invalid level');
  });

  it('given level 8, when POST is called, then returns 400 Invalid level', async () => {
    mockGetAuthedUser.mockResolvedValue({ id: 'user-1' });

    const res = await POST(makeRequest({ world: 1, level: 8, language: 'en' }));

    expect(res.status).toBe(400);
    expect(res.data.error).toBe('Invalid level');
  });

  it('given createAdminClient returns null, when POST is called, then returns 503', async () => {
    mockGetAuthedUser.mockResolvedValue({ id: 'user-1' });
    mockCreateAdminClient.mockReturnValue(null);

    const res = await POST(makeRequest({ world: 1, level: 1, language: 'en' }));

    expect(res.status).toBe(503);
  });

  it('given level 2 requested with no level-1 completion, when POST is called, then returns 403 Locked', async () => {
    mockGetAuthedUser.mockResolvedValue({ id: 'user-1' });
    const { db } = makeFakeDb({ level_completions: [] });
    mockCreateAdminClient.mockReturnValue(db);

    const res = await POST(makeRequest({ world: 1, level: 2, language: 'en' }));

    expect(res.status).toBe(403);
    expect(res.data.error).toBe('Locked');
  });

  it('given world1/level1, when POST is called, then returns 200 with token, grid and level', async () => {
    mockGetAuthedUser.mockResolvedValue({ id: 'user-1' });
    const { db } = makeFakeDb({ level_completions: [] });
    mockCreateAdminClient.mockReturnValue(db);

    const res = await POST(makeRequest({ world: 1, level: 1, language: 'en' }));

    const expectedLevel = getPlayLevel(1, 1);
    expect(res.status).toBe(200);
    expect(typeof res.data.token).toBe('string');
    expect(res.data.token.split('.').length).toBe(2);
    expect(res.data.grid).toHaveLength(expectedLevel.size);
    expect(res.data.grid[0]).toHaveLength(expectedLevel.size);
    expect(res.data.level).toEqual(expectedLevel);
    expect(res.data.language).toBe('en');
  });

  it('given Russian, when POST is called, then the board is dealt in Russian', async () => {
    mockGetAuthedUser.mockResolvedValue({ id: 'user-1' });
    const { db } = makeFakeDb({ level_completions: [] });
    mockCreateAdminClient.mockReturnValue(db);

    const res = await POST(makeRequest({ world: 1, level: 1, language: 'ru' }));

    expect(res.status).toBe(200);
    expect(res.data.language).toBe('ru');
  });

  describe('roguelike run', () => {
    const SECRET = 'test-key';
    const cleared = (n: number) =>
      Array.from({ length: n }, (_, i) => ({ user_id: 'user-1', world: 1, level: i + 1, stars: 1 }));

    beforeEach(() => {
      mockGetAuthedUser.mockResolvedValue({ id: 'user-1' });
    });

    it('given no runToken, when a level starts, then a fresh run is issued with a public run, hints, and relic-free attempt', async () => {
      const { db } = makeFakeDb({ level_completions: [] });
      mockCreateAdminClient.mockReturnValue(db);

      const res = await POST(makeRequest({ world: 1, level: 1, language: 'en' }));

      expect(res.status).toBe(200);
      expect(res.data.run).toMatchObject({ w: 1, step: 1, relics: [] });
      expect(res.data.run).not.toHaveProperty('u');
      expect(res.data.run).not.toHaveProperty('seed');
      expect(verifyRun(res.data.runToken, SECRET)?.u).toBe('user-1');
      expect(Array.isArray(res.data.hints)).toBe(true);
      expect(res.data.hints.length).toBeGreaterThan(0);
      expect(res.data.hints.length).toBeLessThanOrEqual(12);
      const board = res.data.grid.map((r: string[]) => r.map((c) => c.toLowerCase()));
      for (const h of res.data.hints) expect(isWordOnBoard(h, board, 'en')).toBe(true);
      const attempt = verifyAttempt(res.data.token, SECRET);
      expect(attempt).toMatchObject({ k: 'classic', r: [] });
      expect(attempt?.run?.step).toBe(1);
    }, 30_000);

    it('given a hunt level, when started, then huntCount+1 targets are on the board and signed into the attempt', async () => {
      const { db } = makeFakeDb({ level_completions: cleared(1) });
      mockCreateAdminClient.mockReturnValue(db);

      const res = await POST(makeRequest({ world: 1, level: 2, language: 'en' }));

      const lvl = getPlayLevel(1, 2);
      expect(res.status).toBe(200);
      expect(res.data.targets).toHaveLength(lvl.huntCount! + 1);
      const board = res.data.grid.map((r: string[]) => r.map((c) => c.toLowerCase()));
      for (const t of res.data.targets) expect(isWordOnBoard(t, board, 'en')).toBe(true);
      expect(verifyAttempt(res.data.token, SECRET)).toMatchObject({ k: 'hunt', tg: res.data.targets });
    }, 30_000);

    it('given a runToken with an offer and a valid pick, when started, then the pick is applied and the attempt carries the relics', async () => {
      const { db } = makeFakeDb({ level_completions: cleared(1) });
      mockCreateAdminClient.mockReturnValue(db);
      const run = { ...freshRun(1, 'user-1', 'seed-1'), step: 2, offer: [{ type: 'relic', id: 'magnet' }, { type: 'gold', amount: 10 }] };

      const res = await POST(makeRequest({ world: 1, level: 2, language: 'en', runToken: signRun(run, SECRET), pick: 0 }));

      expect(res.status).toBe(200);
      expect(res.data.run.relics).toEqual(['magnet']);
      expect(res.data.run.offer).toBeUndefined();
      expect(verifyAttempt(res.data.token, SECRET)?.r).toEqual(['magnet']);
      expect(verifyRun(res.data.runToken, SECRET)?.relics).toEqual(['magnet']);
    }, 30_000);

    it('given a runToken with no pick, when started, then the offer is skipped', async () => {
      const { db } = makeFakeDb({ level_completions: cleared(1) });
      mockCreateAdminClient.mockReturnValue(db);
      const run = { ...freshRun(1, 'user-1', 's'), step: 2, offer: makeOffer('s', 2, [], 3) };

      const res = await POST(makeRequest({ world: 1, level: 2, language: 'en', runToken: signRun(run, SECRET) }));

      expect(res.status).toBe(200);
      expect(res.data.run.relics).toEqual([]);
    }, 30_000);

    it.each([
      ['step mismatch', { step: 3 }, { pick: 0 }],
      ['pick outside the offer', {}, { pick: 5 }],
      ['another user', { u: 'someone-else' }, { pick: 0 }],
      ['another world', { w: 2 }, { pick: 0 }],
    ])('given a runToken with %s, when started, then 400 Invalid run', async (_label, runOver, bodyOver) => {
      const { db } = makeFakeDb({ level_completions: cleared(1) });
      mockCreateAdminClient.mockReturnValue(db);
      const run = { ...freshRun(1, 'user-1', 's'), step: 2, offer: [{ type: 'gold', amount: 10 }], ...runOver };

      const res = await POST(makeRequest({ world: 1, level: 2, language: 'en', runToken: signRun(run, SECRET), ...bodyOver }));

      expect(res.status).toBe(400);
      expect(res.data.error).toBe('Invalid run');
    });

    it('given a tampered runToken, when started, then 400 Invalid run', async () => {
      const { db } = makeFakeDb({ level_completions: cleared(1) });
      mockCreateAdminClient.mockReturnValue(db);
      const tok = signRun({ ...freshRun(1, 'user-1', 's'), step: 2 }, SECRET);
      const forged = Buffer.from(JSON.stringify({ ...freshRun(1, 'user-1', 's'), step: 2, relics: ['magnet'] })).toString('base64url');

      const res = await POST(makeRequest({ world: 1, level: 2, language: 'en', runToken: `${forged}.${tok.split('.')[1]}` }));

      expect(res.status).toBe(400);
    });
  });
});
