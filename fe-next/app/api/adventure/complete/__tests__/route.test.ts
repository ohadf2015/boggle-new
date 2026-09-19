/**
 * POST /api/adventure/complete route tests.
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

const mockLoadDictionarySet = vi.fn();
vi.mock('@/lib/server/dictionarySet', () => ({
  loadDictionarySet: (...args: unknown[]) => mockLoadDictionarySet(...args),
  loadWordChecker: async (lang: string) => {
    const set: Set<string> = await mockLoadDictionarySet(lang);
    return set.size ? (w: string) => set.has(w) : null;
  },
}));

const mockCaptureApiError = vi.fn();
vi.mock('@/utils/sentry', () => ({
  captureApiError: (...args: unknown[]) => mockCaptureApiError(...args),
}));

import { POST } from '../route';
import { signAttempt } from '@/lib/adventure/play/attemptToken';
import { GRACE_MS } from '@/lib/adventure/play/settleRun';

const USER_ID = 'user-1';
const SECRET = 'test-key';

/**
 * 4x4 board:
 *   C A T S
 *   X X X E
 *   X X X R
 *   X X X X
 * "cats"   -> row 0 left-to-right (length 4, 20 pts)
 * "catser" -> row 0 then down the last column through E, R (length 6, 100 pts)
 * "dog" is never on the board (no d/o/g letters) regardless of dictionary membership.
 */
const GRID = [
  ['C', 'A', 'T', 'S'],
  ['X', 'X', 'X', 'E'],
  ['X', 'X', 'X', 'R'],
  ['X', 'X', 'X', 'X'],
];

const TEST_DICT = new Set(['cats', 'catser', 'dog']);

function makeRequest(body?: unknown) {
  return {
    headers: { get: vi.fn().mockReturnValue('127.0.0.1') },
    json: async () => body,
  };
}

