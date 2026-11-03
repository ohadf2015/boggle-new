import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/apiRateLimit', () => ({ checkApiRateLimit: () => ({ success: true }) }));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));
const auth = { user: null as { id: string } | null };
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: async () => auth.user }));
vi.mock('@/lib/daily/questSeams', () => ({ creditDailyQuests: vi.fn() }));

const db = {
  existing: null as { id: string; best_height_m: number; floors: number } | null,
  inserts: [] as Array<Record<string, unknown>>,
  updates: [] as Array<Record<string, unknown>>,
};
vi.mock('@/lib/email', () => ({
  getSupabaseAdmin: () => ({
    from: () => {
      const b: Record<string, unknown> = {
        select: () => b,
        eq: () => b,
        maybeSingle: async () => ({ data: db.existing }),
        insert: async (row: Record<string, unknown>) => (db.inserts.push(row), { error: null }),
        update: (row: Record<string, unknown>) => (db.updates.push(row), b),
        then: (resolve: (v: unknown) => unknown) => Promise.resolve({ error: null }).then(resolve),
      };
      return b;
    },
  }),
}));

import { POST } from '../route';

const post = (body: Record<string, unknown>) =>
  POST(
    new Request('http://localhost/api/word-tower/daily/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ heightM: 12, floors: 4, language: 'en', ...body }),
    }) as never,
  );

beforeEach(() => {
  auth.user = null;
  db.existing = null;
  db.inserts = [];
  db.updates = [];
});

describe('POST /api/word-tower/daily/score — guest board name', () => {
  it('Given a guest who picked a name, When they first submit, Then the row carries that name', async () => {
    await post({ guestFingerprint: 'fp-1', displayName: '  Zigzag ' });
    expect(db.inserts[0]).toMatchObject({ guest_fingerprint: 'fp-1', display_name: 'Zigzag' });
  });

  it('Given a generated default name, Then the row stores no name', async () => {
    await post({ guestFingerprint: 'fp-1', displayName: 'Sneaky Potato' });
    expect(db.inserts[0].display_name ?? null).toBeNull();
  });

  it('Given a profane name, Then the row stores no name', async () => {
    await post({ guestFingerprint: 'fp-1', displayName: 'shit' });
    expect(db.inserts[0].display_name ?? null).toBeNull();
  });

  it('Given a signed-in player, Then a body name is ignored (the profile owns their name)', async () => {
    auth.user = { id: 'u1' };
    await post({ displayName: 'Zigzag' });
    expect(db.inserts[0].display_name ?? null).toBeNull();
  });

  it('Given a guest row that improves, Then the update also carries the chosen name', async () => {
    db.existing = { id: 'r1', best_height_m: 3, floors: 1 };
    await post({ guestFingerprint: 'fp-1', displayName: 'Zigzag' });
    expect(db.updates[0]).toMatchObject({ display_name: 'Zigzag' });
  });

  it('Given a guest row that improves without a chosen name, Then the stored name is left alone', async () => {
    db.existing = { id: 'r1', best_height_m: 3, floors: 1 };
    await post({ guestFingerprint: 'fp-1' });
    expect(db.updates[0]).not.toHaveProperty('display_name');
  });
});
