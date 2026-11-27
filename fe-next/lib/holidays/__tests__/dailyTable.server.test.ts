import { describe, expect, it } from 'vitest';
import { createHolidayTable, joinHolidayTable, leaveHolidayTable, readHolidayTable } from '../dailyTable.server';
import { TABLE_MAX_MEMBERS } from '../dailyTable';
import { fakeSupabase } from './dailyFakeSupabase';

const KEYS = {
  holiday_tables: [['code'], ['id']],
  holiday_table_members: [['table_id', 'user_id'], ['user_id', 'event_key']],
};
const DATE = '2026-12-06';

function db(seed: Record<string, Record<string, unknown>[]> = {}) {
  return fakeSupabase({ keys: KEYS, seed });
}

describe('createHolidayTable', () => {
  it('Given a signed-in player in the window, When they create a table, Then they own it and sit at it', async () => {
    const f = db();
    const r = await createHolidayTable({ supabase: f.supabase, userId: 'u1', holiday: 'hanukkah', localDate: DATE });
    expect(r.status).toBe('ok');
    expect(f.tables.holiday_tables).toHaveLength(1);
    expect(f.tables.holiday_table_members).toEqual([expect.objectContaining({ user_id: 'u1', event_key: 'hanukkah-2026' })]);
  });

  it('Given the player already sits at a table, Then creating returns that table instead of a second one', async () => {
    const f = db();
    const a = await createHolidayTable({ supabase: f.supabase, userId: 'u1', holiday: 'hanukkah', localDate: DATE });
    const b = await createHolidayTable({ supabase: f.supabase, userId: 'u1', holiday: 'hanukkah', localDate: DATE });
    expect(b).toEqual(a);
    expect(f.tables.holiday_tables).toHaveLength(1);
  });

  it('Given a date outside the holiday, Then no table is made', async () => {
    const f = db();
    expect(await createHolidayTable({ supabase: f.supabase, userId: 'u1', holiday: 'hanukkah', localDate: '2026-11-27' })).toEqual({ status: 'closed' });
  });
});

describe('joinHolidayTable', () => {
  const table = { id: 't1', holiday_key: 'hanukkah', event_key: 'hanukkah-2026', owner: 'u1', code: 'ABCDEFGH' };

  it('Given a valid code, When a friend joins, Then they sit at the table', async () => {
    const f = db({ holiday_tables: [table], holiday_table_members: [{ table_id: 't1', user_id: 'u1', event_key: 'hanukkah-2026' }] });
    const r = await joinHolidayTable({ supabase: f.supabase, userId: 'u2', code: 'ABCDEFGH', localDate: DATE });
    expect(r).toMatchObject({ status: 'ok', code: 'ABCDEFGH', holiday: 'hanukkah' });
    expect(f.tables.holiday_table_members).toHaveLength(2);
  });

  it('Given a full table, Then a ninth player is turned away', async () => {
    const members = Array.from({ length: TABLE_MAX_MEMBERS }, (_, i) => ({ table_id: 't1', user_id: `m${i}`, event_key: 'hanukkah-2026' }));
    const f = db({ holiday_tables: [table], holiday_table_members: members });
    expect(await joinHolidayTable({ supabase: f.supabase, userId: 'u9', code: 'ABCDEFGH', localDate: DATE })).toEqual({ status: 'full' });
  });

  it('Given an unknown code or an ended holiday, Then joining fails cleanly', async () => {
    const f = db({ holiday_tables: [table] });
    expect(await joinHolidayTable({ supabase: f.supabase, userId: 'u2', code: 'ZZZZZZZZ', localDate: DATE })).toEqual({ status: 'not_found' });
    expect(await joinHolidayTable({ supabase: f.supabase, userId: 'u2', code: 'bad', localDate: DATE })).toEqual({ status: 'not_found' });
    expect(await joinHolidayTable({ supabase: f.supabase, userId: 'u2', code: 'ABCDEFGH', localDate: '2026-12-20' })).toEqual({ status: 'closed' });
  });

  it('Given the friend already sits at another table, Then they must leave it first', async () => {
    const f = db({
      holiday_tables: [table, { ...table, id: 't2', code: 'HJKLMNPQ', owner: 'u5' }],
      holiday_table_members: [{ table_id: 't2', user_id: 'u2', event_key: 'hanukkah-2026' }],
    });
    expect(await joinHolidayTable({ supabase: f.supabase, userId: 'u2', code: 'ABCDEFGH', localDate: DATE })).toEqual({ status: 'in_other_table' });
    await leaveHolidayTable({ supabase: f.supabase, userId: 'u2', holiday: 'hanukkah', localDate: DATE });
    expect((await joinHolidayTable({ supabase: f.supabase, userId: 'u2', code: 'ABCDEFGH', localDate: DATE })).status).toBe('ok');
  });
});

