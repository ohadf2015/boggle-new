/**
 * TDD: player_ratings.wins must increment from cumulative baseline,
 * not from gamesPlayed. Previously wins was written as `gamesPlayed + 1`
 * which corrupted the cumulative wins column as soon as real baselines
 * started flowing in (wins=13 for a 12-games player with 3 prior wins).
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../client', () => ({ getSupabase: vi.fn() }));
vi.mock('../../../utils/logger', () => ({
  default: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { getSupabase } from '../client';
import { updateRankedMmr, fetchRankedBaselines } from '../rankedMmr';

describe('updateRankedMmr — wins column', () => {
  let upsertSpy: ReturnType<typeof vi.fn>;
  let rpcSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    upsertSpy = vi.fn().mockReturnValue({ then: (cb: any) => cb({ data: null, error: null }) });
    rpcSpy = vi.fn().mockResolvedValue({ data: 2, error: null });
    (getSupabase as any).mockReturnValue({
      rpc: rpcSpy,
      from: vi.fn().mockReturnValue({ upsert: upsertSpy }),
    });
  });

  it('writes wins as priorWins + 1 for the winner, not gamesPlayed + 1', async () => {
    await updateRankedMmr([
      { playerId: 'winner', placement: 1, currentMmr: 1350, peakMmr: 1400, rd: 200, gamesPlayed: 12, priorWins: 3 },
      { playerId: 'loser',  placement: 2, currentMmr: 1180, peakMmr: 1200, rd: 250, gamesPlayed: 6,  priorWins: 2 },
    ] as any);

    const winnerUpsert = upsertSpy.mock.calls.find(c => c[0].user_id === 'winner');
    expect(winnerUpsert).toBeDefined();
    expect(winnerUpsert![0].wins).toBe(4); // 3 + 1, NOT 12 + 1
  });

  it('does not touch wins column for non-winners', async () => {
    await updateRankedMmr([
      { playerId: 'winner', placement: 1, currentMmr: 1000, rd: 350, gamesPlayed: 0, priorWins: 0 },
      { playerId: 'loser',  placement: 2, currentMmr: 1000, rd: 350, gamesPlayed: 5, priorWins: 1 },
    ] as any);

    const loserUpsert = upsertSpy.mock.calls.find(c => c[0].user_id === 'loser');
    expect(loserUpsert![0].wins).toBeUndefined();
  });
});

describe('fetchRankedBaselines — wins column', () => {
  it('selects wins column and returns it in the baseline', async () => {
    const selectSpy = vi.fn().mockReturnThis();
    const inSpy = vi.fn().mockResolvedValue({
      data: [
        { user_id: 'u1', rating: 1350, rating_deviation: 200, games_played: 12, peak_rating: 1400, wins: 7 },
      ],
      error: null,
    });
    (getSupabase as any).mockReturnValue({
      from: vi.fn().mockReturnValue({ select: selectSpy, in: inSpy }),
    });
    // chain: from().select().in()
    selectSpy.mockReturnValue({ in: inSpy });

    const result = await fetchRankedBaselines(['u1']);

    expect(selectSpy).toHaveBeenCalledWith(expect.stringContaining('wins'));
    expect(result.get('u1')).toMatchObject({ priorWins: 7 });
  });
});
