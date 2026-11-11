import { describe, it, expect, vi, beforeEach } from 'vitest';

const streak = vi.hoisted(() => ({ value: 0 }));
vi.mock('../dailyStreak', () => ({
  fetchDailyStreak: vi.fn(async () => ({ currentStreak: streak.value, lastPlayedDate: null })),
}));

import { grantDailyAchievements } from '../dailyAchievements';

function db() {
  return { rpc: vi.fn(async (_f: string, a: { p_keys: string[] }) => ({ data: a.p_keys, error: null })) };
}

describe('grantDailyAchievements', () => {
  beforeEach(() => {
    streak.value = 0;
  });

  it('top 3 on the board grants DAILY_TOP3', async () => {
    // Given a player who placed 2nd
    const supabase = db();
    await grantDailyAchievements(supabase as never, 'p1', 2, { isToday: true });
    // Then the podium achievement is granted
    expect(supabase.rpc).toHaveBeenCalledWith('grant_achievements', { p_user_id: 'p1', p_keys: ['DAILY_TOP3'] });
  });

  it('a 7-day streak grants the week badge, 30 grants both', async () => {
    const supabase = db();
    streak.value = 30;
    await grantDailyAchievements(supabase as never, 'p1', 9, { isToday: true });
    expect(supabase.rpc).toHaveBeenCalledWith('grant_achievements', {
      p_user_id: 'p1',
      p_keys: ['DAILY_BOARD_STREAK_7', 'DAILY_BOARD_STREAK_30'],
    });
  });

  it('a catch-up replay of an old day never counts as a podium', async () => {
    // Given 1st place on a replayed past day (old boards are near empty)
    const supabase = db();
    await grantDailyAchievements(supabase as never, 'p1', 1, { isToday: false });
    // Then no podium achievement
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('4th place on day 1 grants nothing', async () => {
    const supabase = db();
    streak.value = 1;
    await grantDailyAchievements(supabase as never, 'p1', 4, { isToday: true });
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('never throws', async () => {
    const supabase = { rpc: vi.fn(async () => { throw new Error('down'); }) };
    streak.value = 7;
    await expect(grantDailyAchievements(supabase as never, 'p1', 1, { isToday: true })).resolves.toEqual([]);
  });
});
