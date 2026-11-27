import { beforeEach, describe, expect, it, vi } from 'vitest';

const markPlayed = vi.fn();
vi.mock('@/lib/holidayEvent/progress.server', () => ({ markHolidayDayPlayed: (...a: unknown[]) => markPlayed(...a) }));
vi.mock('@/utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { readRescueState, rescueInviter } from '../dailyRescue.server';
import { fakeSupabase } from './dailyFakeSupabase';

const KEYS = { holiday_rescues: [['inviter_id', 'event_key', 'day_index'], ['friend_id', 'inviter_id', 'rescued_on']] };
const TODAY = '2026-12-07';

function world(extra: Record<string, Record<string, unknown>[]> = {}) {
  return fakeSupabase({
    keys: KEYS,
    seed: {
      profiles: [
        { id: 'inv', referral_code: 'NOA123' },
        { id: 'fr', referral_code: 'FRI999' },
      ],
      holiday_event_progress: [
        { user_id: 'inv', event_key: 'hanukkah-2026', day_index: 0 },
        { user_id: 'inv', event_key: 'hanukkah-2026', day_index: 3 },
      ],
      daily_word_hunt_attempts: [{ player_id: 'fr', puzzle_date: TODAY }],
      ...extra,
    },
  });
}

beforeEach(() => {
  markPlayed.mockReset().mockResolvedValue({ status: 'lit', index: 2, reward: { coins: 50 } });
});

describe('rescueInviter', () => {
  it('Given a friend who finished today through the invite, Then the inviter’s latest missed night relights from the friend', async () => {
    const f = world();
    const r = await rescueInviter({ supabase: f.supabase, friendId: 'fr', ref: 'noa123', holiday: 'hanukkah', localDate: TODAY });
    expect(r).toEqual({ status: 'relit', day: 3 });
    expect(markPlayed).toHaveBeenCalledWith(expect.objectContaining({ userId: 'inv', holiday: 'hanukkah', localDate: '2026-12-06' }));
    expect(f.tables.holiday_rescues).toEqual([expect.objectContaining({ inviter_id: 'inv', friend_id: 'fr', day_index: 2 })]);
  });

  it('Given the same friend again today, Then no second night relights', async () => {
    const f = world();
    await rescueInviter({ supabase: f.supabase, friendId: 'fr', ref: 'NOA123', holiday: 'hanukkah', localDate: TODAY });
    expect(await rescueInviter({ supabase: f.supabase, friendId: 'fr', ref: 'NOA123', holiday: 'hanukkah', localDate: TODAY })).toEqual({ status: 'already' });
    expect(markPlayed).toHaveBeenCalledTimes(1);
  });

  it('Given the friend did not finish a game today, Then nothing relights', async () => {
    const f = world({ daily_word_hunt_attempts: [] });
    expect(await rescueInviter({ supabase: f.supabase, friendId: 'fr', ref: 'NOA123', holiday: 'hanukkah', localDate: TODAY })).toEqual({ status: 'not_finished' });
  });

  it('Given your own link or an unknown code, Then nothing relights', async () => {
    const f = world();
    expect(await rescueInviter({ supabase: f.supabase, friendId: 'inv', ref: 'NOA123', holiday: 'hanukkah', localDate: TODAY })).toEqual({ status: 'invalid' });
    expect(await rescueInviter({ supabase: f.supabase, friendId: 'fr', ref: 'NOPE00', holiday: 'hanukkah', localDate: TODAY })).toEqual({ status: 'invalid' });
  });

  it('Given the inviter missed nothing, Then there is nothing to relight', async () => {
    const f = world({
      holiday_event_progress: [0, 1, 2].map((d) => ({ user_id: 'inv', event_key: 'hanukkah-2026', day_index: d })),
    });
    expect(await rescueInviter({ supabase: f.supabase, friendId: 'fr', ref: 'NOA123', holiday: 'hanukkah', localDate: TODAY })).toEqual({ status: 'nothing_missed' });
  });
});

describe('readRescueState', () => {
  it('Given missed nights, Then the player sees the latest one to relight and their invite code', async () => {
    const f = world();
    expect(await readRescueState({ supabase: f.supabase, userId: 'inv', holiday: 'hanukkah', localDate: TODAY })).toEqual({
      code: 'NOA123',
      missedDay: 3,
      missedCount: 2,
      rescuedDays: [],
    });
  });
});

describe('locale-extended christmas', () => {
  it('Given an es player on Jan 4 and a ru player on Jan 7, Then their rescue state is live; an en player on Jan 4 gets none', async () => {
    const f = world();
    expect(await readRescueState({ supabase: f.supabase, userId: 'inv', holiday: 'christmas', localDate: '2027-01-04', locale: 'es' })).not.toBeNull();
    expect(await readRescueState({ supabase: f.supabase, userId: 'inv', holiday: 'christmas', localDate: '2027-01-07', locale: 'ru' })).not.toBeNull();
    expect(await readRescueState({ supabase: f.supabase, userId: 'inv', holiday: 'christmas', localDate: '2027-01-04', locale: 'en' })).toBeNull();
  });
});
