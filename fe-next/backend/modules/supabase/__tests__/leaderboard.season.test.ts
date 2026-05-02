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

interface PriorSnapshot { season_id: number; total_score: number }

function buildClient(opts: {
  lifetime: number;
  priors: PriorSnapshot[];
  capture: { upsertSpy: ReturnType<typeof vi.fn>; upsertOpts?: unknown };
}) {
  const { lifetime, priors, capture } = opts;
  capture.upsertSpy = vi.fn((row: unknown, optsArg: unknown) => {
    capture.upsertOpts = optsArg;
    return {
      select: () => ({
        single: () => Promise.resolve({ data: row, error: null }),
      }),
    };
  });
  return {
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
                    total_score: lifetime,
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
      if (table === 'season_leaderboards') {
        return {
          select: () => ({
            eq: () => ({
              lt: () => Promise.resolve({ data: priors, error: null }),
            }),
          }),
        };
      }
      if (table === 'leaderboard') {
        return { upsert: capture.upsertSpy };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  };
}

describe('updateLeaderboardEntry — season aware', () => {
  beforeEach(() => vi.clearAllMocks());

  it('writes season_id from the current dynamic season', async () => {
    const capture: any = {};
    (getSupabase as any).mockReturnValue(buildClient({ lifetime: 500, priors: [], capture }));
    await updateLeaderboardEntry('player-1');

    const row = capture.upsertSpy.mock.calls[0][0];
    expect(row.player_id).toBe('player-1');
    expect(row.season_id).toBe(7);
  });

  it('uses composite (player_id, season_id) onConflict', async () => {
    const capture: any = {};
    (getSupabase as any).mockReturnValue(buildClient({ lifetime: 500, priors: [], capture }));
    await updateLeaderboardEntry('player-1');
    expect(capture.upsertOpts).toEqual({ onConflict: 'player_id,season_id' });
  });

  it('writes lifetime as season_score when player has no prior seasons', async () => {
    const capture: any = {};
    (getSupabase as any).mockReturnValue(buildClient({ lifetime: 500, priors: [], capture }));
    await updateLeaderboardEntry('player-1');

    const row = capture.upsertSpy.mock.calls[0][0];
    expect(row.total_score).toBe(500);
  });

  it('subtracts prior season finals and adds 10% carry from previous season', async () => {
    // Lifetime 12000 = s1 final 8000 + s2 final 3000 + actual play in s7 of 1000
    // (s2-s6 missing means the player skipped them — sum prior = 8000 + 3000 = 11000)
    // No previous-season carry because seasonId-1 (=6) has no snapshot.
    // Expected season_score = 12000 − 11000 + 0 = 1000
    const capture: any = {};
    (getSupabase as any).mockReturnValue(
      buildClient({
        lifetime: 12000,
        priors: [
          { season_id: 1, total_score: 8000 },
          { season_id: 2, total_score: 3000 },
        ],
        capture,
      }),
    );
    await updateLeaderboardEntry('player-1');

    const row = capture.upsertSpy.mock.calls[0][0];
    expect(row.total_score).toBe(1000);
  });

  it('adds 10% carry when previous season (seasonId-1) snapshot exists', async () => {
    // Previous season (id=6) final 5000 → carry = 500.
    // Lifetime 6000 includes s6=5000 + s7 actual 1000.
    // Expected = 6000 − 5000 + 500 = 1500
    const capture: any = {};
    (getSupabase as any).mockReturnValue(
      buildClient({
        lifetime: 6000,
        priors: [{ season_id: 6, total_score: 5000 }],
        capture,
      }),
    );
    await updateLeaderboardEntry('player-1');

    const row = capture.upsertSpy.mock.calls[0][0];
    expect(row.total_score).toBe(1500);
  });

  it('clamps to zero when computation would otherwise go negative', async () => {
    // Defensive: should not happen in practice but guard against bad snapshot data.
    const capture: any = {};
    (getSupabase as any).mockReturnValue(
      buildClient({
        lifetime: 100,
        priors: [{ season_id: 6, total_score: 9999 }],
        capture,
      }),
    );
    await updateLeaderboardEntry('player-1');

    const row = capture.upsertSpy.mock.calls[0][0];
    expect(row.total_score).toBeGreaterThanOrEqual(0);
  });
});
