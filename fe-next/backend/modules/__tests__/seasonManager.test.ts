import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockRpc, mockExpiredSelect, mockArchiveSelect, mockNotifySeasonStart } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockExpiredSelect: vi.fn(),
  mockArchiveSelect: vi.fn(),
  mockNotifySeasonStart: vi.fn(),
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
      if (table === 'season_leaderboards') {
        const chain: any = {
          select: () => chain,
          eq: () => chain,
          then: (onFulfilled: (v: unknown) => unknown) =>
            Promise.resolve(mockArchiveSelect()).then(onFulfilled),
        };
        return chain;
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

const mockGetUserLocalesBatch = vi.fn();

vi.mock('../pushNotificationTriggers', () => ({
  notifySeasonStart: (...args: unknown[]) => mockNotifySeasonStart(...args),
  getUserLocalesBatch: (...args: unknown[]) => mockGetUserLocalesBatch(...args),
}));

vi.mock('../../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), log: vi.fn() },
}));

import { processSeasonReset, processExpiredSeasons, notifyPlayersOfSeasonStart } from '../seasonManager';

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
    mockArchiveSelect.mockReset();
    mockNotifySeasonStart.mockReset();
    mockGetUserLocalesBatch.mockReset();
    mockGetUserLocalesBatch.mockResolvedValue(new Map());
    mockArchiveSelect.mockReturnValue({ data: [], error: null });
  });

  it('returns processed=0 when no expired-active season exists', async () => {
    mockExpiredSelect.mockReturnValue({ data: [], error: null });

    const result = await processExpiredSeasons();

    expect(result.processed).toBe(0);
    expect(result.results).toEqual([]);
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockNotifySeasonStart).not.toHaveBeenCalled();
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

  it('fires season_start push for every archived player after successful reset', async () => {
    mockExpiredSelect.mockReturnValue({ data: [{ id: 7 }], error: null });
    mockRpc.mockResolvedValueOnce({ data: [{ snapshotted: 3, reset_count: 3 }], error: null });
    mockArchiveSelect.mockReturnValue({
      data: [{ player_id: 'p1' }, { player_id: 'p2' }, { player_id: 'p3' }],
      error: null,
    });

    const result = await processExpiredSeasons();

    expect(mockNotifySeasonStart).toHaveBeenCalledTimes(3);
    expect(mockNotifySeasonStart).toHaveBeenNthCalledWith(1, 'p1', 8, 7, undefined);
    expect(mockNotifySeasonStart).toHaveBeenNthCalledWith(2, 'p2', 8, 7, undefined);
    expect(mockNotifySeasonStart).toHaveBeenNthCalledWith(3, 'p3', 8, 7, undefined);
    expect(result.notified).toBe(3);
  });

  it('skips push fan-out when reset snapshotted zero players', async () => {
    mockExpiredSelect.mockReturnValue({ data: [{ id: 9 }], error: null });
    mockRpc.mockResolvedValueOnce({ data: [{ snapshotted: 0, reset_count: 0 }], error: null });

    const result = await processExpiredSeasons();

    expect(mockNotifySeasonStart).not.toHaveBeenCalled();
    expect(result.notified).toBe(0);
  });

  it('does not abort when push fan-out throws', async () => {
    mockExpiredSelect.mockReturnValue({ data: [{ id: 4 }], error: null });
    mockRpc.mockResolvedValueOnce({ data: [{ snapshotted: 1, reset_count: 1 }], error: null });
    mockArchiveSelect.mockReturnValue({ data: [{ player_id: 'p1' }], error: null });
    mockNotifySeasonStart.mockRejectedValue(new Error('fcm down'));

    const result = await processExpiredSeasons();

    expect(result.processed).toBe(1);
    expect(result.results[0]?.success).toBe(true);
    expect(result.notified).toBe(1);
  });
});

describe('notifyPlayersOfSeasonStart', () => {
  beforeEach(() => {
    mockArchiveSelect.mockReset();
    mockNotifySeasonStart.mockReset();
    mockGetUserLocalesBatch.mockReset();
    mockGetUserLocalesBatch.mockResolvedValue(new Map());
  });

  it('returns 0 when archive query errors', async () => {
    mockArchiveSelect.mockReturnValue({ data: null, error: { message: 'no perms' } });

    const count = await notifyPlayersOfSeasonStart(3, 4);

    expect(count).toBe(0);
    expect(mockNotifySeasonStart).not.toHaveBeenCalled();
  });

  it('returns 0 when archive empty', async () => {
    mockArchiveSelect.mockReturnValue({ data: [], error: null });
    expect(await notifyPlayersOfSeasonStart(3, 4)).toBe(0);
  });

  it('fires push per archived player and returns count', async () => {
    mockArchiveSelect.mockReturnValue({
      data: [{ player_id: 'a' }, { player_id: 'b' }],
      error: null,
    });

    const count = await notifyPlayersOfSeasonStart(3, 4);

    expect(count).toBe(2);
    expect(mockNotifySeasonStart).toHaveBeenCalledTimes(2);
  });

  // Sentry NEXTJS-136: pool exhaustion at season rotation. Prove fan-out
  // batches locales (1 query, not N) and forwards precomputed locale to
  // notifySeasonStart so triggerPush skips per-user getUserLocale.
  it('batch-fetches locales once and forwards precomputed locale to each push', async () => {
    mockArchiveSelect.mockReturnValue({
      data: [{ player_id: 'a' }, { player_id: 'b' }, { player_id: 'c' }],
      error: null,
    });
    mockGetUserLocalesBatch.mockResolvedValue(
      new Map([
        ['a', 'he'],
        ['b', 'ja'],
        ['c', 'en'],
      ]),
    );

    await notifyPlayersOfSeasonStart(3, 4);

    expect(mockGetUserLocalesBatch).toHaveBeenCalledTimes(1);
    expect(mockGetUserLocalesBatch).toHaveBeenCalledWith(['a', 'b', 'c']);
    expect(mockNotifySeasonStart).toHaveBeenCalledWith('a', 4, 3, 'he');
    expect(mockNotifySeasonStart).toHaveBeenCalledWith('b', 4, 3, 'ja');
    expect(mockNotifySeasonStart).toHaveBeenCalledWith('c', 4, 3, 'en');
  });

  // Concurrency cap prevents the Promise.all blast that maxed pool 25/25.
  // With CHUNK_SIZE=10 and 25 ids, never more than 10 in-flight at once.
  it('chunks fan-out at concurrency 10 to cap parallel supabase inserts', async () => {
    const ids = Array.from({ length: 25 }, (_, i) => `u${i}`);
    mockArchiveSelect.mockReturnValue({
      data: ids.map((id) => ({ player_id: id })),
      error: null,
    });
    mockGetUserLocalesBatch.mockResolvedValue(new Map(ids.map((id) => [id, 'en'])));

    let inFlight = 0;
    let peak = 0;
    mockNotifySeasonStart.mockImplementation(async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight -= 1;
    });

    const count = await notifyPlayersOfSeasonStart(3, 4);

    expect(count).toBe(25);
    expect(mockNotifySeasonStart).toHaveBeenCalledTimes(25);
    expect(peak).toBeLessThanOrEqual(10);
  });
});
