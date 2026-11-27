import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

const awardCoins = vi.fn();
const grantPart = vi.fn();
vi.mock('@/backend/services/economy/awardCoins', () => ({ awardCoinsServer: (...a: unknown[]) => awardCoins(...a) }));
vi.mock('@/lib/avatar/grantChestPart.server', () => ({ grantPremiumPart: (...a: unknown[]) => grantPart(...a) }));
vi.mock('@/utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { isPlausibleLocalDate, markHolidayDayPlayed, readHolidayProgress } from '../progress.server';
import { windowFor } from '@/lib/holidays/calendar';

type Row = { user_id: string; event_key: string; day_index: number; played_on: string; claimed_reward: unknown };

function fakeDb(opts: { insertError?: { code?: string; message: string } } = {}) {
  const rows: Row[] = [];
  const client = {
    from: (table: string) => {
      expect(table).toBe('holiday_event_progress');
      const filters: [string, unknown][] = [];
      const match = (r: Row) => filters.every(([k, v]) => (r as Record<string, unknown>)[k] === v);
      const q = {
        select: () => q,
        eq: (k: string, v: unknown) => { filters.push([k, v]); return q; },
        then: (res: (v: { data: Row[]; error: null }) => unknown) => res({ data: rows.filter(match), error: null }),
        insert: async (row: Row) => {
          if (opts.insertError) return { error: opts.insertError };
          if (rows.some((r) => r.user_id === row.user_id && r.event_key === row.event_key && r.day_index === row.day_index)) {
            return { error: { code: '23505', message: 'duplicate' } };
          }
          rows.push(row);
          return { error: null };
        },
        delete: () => {
          const d = {
            eq: (k: string, v: unknown) => { filters.push([k, v]); return d; },
            then: (res: (v: { error: null }) => unknown) => {
              for (let i = rows.length - 1; i >= 0; i--) if (match(rows[i])) rows.splice(i, 1);
              return res({ error: null });
            },
          };
          return d;
        },
      };
      return q;
    },
  };
  return { rows, supabase: client as unknown as SupabaseClient };
}

const NOW = new Date('2026-12-05T10:00:00Z');

describe('markHolidayDayPlayed', () => {
  beforeEach(() => {
    awardCoins.mockReset().mockResolvedValue({ success: true });
    grantPart.mockReset().mockResolvedValue(true);
  });

  it('Given night 2 of Hanukkah, when the player finishes a game, then the night lights and the blue beanie is granted', async () => {
    const { rows, supabase } = fakeDb();
    const r = await markHolidayDayPlayed({ supabase, userId: 'u1', holiday: 'hanukkah', localDate: '2026-12-05' });
    expect(r).toMatchObject({ status: 'lit', index: 1, reward: { partKey: 'accessory:beanieBlue' } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ event_key: 'hanukkah-2026', day_index: 1, played_on: '2026-12-05' });
    expect(grantPart).toHaveBeenCalledWith(supabase, 'u1', 'accessory:beanieBlue');
    expect(awardCoins).not.toHaveBeenCalled();
  });

  it('Given a coin night, then coins are paid with the holiday reason', async () => {
    const { supabase } = fakeDb();
    const r = await markHolidayDayPlayed({ supabase, userId: 'u1', holiday: 'hanukkah', localDate: '2026-12-04' });
    expect(r.status).toBe('lit');
    expect(awardCoins).toHaveBeenCalledWith('u1', 50, 'holiday_event', { event: 'hanukkah-2026', day: 0 });
  });

  it('Given the day was already lit, when another game finishes, then nothing is granted twice', async () => {
    const { supabase } = fakeDb();
    await markHolidayDayPlayed({ supabase, userId: 'u1', holiday: 'hanukkah', localDate: '2026-12-05' });
    const again = await markHolidayDayPlayed({ supabase, userId: 'u1', holiday: 'hanukkah', localDate: '2026-12-05' });
    expect(again.status).toBe('already');
    expect(grantPart).toHaveBeenCalledTimes(1);
  });

  it('Given the grant fails, then the day row is removed so the next game can retry', async () => {
    grantPart.mockResolvedValue(false);
    const { rows, supabase } = fakeDb();
    await expect(markHolidayDayPlayed({ supabase, userId: 'u1', holiday: 'hanukkah', localDate: '2026-12-05' })).rejects.toThrow();
    expect(rows).toHaveLength(0);
  });

  it('Given a date outside the window or a non-track window day, then it is a no-op', async () => {
    const { rows, supabase } = fakeDb();
    expect((await markHolidayDayPlayed({ supabase, userId: 'u1', holiday: 'hanukkah', localDate: '2026-11-30' })).status).toBe('outside_window');
    expect((await markHolidayDayPlayed({ supabase, userId: 'u1', holiday: 'christmas', localDate: '2026-12-13' })).status).toBe('not_track_day');
    expect(rows).toHaveLength(0);
  });

  it('Given an insert error other than a duplicate, then it throws instead of pretending success', async () => {
    const { supabase } = fakeDb({ insertError: { code: '42P01', message: 'relation missing' } });
    await expect(markHolidayDayPlayed({ supabase, userId: 'u1', holiday: 'hanukkah', localDate: '2026-12-05' })).rejects.toThrow(/relation missing/);
  });
});

describe('readHolidayProgress', () => {
  it('Given lit rows, then the view lights exactly those days, in track order with dates and rewards', async () => {
    const { supabase } = fakeDb();
    await markHolidayDayPlayed({ supabase, userId: 'u1', holiday: 'hanukkah', localDate: '2026-12-05' });
    const view = await readHolidayProgress(supabase, 'u1', windowFor('hanukkah', '2026-12-05')!);
    expect(view.days).toHaveLength(8);
    expect(view.days.filter((d) => d.lit).map((d) => d.index)).toEqual([1]);
    expect(view.days[0]).toMatchObject({ index: 0, date: '2026-12-04', lit: false, reward: { coins: 50 } });
    expect(view.days[1].source).toBe('game');
  });

  it('Given a day lit by the Holiday Daily and one relit by a friend, then each day says how it was lit', async () => {
    const { supabase, rows } = fakeDb();
    rows.push(
      { user_id: 'u1', event_key: 'hanukkah-2026', day_index: 0, played_on: '2026-12-04', claimed_reward: {}, source: 'daily' } as Row,
      { user_id: 'u1', event_key: 'hanukkah-2026', day_index: 2, played_on: '2026-12-07', claimed_reward: {}, source: 'friend' } as Row,
    );
    const view = await readHolidayProgress(supabase, 'u1', windowFor('hanukkah', '2026-12-05')!);
    expect(view.days[0].source).toBe('daily');
    expect(view.days[2].source).toBe('friend');
    expect(view.days[1].source).toBeUndefined();
  });
});

describe('isPlausibleLocalDate', () => {
  it('accepts the server UTC date and one day either side, nothing else', () => {
    expect(isPlausibleLocalDate('2026-12-05', NOW)).toBe(true);
    expect(isPlausibleLocalDate('2026-12-04', NOW)).toBe(true);
    expect(isPlausibleLocalDate('2026-12-06', NOW)).toBe(true);
    expect(isPlausibleLocalDate('2026-12-07', NOW)).toBe(false);
    expect(isPlausibleLocalDate('2026-12-03', NOW)).toBe(false);
    expect(isPlausibleLocalDate('2026-13-05', NOW)).toBe(false);
    expect(isPlausibleLocalDate('yesterday', NOW)).toBe(false);
  });
});
