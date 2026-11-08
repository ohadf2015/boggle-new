import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

const getRecent = vi.fn();
vi.mock('@/lib/supabase/analyticsLastGame', () => ({ getRecentClassroomGames: (...a: unknown[]) => getRecent(...a) }));
vi.mock('@/lib/supabase', () => ({ supabase: {} }));

import { useLastClassGame } from '../useLastClassGame';

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

const GAME = { gameCode: 'G1' };

beforeEach(() => {
  vi.useFakeTimers();
  getRecent.mockReset();
});
afterEach(() => vi.useRealTimers());

describe('useLastClassGame', () => {
  it('Given no class, Then it is idle and reads nothing', () => {
    const { result } = renderHook(() => useLastClassGame('', 'Student'));
    expect(result.current).toEqual({ status: 'idle', game: null });
    expect(getRecent).not.toHaveBeenCalled();
  });

  it('Given a class, Then it reads its one newest game and settles ready', async () => {
    getRecent.mockResolvedValue({ data: [GAME], error: null });
    const { result } = renderHook(() => useLastClassGame('c1', 'Student'));
    expect(result.current.status).toBe('loading');
    await act(async () => {});
    expect(getRecent).toHaveBeenCalledWith('c1', 1, { fallbackName: 'Student' });
    expect(result.current).toEqual({ status: 'ready', game: GAME });
  });

  it('Given a class that never played, Then it is ready with no game', async () => {
    getRecent.mockResolvedValue({ data: [], error: null });
    const { result } = renderHook(() => useLastClassGame('c1', 'Student'));
    await act(async () => {});
    expect(result.current).toEqual({ status: 'ready', game: null });
  });

  it('Given the read fails, Then it says error, not an empty class', async () => {
    getRecent.mockResolvedValue({ data: [], error: { message: 'boom' } });
    const { result } = renderHook(() => useLastClassGame('c1', 'Student'));
    await act(async () => {});
    expect(result.current).toEqual({ status: 'error', game: null });
  });

  it('Given a slow read, Then the cap settles it as error and a late answer never flips the screen', async () => {
    const d = deferred<{ data: unknown[]; error: null }>();
    getRecent.mockReturnValue(d.promise);
    const { result } = renderHook(() => useLastClassGame('c1', 'Student', 2500));
    act(() => vi.advanceTimersByTime(2500));
    expect(result.current).toEqual({ status: 'error', game: null });
    await act(async () => d.resolve({ data: [GAME], error: null }));
    expect(result.current).toEqual({ status: 'error', game: null });
  });

  it('Given the default cap, Then a slow read gives Start live back within 1.5s', () => {
    getRecent.mockReturnValue(deferred<{ data: unknown[]; error: null }>().promise);
    const { result } = renderHook(() => useLastClassGame('c1', 'Student'));
    act(() => vi.advanceTimersByTime(1500));
    expect(result.current).toEqual({ status: 'error', game: null });
  });

  it('Given the teacher switches class, Then the previous class game is never shown for the new one', async () => {
    getRecent.mockResolvedValueOnce({ data: [GAME], error: null });
    const d = deferred<{ data: unknown[]; error: null }>();
    getRecent.mockReturnValueOnce(d.promise);
    const { result, rerender } = renderHook(({ id }) => useLastClassGame(id, 'Student'), { initialProps: { id: 'c1' } });
    await act(async () => {});
    expect(result.current.game).toBe(GAME);
    rerender({ id: 'c2' });
    expect(result.current).toEqual({ status: 'loading', game: null });
  });
});