function makeToken(overrides: Partial<{ u: string; w: number; l: number; g: string[][]; lang: string; t: number }> = {}) {
  return signAttempt(
    {
      u: USER_ID,
      w: 1,
      l: 1,
      g: GRID,
      lang: 'en',
      t: Date.now(),
      ...overrides,
    },
    SECRET,
  );
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

function upsertsFor(upserts: { table: string; row: any; options: any }[], table: string) {
  return upserts.filter((u) => u.table === table);
}

describe('POST /api/adventure/complete', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockCheckApiRateLimit.mockReturnValue({ success: true });
    mockLoadDictionarySet.mockResolvedValue(TEST_DICT);
    process.env = { ...ORIGINAL_ENV, SUPABASE_SERVICE_ROLE_KEY: SECRET };
  });

  afterEach(() => {
    vi.useRealTimers();
    process.env = ORIGINAL_ENV;
  });

  it('given no authenticated user, when POST is called, then returns 401', async () => {
    mockGetAuthedUser.mockResolvedValue(null);

    const res = await POST(makeRequest({ token: 'anything', words: ['cats'] }));

    expect(res.status).toBe(401);
  });

  it('given a tampered token, when POST is called, then returns 400 Invalid attempt', async () => {
    mockGetAuthedUser.mockResolvedValue({ id: USER_ID });
    const { db } = makeFakeDb();
    mockCreateAdminClient.mockReturnValue(db);

    const good = makeToken();
    const [body, sig] = good.split('.');
    const tampered = `${body}.${sig.slice(0, -1)}${sig.at(-1) === 'a' ? 'b' : 'a'}`;

    const res = await POST(makeRequest({ token: tampered, words: ['cats'] }));

    expect(res.status).toBe(400);
    expect(res.data.error).toBe('Invalid attempt');
  });

  it('given a token issued for another user, when POST is called, then returns 400 Invalid attempt', async () => {
    mockGetAuthedUser.mockResolvedValue({ id: USER_ID });
    const { db } = makeFakeDb();
    mockCreateAdminClient.mockReturnValue(db);

    const token = makeToken({ u: 'someone-else' });

    const res = await POST(makeRequest({ token, words: ['cats'] }));

    expect(res.status).toBe(400);
    expect(res.data.error).toBe('Invalid attempt');
  });

  it('given now is past seconds + GRACE_MS after issue, when POST is called, then returns 409 expired', async () => {
    mockGetAuthedUser.mockResolvedValue({ id: USER_ID });
    const { db } = makeFakeDb();
    mockCreateAdminClient.mockReturnValue(db);

    const start = Date.now();
    const token = makeToken({ t: start });
    // world1/level1 seconds=90 (non-boss); advance strictly past seconds*1000 + GRACE_MS.
    vi.setSystemTime(start + 90_000 + GRACE_MS + 1);

    const res = await POST(makeRequest({ token, words: ['cats'] }));

    expect(res.status).toBe(409);
    expect(res.data.error).toBe('expired');
  });

  it('given a first clear win, when POST is called, then upserts completion/progression and grants the lore scroll', async () => {
    mockGetAuthedUser.mockResolvedValue({ id: USER_ID });
    const { db, upserts } = makeFakeDb({ level_completions: [] });
    mockCreateAdminClient.mockReturnValue(db);

    const token = makeToken();
    const res = await POST(makeRequest({ token, words: ['catser'] }));

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.won).toBe(true);
    expect(res.data.stars).toBeGreaterThan(0);
    expect(res.data.bestStars).toBe(res.data.stars);
    expect(res.data.rewards).toEqual(['lore-scroll-w1-l1']);
    expect(res.data.totalStars).toBe(res.data.stars);

    const completionUpserts = upsertsFor(upserts, 'level_completions');
    expect(completionUpserts).toHaveLength(1);
    expect(completionUpserts[0].row.stars).toBeGreaterThan(0);
    expect(completionUpserts[0].row.best_score).toBe(res.data.score);

    const progressionUpserts = upsertsFor(upserts, 'player_progression');
    expect(progressionUpserts).toHaveLength(1);
    expect(progressionUpserts[0].row.total_stars).toBe(res.data.stars);

    const inventoryUpserts = upsertsFor(upserts, 'player_inventory');
    expect(inventoryUpserts).toHaveLength(1);
    expect(inventoryUpserts[0].row).toMatchObject({
      user_id: USER_ID,
      item_id: 'lore-scroll-w1-l1',
      // must satisfy player_inventory_item_type_check / _category_check
      item_type: 'loreScroll',
      category: 'scroll',
      quantity: 1,
    });
  });

  it('given a replay with a worse score than a prior best, when POST is called, then keeps best stars/score (Math.max) and grants nothing new', async () => {
    mockGetAuthedUser.mockResolvedValue({ id: USER_ID });
    const { db, upserts } = makeFakeDb({
      level_completions: [
        { user_id: USER_ID, world: 1, level: 1, stars: 3, best_score: 200, best_words: 2 },
      ],
    });
    mockCreateAdminClient.mockReturnValue(db);

    const token = makeToken();
    // Only "catser" (100 pts, 1 star) this run — worse than the existing 3-star / 200-pt best.
    const res = await POST(makeRequest({ token, words: ['catser'] }));

    expect(res.status).toBe(200);
    expect(res.data.won).toBe(true);
    expect(res.data.stars).toBeLessThan(3);
    expect(res.data.bestStars).toBe(3);
    expect(res.data.rewards).toEqual([]);

    const completionUpserts = upsertsFor(upserts, 'level_completions');
    expect(completionUpserts).toHaveLength(1);
    expect(completionUpserts[0].row.stars).toBe(3);
    expect(completionUpserts[0].row.best_score).toBe(200);
    expect(completionUpserts[0].row.best_words).toBe(2);

    expect(upsertsFor(upserts, 'player_progression')).toHaveLength(0);
    expect(upsertsFor(upserts, 'player_inventory')).toHaveLength(0);
  });

  it('given a boss level with too few points, when POST is called, then returns won:false, stars 0 and writes nothing', async () => {
    mockGetAuthedUser.mockResolvedValue({ id: USER_ID });
    const { db, upserts } = makeFakeDb({ level_completions: [] });
    mockCreateAdminClient.mockReturnValue(db);

    const token = makeToken({ w: 1, l: 7 }); // boss level, bossHp well above 100 pts
    const res = await POST(makeRequest({ token, words: ['catser'] }));

    expect(res.status).toBe(200);
    expect(res.data.won).toBe(false);
    expect(res.data.stars).toBe(0);
    expect(res.data.rewards).toEqual([]);
    expect(upserts).toHaveLength(0);
  });

  it('given an empty dictionary set, when POST is called, then returns 500 Could not save run', async () => {
    mockGetAuthedUser.mockResolvedValue({ id: USER_ID });
    const { db } = makeFakeDb();
    mockCreateAdminClient.mockReturnValue(db);
    mockLoadDictionarySet.mockResolvedValueOnce(new Set());

    const token = makeToken();
    const res = await POST(makeRequest({ token, words: ['cats'] }));

    expect(res.status).toBe(500);
    expect(res.data.error).toBe('Could not save run');
  });

  it('given duplicate/case-variant submissions of the same word, when POST is called, then it is counted once', async () => {
    mockGetAuthedUser.mockResolvedValue({ id: USER_ID });
    const { db } = makeFakeDb({ level_completions: [] });
    mockCreateAdminClient.mockReturnValue(db);

    const token = makeToken();
    const res = await POST(makeRequest({ token, words: ['CATS', 'cats', 'Cats'] }));

    expect(res.status).toBe(200);
    expect(res.data.validWords).toEqual(['cats']);
  });

  it('given a dictionary word that is not reachable on the board, when POST is called, then it is rejected', async () => {
    mockGetAuthedUser.mockResolvedValue({ id: USER_ID });
    const { db } = makeFakeDb({ level_completions: [] });
    mockCreateAdminClient.mockReturnValue(db);

    const token = makeToken();
    const res = await POST(makeRequest({ token, words: ['dog'] }));

    expect(res.status).toBe(200);
    expect(res.data.validWords).toEqual([]);
  });
});
