import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/apiRateLimit', () => ({ checkApiRateLimit: () => ({ success: true }) }));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));
const auth = { user: null as { id: string } | null };
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: async () => auth.user }));
vi.mock('@/lib/daily/questSeams', () => ({ creditDailyQuests: vi.fn() }));

const db = {
  existing: [] as Array<{ id: string; best_height_m: number; floors: number } | null>,
  inserts: [] as Array<Record<string, unknown>>,
  updates: [] as Array<Record<string, unknown>>,
  rows: [] as Array<Record<string, unknown>>,
};
vi.mock('@/lib/email', () => ({
  getSupabaseAdmin: () => ({
    from: () => {
      const b: Record<string, unknown> = {
        select: () => b,
        eq: () => b,
        order: () => b,
        limit: async () => ({ data: db.rows, error: null }),
        maybeSingle: async () => ({ data: db.existing.shift() ?? null }),
        insert: async (r: Record<string, unknown>) => (db.inserts.push(r), { error: null }),
        update: (r: Record<string, unknown>) => (db.updates.push(r), b),
        then: (resolve: (v: unknown) => unknown) => Promise.resolve({ error: null }).then(resolve),
      };
      return b;
    },
  }),
}));

import { GET, POST } from '../route';

const post = (body: unknown) =>
  POST(new Request('http://localhost/api/word-tower/daily/score', { method: 'POST', body: JSON.stringify(body) }) as never);
const get = (qs = 'language=en') => GET(new Request(`http://localhost/api/word-tower/daily/score?${qs}`) as never);

beforeEach(() => {
  auth.user = { id: 'u1' };
  db.existing = [];
  db.inserts = [];
  db.updates = [];
  db.rows = [];
});

describe('daily score — the tower travels with the row', () => {
  it('stores the top floors of the tower, cleaned, on a first submit', async () => {
    const words = Array.from({ length: 40 }, (_, i) => `w${i}`);
    await post({ heightM: 30, floors: 10, language: 'en', towerWords: [...words, 42, '‮evil'] });
    const stored = db.inserts[0].tower_words as string[];
    expect(stored.length).toBeLessThanOrEqual(24);
    expect(stored.at(-1)).toBe('evil');
    expect(stored).not.toContain(42);
  });

  it('keeps the words of the better climb when a submit improves the best', async () => {
    db.existing = [{ id: 'r1', best_height_m: 9, floors: 3 }];
    await post({ heightM: 20, floors: 7, language: 'en', towerWords: ['cat', 'dog'] });
    expect(db.updates[0].tower_words).toEqual(['cat', 'dog']);
  });

  it('a submit without words leaves the stored tower alone', async () => {
    db.existing = [{ id: 'r1', best_height_m: 9, floors: 3 }];
    await post({ heightM: 20, floors: 7, language: 'en' });
    expect(db.updates[0]).not.toHaveProperty('tower_words');
  });

  it('the board carries each row\'s words, never an identifier', async () => {
    auth.user = null;
    db.rows = [
      { player_id: 'p1', guest_fingerprint: null, display_name: 'Dana', best_height_m: 12, floors: 4, rank_position: 1, tower_words: ['sun', 'moon'] },
      { player_id: null, guest_fingerprint: 'fp-secret', display_name: 'Guest', best_height_m: 6, floors: 2, rank_position: 2, tower_words: null },
    ];
    const body = await (await get('language=en&guestFingerprint=fp-secret')).json();
    expect(body.leaderboard[0]).toMatchObject({ words: ['sun', 'moon'], isYou: false });
    expect(body.leaderboard[1]).toMatchObject({ words: [], isYou: true });
    expect(JSON.stringify(body)).not.toMatch(/fp-secret|p1/);
  });
});
