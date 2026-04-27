import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../client', () => ({ getSupabase: vi.fn() }));
vi.mock('@/lib/seasons', () => ({
  getCurrentSeasonDynamic: () => ({
    id: 7,
    name: 'Season 7: test',
    theme: 'test',
    startDate: new Date(),
    endDate: new Date(),
    rewards: [],
  }),
}));

import { getSupabase } from '../client';
import { updateLeaderboardEntry } from '../leaderboard';

describe('updateLeaderboardEntry — season aware', () => {
  let upsertSpy: ReturnType<typeof vi.fn>;
  let upsertOpts: unknown;

  beforeEach(() => {
    vi.clearAllMocks();
    upsertSpy = vi.fn((row: unknown, opts: unknown) => {
      upsertOpts = opts;
      return {
        select: () => ({
          single: () => Promise.resolve({ data: row, error: null }),
        }),
      };
    });
    (getSupabase as any).mockReturnValue({
      from: (table: string) => {
        if (table === 'profiles') {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      username: 'alice',
                      display_name: 'Alice',
                      avatar_emoji: '🌟',
                      avatar_color: '#abc',
                      total_score: 500,
                      total_games: 10,
                      casual_wins: 4,
                      ranked_wins: 1,
                      ranked_mmr: 1234,
                    },
                    error: null,
                  }),
              }),
            }),
          };
        }
        if (table === 'leaderboard') {
          return { upsert: upsertSpy };
        }
        throw new Error(`unexpected table: ${table}`);
      },
    });
  });

  it('writes season_id from the current dynamic season', async () => {
    await updateLeaderboardEntry('player-1');

    const row = upsertSpy.mock.calls[0][0];
    expect(row.player_id).toBe('player-1');
    expect(row.season_id).toBe(7);
  });

  it('uses composite (player_id, season_id) onConflict', async () => {
    await updateLeaderboardEntry('player-1');

    expect(upsertOpts).toEqual({ onConflict: 'player_id,season_id' });
  });
});
