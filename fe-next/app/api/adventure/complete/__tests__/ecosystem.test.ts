/**
 * /api/adventure/complete — the ecosystem half.
 * A cleared node must move XP, coins, profile totals, achievements and the
 * streak exactly ONCE per attempt, and a broken ecosystem hop must never cost
 * the player their run save.
 */
// @ts-nocheck
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('next/server', () => ({
  NextResponse: { json: vi.fn((data, init) => ({ data, status: init?.status ?? 200, json: async () => data })) },
}));
vi.mock('@/lib/apiRateLimit', () => ({ checkApiRateLimit: () => ({ success: true }) }));

const mockGetAuthedUser = vi.fn();
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: (...a: unknown[]) => mockGetAuthedUser(...a) }));

const mockCreateAdminClient = vi.fn();
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: () => mockCreateAdminClient() }));

const mockLoadDictionarySet = vi.fn();
vi.mock('@/lib/server/dictionarySet', () => ({
  loadDictionarySet: (...a: unknown[]) => mockLoadDictionarySet(...a),
  loadWordChecker: async (lang: string) => {
    const set: Set<string> = await mockLoadDictionarySet(lang);
    return set.size ? (w: string) => set.has(w) : null;
  },
}));

const mockCaptureApiError = vi.fn();
vi.mock('@/utils/sentry', () => ({ captureApiError: (...a: unknown[]) => mockCaptureApiError(...a) }));

const mockAwardCoins = vi.fn(async () => ({ success: true, newBalance: 100 }));
vi.mock('@/backend/services/economy/awardCoins', () => ({ awardCoinsServer: (...a: unknown[]) => mockAwardCoins(...a) }));

const mockNotifyLevelUp = vi.fn(async () => undefined);
vi.mock('@/backend/modules/pushNotificationTriggers', () => ({ notifyLevelUp: (...a: unknown[]) => mockNotifyLevelUp(...a) }));

const mockCheckLifetime = vi.fn(() => []);
vi.mock('@/backend/modules/achievementManager', () => ({ checkLifetimeAchievements: (...a: unknown[]) => mockCheckLifetime(...a) }));

import { POST } from '../route';
import { signAttempt } from '@/lib/adventure/play/attemptToken';
import { freshRun, enterNode } from '@/lib/adventure/play/runToken';
import { buildRunMap } from '@/lib/adventure/play/runMap';
import { PROFILE_COLUMNS } from '@/lib/adventure/play/ecosystem';

const USER_ID = 'eco-user';
const SECRET = 'test-key';
const grid = [
  ['c', 'a', 't', 's'],
  ['x', 'x', 'x', 'e'],
  ['x', 'x', 'x', 'r'],
  ['x', 'x', 'x', 'x'],
];
const MAP = buildRunMap('eco-seed', 1);
const FIGHT = MAP.nodes.find((n) => n.row === 0)!;
const ELITE = MAP.nodes.find((n) => n.kind === 'elite')!;

/**
 * One fixed base for every attempt stamp. `Date.now() - N` collides across
 * tests that run in the same millisecond, and the attempt stamp IS the
 * idempotency key — a collision silently makes the next test look deduped.
 * 50s back keeps every attempt inside the level clock + grace window.
 */
const T_BASE = Date.now() - 50_000;
const T = (n: number) => T_BASE + n * 7;

const makeRequest = (body: unknown) => ({ headers: { get: () => '127.0.0.1' }, json: async () => body });

function token(over: Record<string, unknown> = {}) {
  const node = (over.node as typeof FIGHT) ?? FIGHT;
  return signAttempt({
    u: USER_ID, w: 1, l: node.level ?? 1, g: grid, lang: 'en', t: (over.t as number) ?? Date.now(),
    k: node.kind === 'elite' ? 'elite' : 'classic', r: (over.r as string[]) ?? [],
    run: enterNode(freshRun(1, USER_ID, 'eco-seed'), node.id),
  }, SECRET);
}

