import { beforeEach, describe, expect, it, vi } from 'vitest';

const awardCoins = vi.fn();
const markPlayed = vi.fn();
vi.mock('@/backend/services/economy/awardCoins', () => ({ awardCoinsServer: (...a: unknown[]) => awardCoins(...a) }));
vi.mock('@/lib/holidayEvent/progress.server', () => ({ markHolidayDayPlayed: (...a: unknown[]) => markPlayed(...a) }));
vi.mock('@/utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { pullHolidayCracker, settleHolidayDaily, spinHolidayDreidel } from '../dailyBonus.server';
import { geltCells, GELT_COINS, GIFT_COINS } from '../dailyBoard';
import { fakeSupabase } from './dailyFakeSupabase';

const GRID = [
  ['S', 'N', 'O', 'W'],
  ['A', 'T', 'R', 'E'],
  ['N', 'E', 'E', 'L'],
  ['T', 'A', 'F', 'G'],
];
const KEYS = { holiday_daily_results: [['user_id', 'event_key', 'puzzle_date']] };
const valid = () => true;

function base(extra: Partial<Parameters<typeof settleHolidayDaily>[0]> = {}) {
  const db = fakeSupabase({ keys: KEYS });
  return {
    db,
    input: {
      supabase: db.supabase,
      userId: 'u1',
      holiday: 'hanukkah' as unknown,
      puzzleDate: '2026-12-11',
      language: 'en',
      grid: GRID,
      words: ['SNOW', 'TREE', 'SAT', 'EEL'],
      isCatchup: false,
      isValidWord: valid,
      ...extra,
    },
  };
}

beforeEach(() => {
  awardCoins.mockReset().mockResolvedValue({ success: true });
  markPlayed.mockReset().mockResolvedValue({ status: 'lit', index: 7, reward: {} });
});

describe('settleHolidayDaily', () => {
  it('Given night 8 and words through gelt, When the daily is submitted, Then gelt is paid once and the night is lit by the daily', async () => {
    const { db, input } = base();
    const gelt = geltCells(GRID, '2026-12-11', 'en', 8);
    const r = await settleHolidayDaily(input);
    expect(r?.kind).toBe('nightly');
    expect(r?.day).toBe(8);
    expect(r?.coins).toBe((r?.geltWords ?? 0) * GELT_COINS);
    expect(gelt).toHaveLength(8);
    if (r && r.coins > 0) expect(awardCoins).toHaveBeenCalledWith('u1', r.coins, 'holiday_event', expect.any(Object));
    expect(markPlayed).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1', holiday: 'hanukkah', localDate: '2026-12-11' }));
    expect(db.tables.holiday_daily_results).toHaveLength(1);

    awardCoins.mockClear();
    const again = await settleHolidayDaily(input);
    expect(again).toMatchObject({ alreadySettled: true, coins: r?.coins });
    expect(awardCoins).not.toHaveBeenCalled();
  });

  it('Given words the dictionary rejects, Then they never pay gelt', async () => {
    const { input } = base({ isValidWord: () => false });
    expect((await settleHolidayDaily(input))?.coins).toBe(0);
    expect(awardCoins).not.toHaveBeenCalled();
  });

  it('Given a catch-up run, an unknown holiday or a date outside the window, Then nothing settles', async () => {
    expect(await settleHolidayDaily(base({ isCatchup: true }).input)).toBeNull();
    expect(await settleHolidayDaily(base({ holiday: 'purim' }).input)).toBeNull();
    expect(await settleHolidayDaily(base({ puzzleDate: '2026-11-27' }).input)).toBeNull();
  });

  it('Given the Advent gift among the words, Then the gift unwraps for the big reward', async () => {
    const { input } = base({ holiday: 'christmas', puzzleDate: '2026-12-15', words: ['SNOW', 'TREE', 'NOEL', 'ELF', 'SANTA'] });
    const r = await settleHolidayDaily(input);
    expect(r).toMatchObject({ kind: 'advent', day: 2, giftFound: true, coins: GIFT_COINS });
  });

  it('Given the coin grant fails, Then the settlement row is removed so a retry can pay', async () => {
    awardCoins.mockResolvedValue({ success: false });
    const { db, input } = base({ holiday: 'christmas', puzzleDate: '2026-12-15', words: ['SNOW', 'TREE', 'NOEL', 'ELF', 'SANTA'] });
    await expect(settleHolidayDaily(input)).rejects.toThrow(/grant/);
    expect(db.tables.holiday_daily_results).toHaveLength(0);
  });
});

describe('spinHolidayDreidel', () => {
  it('Given a settled Nightly Board, When the player spins, Then the server rolls once and pays the face', async () => {
    const { db, input } = base();
    await settleHolidayDaily(input);
    awardCoins.mockClear();
    const r = await spinHolidayDreidel({ supabase: db.supabase, userId: 'u1', puzzleDate: '2026-12-11', random: () => 0.3 });
    expect(r).toMatchObject({ status: 'spun', face: 'gimel' });
    const again = await spinHolidayDreidel({ supabase: db.supabase, userId: 'u1', puzzleDate: '2026-12-11', random: () => 0 });
    expect(again).toMatchObject({ status: 'already', face: 'gimel' });
    expect(awardCoins).toHaveBeenCalledTimes(1);
  });

  it('Given the coin grant fails, Then the spin is released so the player can spin again', async () => {
    const { db, input } = base();
    await settleHolidayDaily(input);
    awardCoins.mockResolvedValue({ success: false });
    await expect(spinHolidayDreidel({ supabase: db.supabase, userId: 'u1', puzzleDate: '2026-12-11', random: () => 0.3 })).rejects.toThrow(/dreidel/);
    expect(db.tables.holiday_daily_results[0].spin_face).toBeNull();
    awardCoins.mockResolvedValue({ success: true });
    expect((await spinHolidayDreidel({ supabase: db.supabase, userId: 'u1', puzzleDate: '2026-12-11', random: () => 0.3 })).status).toBe('spun');
  });

  it('Given no Nightly Board today, Then there is nothing to spin', async () => {
    const { db } = base();
    expect(await spinHolidayDreidel({ supabase: db.supabase, userId: 'u1', puzzleDate: '2026-12-11' })).toEqual({ status: 'not_played' });
  });
});

describe('pullHolidayCracker', () => {
  function christmasDb(seed: Record<string, Record<string, unknown>[]>) {
    return fakeSupabase({
      keys: KEYS,
      seed: {
        holiday_daily_results: [
          { user_id: 'u1', event_key: 'christmas-2026', puzzle_date: '2026-12-15', kind: 'advent', coins: 0, cracker_joke: null },
        ],
        ...seed,
      },
    });
  }

  it('Given no table-mate or invited friend finished today, Then the cracker stays locked', async () => {
    const db = christmasDb({});
    expect(await pullHolidayCracker({ supabase: db.supabase, userId: 'u1', puzzleDate: '2026-12-15' })).toEqual({ status: 'locked' });
  });

  it('Given a table-mate finished today, When pulled, Then a joke and coins come out once', async () => {
    const db = christmasDb({
      holiday_table_members: [
        { table_id: 't1', user_id: 'u1', event_key: 'christmas-2026' },
        { table_id: 't1', user_id: 'u2', event_key: 'christmas-2026' },
      ],
      daily_word_hunt_attempts: [{ player_id: 'u2', puzzle_date: '2026-12-15' }],
    });
    const r = await pullHolidayCracker({ supabase: db.supabase, userId: 'u1', puzzleDate: '2026-12-15', random: () => 0 });
    expect(r).toMatchObject({ status: 'pulled', joke: 1 });
    expect(await pullHolidayCracker({ supabase: db.supabase, userId: 'u1', puzzleDate: '2026-12-15' })).toMatchObject({ status: 'already', joke: 1 });
    expect(awardCoins).toHaveBeenCalledTimes(1);
  });

  it('Given an es player who settled an advent board on Jan 4, Then the cracker finds that row', async () => {
    const db = fakeSupabase({
      keys: KEYS,
      seed: {
        holiday_daily_results: [{ user_id: 'u1', event_key: 'christmas-2026', puzzle_date: '2027-01-04', kind: 'advent', coins: 0, cracker_joke: null }],
      },
    });
    expect(await pullHolidayCracker({ supabase: db.supabase, userId: 'u1', puzzleDate: '2027-01-04' })).toEqual({ status: 'locked' });
  });

  it('Given an invited friend finished today, Then the cracker unlocks too', async () => {
    const db = christmasDb({
      holiday_rescues: [{ inviter_id: 'u1', friend_id: 'u3', event_key: 'christmas-2026', day_index: 0 }],
      daily_word_hunt_attempts: [{ player_id: 'u3', puzzle_date: '2026-12-15' }],
    });
    expect((await pullHolidayCracker({ supabase: db.supabase, userId: 'u1', puzzleDate: '2026-12-15' })).status).toBe('pulled');
  });
});
