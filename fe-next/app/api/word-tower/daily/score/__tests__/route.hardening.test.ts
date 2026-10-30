import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/apiRateLimit', () => ({ checkApiRateLimit: () => ({ success: true }) }));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));
const auth = { user: null as { id: string } | null };
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: async () => auth.user }));
vi.mock('@/lib/daily/questSeams', () => ({ creditDailyQuests: vi.fn() }));

const db = {
  existing: [] as Array<{ id: string; best_height_m: number; floors: number } | null>,
  insertError: null as { code: string } | null,
  updates: [] as unknown[],
  rows: [] as Array<Record<string, unknown>>,
};
vi.mock('@/lib/email', () => ({
  getSupabaseAdmin: () => ({
    from: () => {
      let updating = false;
      const b: Record<string, unknown> = {
        select: () => b,
        eq: () => b,
        order: () => b,
        limit: async () => ({ data: db.rows, error: null }),
        maybeSingle: async () => ({ data: db.existing.shift() ?? null }),
        insert: async () => ({ error: db.insertError }),
        update: (r: unknown) => ((updating = true), db.updates.push(r), b),
        then: (resolve: (v: unknown) => unknown) => Promise.resolve({ error: null, updating }).then(resolve),
      };
      return b;
    },
  }),
}));

import { GET, POST } from '../route';

const post = (body: unknown) =>
  POST(
    new Request('http://localhost/api/word-tower/daily/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }) as never,
  );

beforeEach(() => {
  auth.user = { id: 'u1' };
  db.existing = [];
  db.insertError = null;
  db.updates = [];
  db.rows = [];
});

describe('POST /api/word-tower/daily/score — hardening', () => {
  it('rejects a day of growth no player can build', async () => {
    expect((await post({ heightM: 50_000, floors: 10, language: 'en' })).status).toBe(400);
  });

  it('a concurrent first submit that hits the unique index merges instead of failing', async () => {
    db.insertError = { code: '23505' };
    db.existing = [null, { id: 'r1', best_height_m: 9, floors: 3 }];
    const res = await post({ heightM: 12, floors: 4, language: 'en' });
    expect(res.status).toBe(200);
    expect(db.updates).toHaveLength(1);
  });
});

describe('GET /api/word-tower/daily/score — no identifiers', () => {
  it('returns isYou and isGuest but never the player id', async () => {
    db.rows = [
      { player_id: 'u1', guest_fingerprint: null, display_name: 'Me', best_height_m: 12, floors: 4, rank_position: 1 },
      { player_id: null, guest_fingerprint: 'g', display_name: 'Guest', best_height_m: 6, floors: 2, rank_position: 2 },
    ];
    const res = await GET(new Request('http://localhost/api/word-tower/daily/score?language=en') as never);
    const json = await res.json();
    expect(json.leaderboard[0]).not.toHaveProperty('playerId');
    expect(json.leaderboard[0]).toMatchObject({ isYou: true, isGuest: false });
    expect(json.leaderboard[1]).toMatchObject({ isYou: false, isGuest: true });
  });
});