/** Fake service client with the update/rpc surface the ecosystem needs. */
function makeDb(opts: { rpcThrows?: boolean } = {}) {
  const tables: Record<string, any[]> = { level_completions: [], player_inventory: [], player_progression: [], profiles: [{ id: USER_ID, total_games: 4, total_score: 100, total_words: 20, current_level: 2, total_xp: 300 }], player_engagement: [] };
  const updates: { table: string; row: any }[] = [];
  const rpcCalls: { fn: string; args: any }[] = [];

  const selects: { table: string; cols: string }[] = [];
  const from = (table: string) => ({
    select: (cols = '') => {
      selects.push({ table, cols });
      const f: [string, unknown][] = [];
      const b: any = {
        eq(c: string, v: unknown) { f.push([c, v]); return b; },
        maybeSingle: () => Promise.resolve({ data: (tables[table] || []).find((r) => f.every(([c, v]) => r[c] === v)) ?? null, error: null }),
        single: () => Promise.resolve({ data: (tables[table] || []).find((r) => f.every(([c, v]) => r[c] === v)) ?? null, error: null }),
        then: (res: any, rej: any) => Promise.resolve({ data: (tables[table] || []).filter((r) => f.every(([c, v]) => r[c] === v)), error: null }).then(res, rej),
      };
      return b;
    },
    upsert: (row: any) => { tables[table] = tables[table] || []; tables[table].unshift(row); return Promise.resolve({ error: null }); },
    update: (row: any) => ({ eq: () => { updates.push({ table, row }); Object.assign(tables[table]?.[0] ?? {}, row); return Promise.resolve({ error: null }); } }),
  });

  const rpc = (fn: string, args: any) => {
    rpcCalls.push({ fn, args });
    if (opts.rpcThrows) return Promise.resolve({ data: null, error: { message: 'rpc exploded' } });
    return Promise.resolve({ data: [{ new_total_xp: 500, new_level: 3, xp_granted: args.p_xp_amount }], error: null });
  };

  return { db: { from, rpc } as any, tables, updates, rpcCalls, selects };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAuthedUser.mockResolvedValue({ id: USER_ID });
  mockLoadDictionarySet.mockResolvedValue(new Set(['cats', 'catser']));
  mockAwardCoins.mockResolvedValue({ success: true, newBalance: 100 });
  mockCheckLifetime.mockReturnValue([]);
  process.env.ADVENTURE_ATTEMPT_SECRET = SECRET;
});

/**
 * Regression: `games_won` was in this list and does NOT exist on `profiles`.
 * PostgREST rejects the whole select (42703); the failure-isolated read then
 * returned an empty profile and every total was rewritten as "0 + this game"
 * instead of accumulating. The unit mocks could not see it — only the live DB
 * could — so the column list is pinned here against the verified schema.
 */
const LIVE_PROFILE_COLUMNS = new Set([
  'achievement_counts', 'casual_games', 'current_level', 'last_game_at', 'longest_word',
  'longest_word_length', 'player_title', 'total_games', 'total_score', 'total_time_played',
  'total_words', 'total_xp', 'unique_days_played',
]);

describe('profile column list', () => {
  it('Given the columns the ecosystem reads, When checked, Then every one exists on profiles', () => {
    for (const col of PROFILE_COLUMNS.split(',').map((c) => c.trim())) {
      expect(LIVE_PROFILE_COLUMNS.has(col)).toBe(true);
    }
  });

  it('Given a cleared node, When the profile is read, Then it asks for exactly that column list', async () => {
    const { db, selects } = makeDb();
    mockCreateAdminClient.mockReturnValue(db);

    await POST(makeRequest({ token: token({ t: T(90) }), words: ['cats', 'catser'] }));

    expect(selects.some((s) => s.table === 'profiles' && s.cols === PROFILE_COLUMNS)).toBe(true);
  });
});

