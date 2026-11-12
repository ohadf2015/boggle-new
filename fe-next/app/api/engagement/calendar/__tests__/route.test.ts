/**
 * The app's calendar claim (HTTP). A mystery box pays the server-rolled
 * contents; a replayed POST, or one that claims a bigger prize in its body,
 * pays nothing more.
 */
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { fakeDb } from '@/lib/engagement/__tests__/fakeCalendarDb';
import { rollCalendarMysteryBox } from '@/lib/engagement/calendarRewards';

const state = vi.hoisted(() => ({ db: null as unknown as ReturnType<typeof import('@/lib/engagement/__tests__/fakeCalendarDb').fakeDb> }));
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    ...(state.db.client as object),
    auth: { getUser: async () => ({ data: { user: { id: 'p1' } }, error: null }) },
  }),
}));
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: async () => ({ id: 'p1' }) }));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));

import { GET, POST } from '../route';

const post = (body?: unknown) => new NextRequest('http://localhost/api/engagement/calendar', {
  method: 'POST',
  headers: { authorization: 'Bearer t', 'content-type': 'application/json' },
  body: body ? JSON.stringify(body) : undefined,
});

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 21, 12));
});
afterAll(() => vi.useRealTimers());

describe('POST /api/engagement/calendar (day 21, epic box)', () => {
  beforeEach(() => {
    state.db = fakeDb({ engagement: { player_id: 'p1', calendar_month: 11, calendar_year: 2026, calendar_days_claimed: [], streak_freezes_available: 0 } });
  });

  it('Given a forged body, When claimed twice, Then it pays the server roll once and refuses the replay', async () => {
    const box = rollCalendarMysteryBox('p1', '2026-11-21', 'epic');
    const first = await POST(post({ contents: { type: 'xp', amount: 999999 } }));
    expect(first.status).toBe(200);
    expect((await first.json()).appliedReward).toEqual({ type: 'mystery_box', rarity: 'epic', contents: box });

    const replay = await POST(post());
    expect(replay.status).toBe(400);

    const xpPaid = state.db.rpc.mock.calls.length;
    const freezes = state.db.tables.player_engagement[0].streak_freezes_available;
    if (box.type === 'xp') {
      expect(state.db.rpc).toHaveBeenCalledWith('increment_player_xp', { p_player_id: 'p1', p_xp_amount: 300 });
      expect(xpPaid).toBe(1);
    } else {
      expect(freezes).toBe(3);
      expect(xpPaid).toBe(0);
    }
  });

  it('GET lists the shared reward table (boxes on 7, 14, 21, 30)', async () => {
    const body = await (await GET(new NextRequest('http://localhost/api/engagement/calendar'))).json();
    expect(body.rewards.filter((r: { type: string }) => r.type === 'mystery_box').map((r: { day: number }) => r.day)).toEqual([7, 14, 21, 30]);
    expect(body.canClaimToday).toBe(true);
  });
});

describe('POST /api/engagement/calendar (day 4, XP)', () => {
  afterAll(() => vi.setSystemTime(new Date(2026, 10, 21, 12)));

  it('Given the day\'s XP crosses a level, When claimed, Then the response carries levelUp', async () => {
    vi.setSystemTime(new Date(2026, 10, 4, 12));
    state.db = fakeDb({ engagement: { player_id: 'p1', calendar_month: 11, calendar_year: 2026, calendar_days_claimed: [], streak_freezes_available: 0 } });
    state.db.rpc.mockResolvedValue({ data: [{ xp_granted: 100, new_total_xp: 300, new_level: 2 }], error: null } as never);
    const res = await POST(post());
    expect(res.status).toBe(200);
    expect((await res.json()).levelUp).toEqual({ oldLevel: 1, newLevel: 2 });
  });
});
