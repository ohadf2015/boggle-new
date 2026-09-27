// @vitest-environment node
/**
 * /api/streak POST — player_engagement writes must be upserts.
 *
 * A plain `.insert()` raced a concurrent first write (two tabs, or the merge
 * on login landing beside a recordWin) and 500'd with Postgres 23505
 * (duplicate key on player_id). Both create paths now upsert on player_id,
 * and the merge never rewinds an existing row's last_login_date.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const upsert = vi.fn();
const insert = vi.fn();
const update = vi.fn();
let selectResult: { data: unknown; error: unknown } = { data: null, error: null };

vi.mock('@/lib/apiRateLimit', () => ({
  checkApiRateLimit: () => ({ success: true }),
}));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: vi.fn() }));
vi.mock('@/utils/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'user-1' } }, error: null }) },
  }),
}));
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => selectResult }) }),
      upsert: (...args: unknown[]) => {
        upsert(...args);
        return Promise.resolve({ error: null });
      },
      insert: (...args: unknown[]) => {
        insert(...args);
        // What the real table answers to a second first-write.
        return Promise.resolve({ error: { code: '23505', message: 'duplicate key' } });
      },
      update: (...args: unknown[]) => {
        update(...args);
        return { eq: async () => ({ error: null }) };
      },
    }),
  }),
}));

function post(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/streak', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

describe('POST /api/streak', () => {
  beforeEach(() => {
    upsert.mockClear();
    insert.mockClear();
    update.mockClear();
    selectResult = { data: null, error: { code: 'PGRST116', message: 'no rows' } };
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.local';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
  });

  it('recordWin with no engagement row upserts on player_id instead of inserting', async () => {
    // Given a player with no player_engagement row
    const { POST } = await import('../route');
    // When they record their first win
    const res = await POST(post({ action: 'recordWin' }));
    // Then the row is upserted (a racing duplicate cannot 500 with 23505)
    expect(res.status).toBe(200);
    expect(insert).not.toHaveBeenCalled();
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert.mock.calls[0][1]).toEqual({ onConflict: 'player_id' });
    expect(upsert.mock.calls[0][0]).toMatchObject({ player_id: 'user-1', current_streak: 1 });
  });

  it('merge with no engagement row upserts the merged streak', async () => {
    const { POST } = await import('../route');
    const res = await POST(post({ action: 'merge', localData: { currentStreak: 4, bestStreak: 6 } }));
    expect(res.status).toBe(200);
    expect(insert).not.toHaveBeenCalled();
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert.mock.calls[0][1]).toEqual({ onConflict: 'player_id' });
    expect(upsert.mock.calls[0][0]).toMatchObject({ current_streak: 4, longest_streak: 6 });
  });

  it('merge onto an existing row keeps its last_login_date (never rewinds it to the local win date)', async () => {
    // Given a server row that logged in today
    selectResult = {
      data: { current_streak: 2, longest_streak: 9, last_login_date: '2026-09-18', streak_freezes_available: 1 },
      error: null,
    };
    const { POST } = await import('../route');
    // When an older local streak is merged
    const res = await POST(post({
      action: 'merge',
      localData: { currentStreak: 5, bestStreak: 5, lastWinDate: '2026-09-01T10:00:00Z' },
    }));
    // Then the max of each counter wins, and the server's date is kept
    expect(res.status).toBe(200);
    expect(upsert.mock.calls[0][0]).toMatchObject({
      current_streak: 5,
      longest_streak: 9,
      last_login_date: '2026-09-18',
    });
  });

  it('merge surfaces a real select error as 500 instead of overwriting the row', async () => {
    selectResult = { data: null, error: { code: '57014', message: 'timeout' } };
    const { POST } = await import('../route');
    const res = await POST(post({ action: 'merge', localData: { currentStreak: 1 } }));
    expect(res.status).toBe(500);
    expect(upsert).not.toHaveBeenCalled();
  });
});
