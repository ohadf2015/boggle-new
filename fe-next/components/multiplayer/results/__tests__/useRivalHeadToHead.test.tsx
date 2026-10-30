import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({ getHeadToHead: vi.fn() }));
vi.mock('@/utils/friendsHeadToHead', () => ({ getHeadToHead: h.getHeadToHead }));

import { useFrozenAfter, useRivalHeadToHead, __resetRivalHeadToHeadCache, RIVAL_H2H_CACHE_MS } from '../useRivalHeadToHead';

const maya = { username: 'Maya', userId: 'u-maya' };
const rec = { opponentId: 'u-maya', myWins: 4, theirWins: 2, draws: 0, totalGames: 6 };

describe('useRivalHeadToHead', () => {
  beforeEach(() => {
    h.getHeadToHead.mockReset();
    __resetRivalHeadToHeadCache();
  });

  it('Given a guest viewer, Then it never fetches and returns null', () => {
    const { result } = renderHook(() => useRivalHeadToHead(maya, false));
    expect(result.current).toBeNull();
    expect(h.getHeadToHead).not.toHaveBeenCalled();
  });

  it('Given no rival (guest/bot rival), Then it never fetches', () => {
    const { result } = renderHook(() => useRivalHeadToHead(null, true));
    expect(result.current).toBeNull();
    expect(h.getHeadToHead).not.toHaveBeenCalled();
  });

  it('Given a signed-in viewer and rival, Then it resolves to the rival record', async () => {
    h.getHeadToHead.mockResolvedValue(rec);
    const { result } = renderHook(() => useRivalHeadToHead(maya, true));
    expect(result.current).toBeNull();
    await waitFor(() => expect(result.current).toEqual({ name: 'Maya', myWins: 4, theirWins: 2, meetings: 6 }));
    expect(h.getHeadToHead).toHaveBeenCalledWith('u-maya');
  });

  it('Given zero history, Then it stays null', async () => {
    h.getHeadToHead.mockResolvedValue(null);
    const { result } = renderHook(() => useRivalHeadToHead(maya, true));
    await waitFor(() => expect(h.getHeadToHead).toHaveBeenCalled());
    await Promise.resolve();
    expect(result.current).toBeNull();
  });

  it('Given the fetch fails, Then it stays null and does not throw', async () => {
    h.getHeadToHead.mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useRivalHeadToHead(maya, true));
    await waitFor(() => expect(h.getHeadToHead).toHaveBeenCalled());
    await Promise.resolve();
    await Promise.resolve();
    expect(result.current).toBeNull();
  });

  it('Given the same rival on the same results screen (remount), Then the cached result is reused without a second fetch', async () => {
    h.getHeadToHead.mockResolvedValue(rec);
    const first = renderHook(() => useRivalHeadToHead(maya, true));
    await waitFor(() => expect(first.result.current).not.toBeNull());
    const second = renderHook(() => useRivalHeadToHead(maya, true));
    await waitFor(() => expect(second.result.current).not.toBeNull());
    expect(h.getHeadToHead).toHaveBeenCalledTimes(1);
  });

  it('Given the same rival next round, Then the record is fetched again so it counts the round between', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
    h.getHeadToHead.mockResolvedValueOnce(rec).mockResolvedValueOnce({ ...rec, myWins: 5, totalGames: 7 });
    const first = renderHook(() => useRivalHeadToHead(maya, true));
    await waitFor(() => expect(first.result.current?.meetings).toBe(6));
    now.mockReturnValue(1_000_000 + RIVAL_H2H_CACHE_MS + 1);
    const second = renderHook(() => useRivalHeadToHead(maya, true));
    await waitFor(() => expect(second.result.current?.meetings).toBe(7));
    expect(h.getHeadToHead).toHaveBeenCalledTimes(2);
    now.mockRestore();
  });
});

describe('useFrozenAfter (no callout flip once the card is on screen)', () => {
  it('Given the record lands before the reveal, Then it is used', () => {
    const { result, rerender } = renderHook(({ v, f }) => useFrozenAfter(v, f), { initialProps: { v: null as string | null, f: false } });
    rerender({ v: 'record', f: false });
    rerender({ v: 'record', f: true });
    expect(result.current).toBe('record');
  });

  it('Given the record lands after the card revealed, Then the shown value does not change', () => {
    const { result, rerender } = renderHook(({ v, f }) => useFrozenAfter(v, f), { initialProps: { v: null as string | null, f: false } });
    rerender({ v: null, f: true });
    rerender({ v: 'late record', f: true });
    expect(result.current).toBeNull();
  });
});
