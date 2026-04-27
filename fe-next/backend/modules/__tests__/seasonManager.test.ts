import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockRpc, mockExpiredSelect } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockExpiredSelect: vi.fn(),
}));

vi.mock('../supabaseServer', () => ({
  getSupabase: () => ({
    rpc: mockRpc,
    from: (table: string) => {
      if (table === 'seasons') {
        const chain: any = {
          select: () => chain,
          eq: () => chain,
          lte: () => chain,
          order: () => chain,
          then: (onFulfilled: (v: unknown) => unknown) =>
            Promise.resolve(mockExpiredSelect()).then(onFulfilled),
        };
        return chain;
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

import { processSeasonReset, processExpiredSeasons } from '../seasonManager';

describe('processSeasonReset', () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  it('invokes the process_season_reset RPC with the season id', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [{ snapshotted: 17, reset_count: 17 }],
      error: null,
    });

    await processSeasonReset(1);

    expect(mockRpc).toHaveBeenCalledWith('process_season_reset', { p_season_id: 1 });
  });

  it('returns success with row counts when RPC succeeds', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [{ snapshotted: 42, reset_count: 42 }],
      error: null,
    });

    const result = await processSeasonReset(2);

    expect(result.success).toBe(true);
    expect(result.snapshotted).toBe(42);
    expect(result.resetCount).toBe(42);
    expect(result.errors).toBeUndefined();
  });

  it('returns failure when RPC errors', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'permission denied for relation leaderboard' },
    });

    const result = await processSeasonReset(3);

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors?.[0]).toContain('permission denied');
    expect(result.snapshotted).toBe(0);
    expect(result.resetCount).toBe(0);
  });

  it('returns failure when supabase throws', async () => {
    mockRpc.mockRejectedValueOnce(new Error('connection refused'));

    const result = await processSeasonReset(4);

    expect(result.success).toBe(false);
    expect(result.errors?.[0]).toContain('connection refused');
  });

  it('handles RPC returning empty array gracefully', async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });

    const result = await processSeasonReset(5);

    expect(result.success).toBe(true);
    expect(result.snapshotted).toBe(0);
    expect(result.resetCount).toBe(0);
  });
});

describe('processExpiredSeasons', () => {
  beforeEach(() => {
    mockRpc.mockReset();
    mockExpiredSelect.mockReset();
  });

  it('returns processed=0 when no expired-active season exists', async () => {
    mockExpiredSelect.mockReturnValue({ data: [], error: null });

    const result = await processExpiredSeasons();

    expect(result.processed).toBe(0);
    expect(result.results).toEqual([]);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('calls processSeasonReset for each expired-active season', async () => {
    mockExpiredSelect.mockReturnValue({
      data: [{ id: 1 }, { id: 2 }],
      error: null,
    });
    mockRpc
      .mockResolvedValueOnce({ data: [{ snapshotted: 33, reset_count: 33 }], error: null })
      .mockResolvedValueOnce({ data: [{ snapshotted: 0, reset_count: 0 }], error: null });

    const result = await processExpiredSeasons();

    expect(result.processed).toBe(2);
    expect(mockRpc).toHaveBeenCalledTimes(2);
    expect(mockRpc).toHaveBeenNthCalledWith(1, 'process_season_reset', { p_season_id: 1 });
    expect(mockRpc).toHaveBeenNthCalledWith(2, 'process_season_reset', { p_season_id: 2 });
    expect(result.results[0]?.snapshotted).toBe(33);
  });

  it('returns failure when query for expired seasons errors', async () => {
    mockExpiredSelect.mockReturnValue({ data: null, error: { message: 'boom' } });

    const result = await processExpiredSeasons();

    expect(result.processed).toBe(0);
    expect(result.errors?.[0]).toContain('boom');
  });
});