describe('readHolidayTable', () => {
  it('Given members who played, Then the board sums daily scores and hides placeholder names', async () => {
    const f = db({
      holiday_tables: [{ id: 't1', holiday_key: 'hanukkah', event_key: 'hanukkah-2026', owner: 'u1', code: 'ABCDEFGH' }],
      holiday_table_members: [
        { table_id: 't1', user_id: 'u1', event_key: 'hanukkah-2026' },
        { table_id: 't1', user_id: 'u2', event_key: 'hanukkah-2026' },
      ],
      profiles: [
        { id: 'u1', display_name: 'Noa', username: null, avatar_emoji: '🦊' },
        { id: 'u2', display_name: 'Player_ab12cd', username: null, avatar_emoji: null },
      ],
      daily_word_hunt_attempts: [
        { player_id: 'u1', puzzle_date: '2026-12-05', efficiency_score: 500 },
        { player_id: 'u2', puzzle_date: '2026-12-05', efficiency_score: 400 },
        { player_id: 'u2', puzzle_date: '2026-12-06', efficiency_score: 100 },
      ],
    });
    const r = await readHolidayTable({ supabase: f.supabase, userId: 'u1', holiday: 'hanukkah', localDate: DATE });
    expect(r?.code).toBe('ABCDEFGH');
    expect(r?.isOwner).toBe(true);
    expect(r?.board.nights[1]).toMatchObject({ date: '2026-12-05', total: 900, lit: true });
    expect(r?.members).toEqual([
      { userId: 'u1', name: 'Noa', avatarEmoji: '🦊', total: 500, rank: 1, playedToday: false, isYou: true },
      { userId: 'u2', name: null, avatarEmoji: null, total: 500, rank: 2, playedToday: true, isYou: false },
    ]);
  });

  it('Given no table, Then there is nothing to read', async () => {
    expect(await readHolidayTable({ supabase: db().supabase, userId: 'u1', holiday: 'hanukkah', localDate: DATE })).toBeNull();
  });
});

describe('locale-extended christmas', () => {
  it('Given an es player on Jan 4 and a ru player on Jan 7, Then the table is open; an en player on Jan 4 finds it closed', async () => {
    const f = db();
    expect((await createHolidayTable({ supabase: f.supabase, userId: 'es1', holiday: 'christmas', localDate: '2027-01-04', locale: 'es' })).status).toBe('ok');
    expect((await createHolidayTable({ supabase: f.supabase, userId: 'ru1', holiday: 'christmas', localDate: '2027-01-07', locale: 'ru' })).status).toBe('ok');
    expect(await readHolidayTable({ supabase: f.supabase, userId: 'ru1', holiday: 'christmas', localDate: '2027-01-07', locale: 'ru' })).not.toBeNull();
    expect(await createHolidayTable({ supabase: f.supabase, userId: 'en1', holiday: 'christmas', localDate: '2027-01-04', locale: 'en' })).toEqual({ status: 'closed' });
  });
});
