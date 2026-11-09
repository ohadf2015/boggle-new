/**
 * Calendar claims pay once per player per calendar day, and a mystery box pays
 * exactly the contents the server rolled: never twice, never more, whatever
 * the client sends or however often it retries.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rollCalendarMysteryBox } from '../calendarRewards';
import { claimCalendarDay } from '../claimCalendarReward.server';

import { fakeDb } from './fakeCalendarDb';

const NOV_7 = new Date(2026, 10, 7, 12);
const NOV_14 = new Date(2026, 10, 14, 12);

describe('claimCalendarDay', () => {
  beforeEach(() => vi.clearAllMocks());

  it('Given day 7, When claimed, Then the server-rolled box contents are credited exactly once', async () => {
    const db = fakeDb({ engagement: { player_id: 'p1', calendar_month: 11, calendar_year: 2026, calendar_days_claimed: [], streak_freezes_available: 0 } });
    const box = rollCalendarMysteryBox('p1', '2026-11-07', 'common');

    const first = await claimCalendarDay(db.client, 'p1', NOV_7);
    expect(first.status).toBe('claimed');
    expect(first.appliedReward).toEqual({ type: 'mystery_box', rarity: 'common', contents: box });

    const second = await claimCalendarDay(db.client, 'p1', NOV_7);
    expect(second.status).toBe('already');
    expect(second.appliedReward).toEqual({ type: 'mystery_box', rarity: 'common', contents: box });

    const freezes = db.tables.player_engagement[0].streak_freezes_available as number;
    const xpCalls = db.rpc.mock.calls.filter((c) => (c as unknown[])[0] === 'increment_player_xp');
    if (box.type === 'xp') {
      expect(xpCalls).toEqual([['increment_player_xp', { p_player_id: 'p1', p_xp_amount: box.amount }]]);
      expect(freezes).toBe(0);
    } else {
      expect(freezes).toBe(box.amount);
      expect(xpCalls).toHaveLength(0);
    }
    expect(db.tables.player_engagement[0].calendar_days_claimed).toEqual([7]);
  });

  it('Given both box types across players, Then XP goes to increment_player_xp and freezes to the freeze inventory', async () => {
    let sawXp = false;
    let sawFreeze = false;
    for (let i = 0; i < 40 && !(sawXp && sawFreeze); i++) {
      const id = `player-${i}`;
      const db = fakeDb({ engagement: { player_id: id, calendar_month: 11, calendar_year: 2026, calendar_days_claimed: [], streak_freezes_available: 1 } });
      const box = rollCalendarMysteryBox(id, '2026-11-14', 'rare');
      await claimCalendarDay(db.client, id, NOV_14);
      if (box.type === 'xp') {
        sawXp = true;
        expect(db.rpc).toHaveBeenCalledWith('increment_player_xp', { p_player_id: id, p_xp_amount: 200 });
      } else {
        sawFreeze = true;
        expect(db.tables.player_engagement[0].streak_freezes_available).toBe(1 + 2);
      }
    }
    expect(sawXp && sawFreeze).toBe(true);
  });

  it('Given two claims racing past the read, Then only the one that marks the day pays', async () => {
    const db = fakeDb({ engagement: { player_id: 'p1', calendar_month: 11, calendar_year: 2026, calendar_days_claimed: [], streak_freezes_available: 0 } });
    const [a, b] = await Promise.all([claimCalendarDay(db.client, 'p1', NOV_7), claimCalendarDay(db.client, 'p1', NOV_7)]);
    expect([a.status, b.status].sort()).toEqual(['already', 'claimed']);
    const paid = db.rpc.mock.calls.length + (db.tables.player_engagement[0].streak_freezes_available as number);
    const box = rollCalendarMysteryBox('p1', '2026-11-07', 'common');
    expect(paid).toBe(box.type === 'xp' ? 1 : box.amount);
  });

  it('Given last month on the row, When claiming, Then the calendar resets and today pays', async () => {
    const db = fakeDb({ engagement: { player_id: 'p1', calendar_month: 10, calendar_year: 2026, calendar_days_claimed: [7], streak_freezes_available: 0 } });
    const res = await claimCalendarDay(db.client, 'p1', NOV_7);
    expect(res.status).toBe('claimed');
    expect(db.tables.player_engagement[0]).toMatchObject({ calendar_month: 11, calendar_days_claimed: [7] });
  });

  it('Given no engagement row yet, When claiming a plain XP day, Then the row is created and the XP paid once', async () => {
    const db = fakeDb({ engagement: null });
    const res = await claimCalendarDay(db.client, 'p1', new Date(2026, 10, 1, 12));
    expect(res.status).toBe('claimed');
    expect(db.rpc).toHaveBeenCalledWith('increment_player_xp', { p_player_id: 'p1', p_xp_amount: 50 });
    expect((await claimCalendarDay(db.client, 'p1', new Date(2026, 10, 1, 12))).status).toBe('already');
    expect(db.rpc).toHaveBeenCalledTimes(1);
  });

  it('Given the XP grant fails, Then the day is reopened so a retry can pay (nothing is lost, nothing paid twice)', async () => {
    const db = fakeDb({ engagement: { player_id: 'p1', calendar_month: 11, calendar_year: 2026, calendar_days_claimed: [], streak_freezes_available: 0 } });
    db.rpc.mockResolvedValueOnce({ data: null, error: { message: 'boom' } } as never);
    await expect(claimCalendarDay(db.client, 'p1', new Date(2026, 10, 1, 12))).rejects.toThrow();
    expect(db.tables.player_engagement[0].calendar_days_claimed).toEqual([]);
    expect((await claimCalendarDay(db.client, 'p1', new Date(2026, 10, 1, 12))).status).toBe('claimed');
  });
});