describe('ecosystem crediting', () => {
  it('Given an existing profile, When a second node clears, Then totals ACCUMULATE rather than reset', async () => {
    const { db, updates, tables } = makeDb();
    mockCreateAdminClient.mockReturnValue(db);

    await POST(makeRequest({ token: token({ t: T(100) }), words: ['cats', 'catser'] }));
    const afterFirst = { ...tables.profiles[0] };
    await POST(makeRequest({ token: token({ t: T(101) }), words: ['cats', 'catser'] }));

    const writes = updates.filter((u) => u.table === 'profiles' && 'total_games' in u.row);
    expect(writes).toHaveLength(2);
    expect(writes[0].row.total_games).toBe(5);
    expect(writes[1].row.total_games).toBe(6);
    expect(writes[1].row.total_score).toBeGreaterThan(afterFirst.total_score);
  });

  it('Given a cleared fight, When completed, Then profile totals, XP and the streak all move and are reported back', async () => {
    const { db, rpcCalls, updates } = makeDb();
    mockCreateAdminClient.mockReturnValue(db);

    const res = await POST(makeRequest({ token: token({ t: T(10) }), words: ['cats', 'catser'], hpLeft: 4 }));

    expect(res.status).toBe(200);
    expect(res.data.won).toBe(true);
    expect(rpcCalls.find((c) => c.fn === 'increment_player_xp')?.args.p_player_id).toBe(USER_ID);
    expect(res.data.xpGained).toBeGreaterThan(0);
    const profileUpdate = updates.find((u) => u.table === 'profiles' && 'total_games' in u.row);
    expect(profileUpdate?.row.total_games).toBe(5);
    expect(profileUpdate?.row.total_score).toBeGreaterThan(100);
    expect(res.data.streak).toMatchObject({ current: 1 });
    expect(Array.isArray(res.data.achievementsUnlocked)).toBe(true);
  });

  it('Given the same attempt replayed, When completed twice, Then nothing is credited a second time', async () => {
    const { db, rpcCalls, updates } = makeDb();
    mockCreateAdminClient.mockReturnValue(db);
    const tok = token({ t: T(20) });

    const first = await POST(makeRequest({ token: tok, words: ['cats', 'catser'], hpLeft: 4 }));
    const xpCallsAfterFirst = rpcCalls.filter((c) => c.fn === 'increment_player_xp').length;
    const profileUpdatesAfterFirst = updates.filter((u) => u.table === 'profiles' && 'total_games' in u.row).length;

    const second = await POST(makeRequest({ token: tok, words: ['cats', 'catser'], hpLeft: 4 }));

    expect(first.data.xpGained).toBeGreaterThan(0);
    expect(second.status).toBe(200);
    expect(second.data.xpGained).toBe(0);
    expect(second.data.coinsGained).toBe(0);
    expect(rpcCalls.filter((c) => c.fn === 'increment_player_xp')).toHaveLength(xpCallsAfterFirst);
    expect(updates.filter((u) => u.table === 'profiles' && 'total_games' in u.row)).toHaveLength(profileUpdatesAfterFirst);
  });

  it('Given the completion row, When written, Then it carries the ATTEMPT time as the idempotency stamp', async () => {
    const { db, tables } = makeDb();
    mockCreateAdminClient.mockReturnValue(db);
    const t = Date.now() - 30;

    await POST(makeRequest({ token: token({ t }), words: ['cats', 'catser'] }));

    expect(tables.level_completions[0].completed_at).toBe(new Date(t).toISOString());
  });

  it('Given a lost node, When completed, Then no ecosystem call fires', async () => {
    const { db, rpcCalls, updates } = makeDb();
    mockCreateAdminClient.mockReturnValue(db);

    const res = await POST(makeRequest({ token: token({ t: T(40) }), words: [] }));

    expect(res.data.won).toBe(false);
    expect(res.data.xpGained).toBe(0);
    expect(rpcCalls).toHaveLength(0);
    expect(updates.filter((u) => u.table === 'profiles')).toHaveLength(0);
    expect(mockAwardCoins).not.toHaveBeenCalled();
  });

  it('Given a plain fight, When cleared, Then no coins are paid (run gold stays in the run)', async () => {
    const { db } = makeDb();
    mockCreateAdminClient.mockReturnValue(db);

    const res = await POST(makeRequest({ token: token({ t: T(50) }), words: ['cats', 'catser'] }));

    expect(mockAwardCoins).not.toHaveBeenCalled();
    expect(res.data.coinsGained).toBe(0);
  });

  it('Given an elite falls, When completed, Then coins are paid under an adventure reason', async () => {
    const { db } = makeDb();
    mockCreateAdminClient.mockReturnValue(db);

    const res = await POST(makeRequest({ token: token({ node: ELITE, t: T(60), r: ['magnet', 'sharp-quill'] }), words: ['cats', 'catser'], hpLeft: 2 }));

    expect(res.data.won).toBe(true);
    expect(mockAwardCoins).toHaveBeenCalledWith(USER_ID, expect.any(Number), 'adventure_elite', expect.any(Object));
    expect(res.data.coinsGained).toBeGreaterThan(0);
  });

  it('Given the XP RPC fails, When completed, Then the run still saves and Sentry hears about it', async () => {
    const { db } = makeDb({ rpcThrows: true });
    mockCreateAdminClient.mockReturnValue(db);

    const res = await POST(makeRequest({ token: token({ t: T(70) }), words: ['cats', 'catser'], hpLeft: 4 }));

    expect(res.status).toBe(200);
    expect(res.data.won).toBe(true);
    expect(res.data.stars).toBeGreaterThan(0);
    expect(res.data.xpGained).toBe(0);
    expect(mockCaptureApiError).toHaveBeenCalled();
  });

  it('Given a lifetime achievement unlocks, When completed, Then it is merged into the profile and reported', async () => {
    mockCheckLifetime.mockReturnValue([{ key: 'wordsmith', icon: 'star' }]);
    const { db, updates } = makeDb();
    mockCreateAdminClient.mockReturnValue(db);

    const res = await POST(makeRequest({ token: token({ t: T(80) }), words: ['cats', 'catser'] }));

    expect(res.data.achievementsUnlocked).toEqual(['wordsmith']);
    expect(updates.find((u) => u.row.achievement_counts)?.row.achievement_counts).toMatchObject({ wordsmith: 1 });
  });
});
