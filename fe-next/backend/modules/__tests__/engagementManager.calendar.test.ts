/**
 * The Socket.IO calendar path shares the HTTP route's claim: one payout per
 * player per calendar day, box contents rolled on the server, and reading the
 * calendar never writes (a status read can't reopen a claimed day).
 */
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { fakeDb } from '../../../lib/engagement/__tests__/fakeCalendarDb';

const state = vi.hoisted(() => ({ db: null as unknown as { client: unknown } }));
vi.mock('../supabaseServer', () => ({ getSupabase: () => state.db.client }));
vi.mock('../../utils/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() } }));

import { claimCalendarReward, getCalendarStatus } from '../engagementManager';

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 30, 12));
});
afterAll(() => vi.useRealTimers());

describe('calendar over Socket.IO', () => {
  let db: ReturnType<typeof fakeDb>;
  beforeEach(() => {
    db = fakeDb({ engagement: { player_id: 'p1', calendar_month: 11, calendar_year: 2026, calendar_days_claimed: [], streak_freezes_available: 0 } });
    state.db = db;
  });

  it('Given the legendary box on day 30, When claimed twice, Then the second claim pays nothing', async () => {
    const first = await claimCalendarReward('p1');
    expect(first.success).toBe(true);
    expect(first.appliedReward).toMatchObject({ type: 'mystery_box', rarity: 'legendary' });
    const paidOnce = db.rpc.mock.calls.length + (db.tables.player_engagement[0].streak_freezes_available as number);

    const second = await claimCalendarReward('p1');
    expect(second).toMatchObject({ success: false, error: 'Already claimed today' });
    expect(db.rpc.mock.calls.length + (db.tables.player_engagement[0].streak_freezes_available as number)).toBe(paidOnce);
  });

  it('Given last month on the row, When the status is read, Then nothing is written', async () => {
    db.tables.player_engagement[0].calendar_month = 10;
    db.tables.player_engagement[0].calendar_days_claimed = [30];
    const status = await getCalendarStatus('p1');
    expect(status).toMatchObject({ daysClaimed: [], canClaimToday: true, currentDay: 30 });
    expect(db.tables.player_engagement[0]).toMatchObject({ calendar_month: 10, calendar_days_claimed: [30] });
  });
});
