import { describe, it, expect, vi, beforeEach } from 'vitest';

const awardCoins = vi.fn();
const grantPart = vi.fn();
vi.mock('@/backend/services/economy/awardCoins', () => ({ awardCoinsServer: (...a: unknown[]) => awardCoins(...a) }));
vi.mock('@/lib/avatar/grantChestPart.server', () => ({ grantPremiumPart: (...a: unknown[]) => grantPart(...a) }));
const readTable = vi.fn();
vi.mock('@/lib/holidays/dailyTable.server', () => ({ readHolidayTable: (...a: unknown[]) => readTable(...a) }));
vi.mock('@/utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { fakeDb } from './fakeDb';
import { parseHolidayInput } from '../holidayRequest.server';
import { openGift, readGift } from '../gift.server';
import { readHunt, recordHuntFind } from '../hunt.server';
import { pickRoscon, readEggs, recordEgg } from '../eggs.server';
import { noteHolidayGame } from '../holidayGame.server';
import { readWrapped } from '../wrapped.server';
import { huntSlotFor, HUNT_SLOTS } from '../hunt';

const input = (holiday: string, localDate: string, locale: string | null = 'en') => {
  const i = parseHolidayInput({ holiday, localDate, locale }, new Date(`${localDate}T12:00:00Z`));
  if (!i) throw new Error('bad input');
  return i;
};
const lit = (eventKey: string, idx: number[]) => idx.map((day_index) => ({ user_id: 'u1', event_key: eventKey, day_index, played_on: '2026-12-01', claimed_reward: {} }));

beforeEach(() => {
  readTable.mockReset().mockResolvedValue(null);
  awardCoins.mockReset().mockResolvedValue({ success: true });
  grantPart.mockReset().mockResolvedValue(true);
});

describe('parseHolidayInput', () => {
  it('Given a Spanish player on Jan 4, then the locale-extended Christmas window is used', () => {
    expect(input('christmas', '2027-01-04', 'es').eventKey).toBe('christmas-2026');
    expect(parseHolidayInput({ holiday: 'christmas', localDate: '2027-01-04', locale: 'en' }, new Date('2027-01-04T12:00:00Z'))).toBeNull();
  });

  it('Given junk, then null', () => {
    expect(parseHolidayInput({ holiday: 'easter', localDate: '2026-12-05', locale: 'en' })).toBeNull();
    expect(parseHolidayInput({ holiday: 'hanukkah', localDate: '2026-12-05', locale: 'xx' }, new Date('2026-12-05T12:00:00Z'))?.locale).toBe('en');
  });
});

describe('Mystery Gift', () => {
  it('Given 5 lit nights before the finale, then the box is tier 5 and locked', async () => {
    const db = fakeDb({ holiday_event_progress: lit('hanukkah-2026', [0, 1, 2, 3, 4]) });
    const state = await readGift(db.client, 'u1', input('hanukkah', '2026-12-09'));
    expect(state).toMatchObject({ lit: 5, tier: 5, openable: false, opened: null, gamesToday: 0, comebackUsed: false });
    expect(await openGift(db.client, 'u1', input('hanukkah', '2026-12-09'))).toEqual({ status: 'locked' });
    expect(awardCoins).not.toHaveBeenCalled();
  });

  it('Given a full run on night 8, then it opens once with coins and the golden part', async () => {
    const db = fakeDb({ holiday_event_progress: lit('hanukkah-2026', [0, 1, 2, 3, 4, 5, 6, 7]) });
    const first = await openGift(db.client, 'u1', input('hanukkah', '2026-12-11'));
    expect(first).toEqual({ status: 'opened', reward: { coins: 520, partKey: 'accessory:goldGeltMedal' } });
    expect(grantPart).toHaveBeenCalledWith(db.client, 'u1', 'accessory:goldGeltMedal');
    const again = await openGift(db.client, 'u1', input('hanukkah', '2026-12-11'));
    expect(again).toEqual({ status: 'already', reward: { coins: 520, partKey: 'accessory:goldGeltMedal' } });
    expect(awardCoins).toHaveBeenCalledTimes(1);
  });

  it('Given every earlier night lit and the gift opened on night 8 before playing, then night 8 still counts toward the full run', async () => {
    const db = fakeDb({ holiday_event_progress: lit('hanukkah-2026', [0, 1, 2, 3, 4, 5, 6]) });
    const res = await openGift(db.client, 'u1', input('hanukkah', '2026-12-11'));
    expect(res).toEqual({ status: 'opened', reward: { coins: 520, partKey: 'accessory:goldGeltMedal' } });
  });

  it('Given the coin grant fails, then the claim is undone and it throws (retry can open again)', async () => {
    awardCoins.mockResolvedValue({ success: false });
    const db = fakeDb({ holiday_event_progress: lit('hanukkah-2026', [0]) });
    await expect(openGift(db.client, 'u1', input('hanukkah', '2026-12-11'))).rejects.toThrow();
    expect(db.tables.holiday_event_claims).toHaveLength(0);
  });
});

describe('Hide & Seek', () => {
  it('Given the wrong screen, then nothing is recorded', async () => {
    const db = fakeDb();
    const right = huntSlotFor('u1', '2026-12-16');
    const wrong = HUNT_SLOTS.find((s) => s !== right)!;
    expect(await recordHuntFind(db.client, 'u1', input('christmas', '2026-12-16'), wrong)).toEqual({ status: 'wrong_slot' });
    expect(db.tables.holiday_hunt_finds).toHaveLength(0);
  });

  it('Given the 8th Hanukkah find, then Seeker and the golden dreidel are granted once', async () => {
    const prior = ['2026-12-04', '2026-12-05', '2026-12-06', '2026-12-07', '2026-12-08', '2026-12-09', '2026-12-10']
      .map((find_date) => ({ user_id: 'u1', event_key: 'hanukkah-2026', find_date, slot: 'profile' }));
    const db = fakeDb({ holiday_hunt_finds: prior });
    const i = input('hanukkah', '2026-12-11');
    const res = await recordHuntFind(db.client, 'u1', i, huntSlotFor('u1', '2026-12-11'));
    expect(res).toMatchObject({ status: 'found', count: 8, seeker: true });
    expect(grantPart).toHaveBeenCalledWith(db.client, 'u1', 'accessory:goldDreidelPin');
    const again = await recordHuntFind(db.client, 'u1', i, huntSlotFor('u1', '2026-12-11'));
    expect(again).toMatchObject({ status: 'already', count: 8, seeker: true });
    expect(grantPart).toHaveBeenCalledTimes(1);
    expect(await readHunt(db.client, 'u1', i)).toMatchObject({ foundToday: true, count: 8, goal: 8, seeker: true, slot: huntSlotFor('u1', '2026-12-11') });
  });
});

describe('Eggs', () => {
  it('Given a secret found twice, then it is stored once', async () => {
    const db = fakeDb();
    const i = input('christmas', '2026-12-16');
    expect(await recordEgg(db.client, 'u1', i, 'word_santa')).toMatchObject({ status: 'found' });
    expect(await recordEgg(db.client, 'u1', i, 'word_santa')).toMatchObject({ status: 'already' });
    expect(await readEggs(db.client, 'u1', i)).toEqual(['word_santa']);
  });

  it('Given the roscón on Jan 6, then one pick per player, figurine pays coins, haba gives the badge', async () => {
    const db = fakeDb();
    const i = input('christmas', '2027-01-06', 'es');
    const outcomes = new Set<string>();
    for (let pick = 0; pick < 8; pick++) {
      const d = fakeDb();
      outcomes.add((await pickRoscon(d.client, 'u1', i, pick)).outcome as string);
    }
    expect(outcomes).toEqual(new Set(['haba', 'figurine', 'none']));
    const first = await pickRoscon(db.client, 'u1', i, 0);
    expect(first.status).toBe('picked');
    expect((await pickRoscon(db.client, 'u1', i, 1)).status).toBe('already');
    expect(await pickRoscon(db.client, 'u1', input('christmas', '2027-01-05', 'es'), 0)).toEqual({ status: 'closed' });
  });
});

describe('Comeback', () => {
  it('Given the third game today with a missed night, then that night is relit once per event', async () => {
    const db = fakeDb({ holiday_event_progress: lit('hanukkah-2026', [0, 1, 3]) });
    const i = input('hanukkah', '2026-12-09');
    const t0 = new Date('2026-12-09T10:00:00Z').getTime();
    await noteHolidayGame(db.client, 'u1', i, 10, new Date(t0));
    await noteHolidayGame(db.client, 'u1', i, 10, new Date(t0 + 60_000));
    const third = await noteHolidayGame(db.client, 'u1', i, 10, new Date(t0 + 120_000));
    expect(third).toMatchObject({ games: 3, comeback: { index: 4 } });
    expect(db.tables.holiday_event_progress.map((r) => r.day_index)).toContain(4);
    const fourth = await noteHolidayGame(db.client, 'u1', i, 10, new Date(t0 + 180_000));
    expect(fourth.comeback).toBeUndefined();
    expect(await readGift(db.client, 'u1', i)).toMatchObject({ gamesToday: 4, comebackUsed: true, lit: 4 });
    expect(db.tables.holiday_event_progress).toHaveLength(4);
  });

  it('Given games seconds apart, then only one counts', async () => {
    const db = fakeDb();
    const i = input('hanukkah', '2026-12-09');
    const t0 = new Date('2026-12-09T10:00:00Z').getTime();
    await noteHolidayGame(db.client, 'u1', i, 5, new Date(t0));
    expect((await noteHolidayGame(db.client, 'u1', i, 5, new Date(t0 + 3_000))).games).toBe(1);
  });

  it('Given a Japanese player on Dec 31, then the game is filed on a Kōhaku team', async () => {
    const db = fakeDb();
    await noteHolidayGame(db.client, 'u1', input('christmas', '2026-12-31', 'ja'), 12, new Date('2026-12-31T05:00:00Z'));
    expect(['red', 'white']).toContain(db.tables.holiday_day_games[0].team);
    expect(db.tables.holiday_day_games[0].words).toBe(12);
  });
});

describe('Holiday Wrapped', () => {
  it('Given an event played through, then the recap sums days, words, finds, secrets and titles', async () => {
    const db = fakeDb({
      holiday_event_progress: [
        ...lit('hanukkah-2026', [0, 1, 2]),
        { user_id: 'u1', event_key: 'hanukkah-2026', day_index: 7, played_on: '2026-12-11', claimed_reward: { title: 'keeperOfTheLight' } },
      ],
      holiday_day_games: [
        { user_id: 'u1', event_key: 'hanukkah-2026', played_on: '2026-12-04', games: 2, words: 30 },
        { user_id: 'u1', event_key: 'hanukkah-2026', played_on: '2026-12-05', games: 1, words: 12 },
      ],
      holiday_hunt_finds: [{ user_id: 'u1', event_key: 'hanukkah-2026', find_date: '2026-12-05', slot: 'profile' }],
      holiday_egg_finds: [{ user_id: 'u1', event_key: 'hanukkah-2026', egg_id: 'word_latke' }],
      holiday_event_claims: [{ user_id: 'u1', event_key: 'hanukkah-2026', kind: 'seeker', detail: { title: 'seeker' } }],
      game_results: [
        { id: 'g1', player_id: 'u1', longest_word: 'candles', created_at: '2026-12-05T10:00:00Z' },
        { id: 'g2', player_id: 'u1', longest_word: 'miraculous', created_at: '2026-11-01T10:00:00Z' },
      ],
    });
    const w = await readWrapped(db.client, 'u1', input('hanukkah', '2026-12-11'));
    expect(w).toEqual({
      holiday: 'hanukkah', lit: 4, total: 8, games: 3, words: 42, longest: 'candles',
      huntFound: 1, huntGoal: 8, secrets: 1, titles: ['keeperOfTheLight', 'seeker'], tableRank: null, tableSize: 0,
    });
  });

  it('Given the player sits at a Holiday Table, then the recap carries their rank; a failed table read leaves it out', async () => {
    readTable.mockResolvedValue({ members: [{ isYou: false, rank: 1 }, { isYou: true, rank: 2 }, { isYou: false, rank: 3 }] });
    expect(await readWrapped(fakeDb().client, 'u1', input('hanukkah', '2026-12-11'))).toMatchObject({ tableRank: 2, tableSize: 3 });
    readTable.mockRejectedValue(new Error('down'));
    expect(await readWrapped(fakeDb().client, 'u1', input('hanukkah', '2026-12-11'))).toMatchObject({ tableRank: null, tableSize: 0 });
  });
});
