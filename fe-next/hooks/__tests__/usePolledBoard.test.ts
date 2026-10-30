import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePolledBoard } from '../usePolledBoard';

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('usePolledBoard', () => {
  it('does not load at all while disabled (a hidden tab costs nothing)', () => {
    const load = vi.fn().mockResolvedValue('x');
    renderHook(() => usePolledBoard(load, { enabled: false, key: 'a' }));
    expect(load).not.toHaveBeenCalled();
  });

  it('keeps the newer answer when an older request lands after it', async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const load = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { result, rerender } = renderHook(({ k }) => usePolledBoard(load, { enabled: true, key: k }), {
      initialProps: { k: 'all' },
    });
    rerender({ k: 'mine' });
    await act(async () => { second.resolve('new'); });
    await act(async () => { first.resolve('old'); });
    await waitFor(() => expect(result.current.data).toBe('new'));
    expect(load.mock.calls[0][0].aborted).toBe(true);
  });

  it('stops polling while the page is hidden and refreshes when it comes back', async () => {
    vi.useFakeTimers();
    const load = vi.fn().mockResolvedValue('x');
    renderHook(() => usePolledBoard(load, { enabled: true, key: 'a', intervalMs: 1000 }));
    expect(load).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    await act(async () => { vi.advanceTimersByTime(5000); });
    expect(load).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(load).toHaveBeenCalledTimes(2);
    await act(async () => { vi.advanceTimersByTime(1000); });
    expect(load).toHaveBeenCalledTimes(3);
  });

  it('reads as loading, never as an empty board, on the render that first enables it', async () => {
    const pending = deferred<string>();
    const seen: Array<{ enabled: boolean; loading: boolean; data: string | null }> = [];
    const { rerender } = renderHook(({ enabled }) => {
      const board = usePolledBoard(() => pending.promise, { enabled, key: 'a' });
      seen.push({ enabled, loading: board.loading, data: board.data });
      return board;
    }, { initialProps: { enabled: false } });
    rerender({ enabled: true });
    expect(seen.filter((s) => s.enabled && !s.loading && s.data === null)).toEqual([]);
    await act(async () => { pending.resolve('x'); });
  });
});
