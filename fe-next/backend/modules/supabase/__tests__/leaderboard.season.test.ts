import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../client', () => ({ getSupabase: vi.fn() }));

import { getSupabase } from '../client';
import { updateLeaderboardEntry } from '../leaderboard';

// The season-score math now lives in the SQL RPC
// `recompute_current_season_leaderboard` (migration
// 20260602120000_season_score_from_events): the row is a pure projection of
// dated scoring events into the current season window. These tests cover the
// thin TS delegation; the aggregation correctness is verified against live data.

describe('updateLeaderboardEntry — delegates to the event-recompute RPC', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls recompute_current_season_leaderboard with the player id', async () => {
    const rpc = vi.fn(() => Promise.resolve({ data: null, error: null }));
    (getSupabase as any).mockReturnValue({ rpc });

    await updateLeaderboardEntry('player-1');

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('recompute_current_season_leaderboard', {
      p_player_id: 'player-1',
    });
  });

  it('returns an error when Supabase is not configured (no throw)', async () => {
    (getSupabase as any).mockReturnValue(null);
    const res = await updateLeaderboardEntry('player-1');
    expect(res.error).toBeTruthy();
    expect(res.data).toBeNull();
  });

  it('retries once on deadlock then succeeds', async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: { message: 'deadlock detected' } })
      .mockResolvedValueOnce({ data: null, error: null });
    (getSupabase as any).mockReturnValue({ rpc });

    const res = await updateLeaderboardEntry('player-1');

    expect(rpc).toHaveBeenCalledTimes(2);
    expect(res.error).toBeNull();
  });

  it('surfaces a non-deadlock error without retrying', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'permission denied' } });
    (getSupabase as any).mockReturnValue({ rpc });

    const res = await updateLeaderboardEntry('player-1');

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(res.error).toEqual({ message: 'permission denied' });
  });
});
