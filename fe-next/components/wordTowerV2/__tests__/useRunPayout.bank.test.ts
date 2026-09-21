import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useRunPayout } from '../rewards/useRunPayout';
import type { RunSummary } from '@/lib/wordTowerV2/estate';

const summary = (floors: number): RunSummary => ({ floors, perfects: 1, bestCombo: 1, crates: 0, heightM: floors * 3 });
const paid = { coins: 40, chest: { tier: 'common', coins: 40, shields: 0, bricks: 0, blueprints: 0 } } as never;

describe('useRunPayout — leaving mid-run banks the run', () => {
  it('given a run in progress, when the player leaves, then it is banked once (keepalive), and the later collapse does not pay again', async () => {
    const reportRun = vi.fn().mockResolvedValue(paid);
    const { result, rerender } = renderHook((p: { over: boolean }) => useRunPayout({ over: p.over, ready: true, getSummary: () => summary(4), reportRun }), {
      initialProps: { over: false },
    });

    await act(() => result.current.bank(true));
    await act(() => result.current.bank(true));
    expect(reportRun).toHaveBeenCalledTimes(1);
    expect(reportRun).toHaveBeenCalledWith(summary(4), { keepalive: true });

    // bfcache restore: the same run later collapses — it must not be credited twice.
    rerender({ over: true });
    expect(reportRun).toHaveBeenCalledTimes(1);
  });

  it('given nothing built yet, when the player leaves, then nothing is sent', async () => {
    const reportRun = vi.fn().mockResolvedValue(paid);
    const { result } = renderHook(() => useRunPayout({ over: false, ready: true, getSummary: () => summary(0), reportRun }));
    await act(() => result.current.bank());
    expect(reportRun).not.toHaveBeenCalled();
  });

  it('given the estate still loading, when the player leaves, then nothing is sent (no auth yet)', async () => {
    const reportRun = vi.fn().mockResolvedValue(paid);
    const { result } = renderHook(() => useRunPayout({ over: false, ready: false, getSummary: () => summary(3), reportRun }));
    await act(() => result.current.bank());
    expect(reportRun).not.toHaveBeenCalled();
  });

  it('given a run that ended normally, then the collapse still reports exactly once', () => {
    const reportRun = vi.fn().mockResolvedValue(paid);
    renderHook(() => useRunPayout({ over: true, ready: true, getSummary: () => summary(5), reportRun }));
    expect(reportRun).toHaveBeenCalledTimes(1);
  });

  it('given a run banked mid-run, when the estate flickers back to loading and ready, then the collapse still does not pay twice', async () => {
    const reportRun = vi.fn().mockResolvedValue(paid);
    const { result, rerender } = renderHook((p: { over: boolean; ready: boolean }) => useRunPayout({ over: p.over, ready: p.ready, getSummary: () => summary(4), reportRun }), {
      initialProps: { over: false, ready: true },
    });
    await act(() => result.current.bank());
    rerender({ over: false, ready: false });
    rerender({ over: false, ready: true });
    rerender({ over: true, ready: true });
    expect(reportRun).toHaveBeenCalledTimes(1);
  });

  it('given a finished run, when the next run starts and collapses, then that run is reported too', () => {
    const reportRun = vi.fn().mockResolvedValue(paid);
    const { rerender } = renderHook((p: { over: boolean }) => useRunPayout({ over: p.over, ready: true, getSummary: () => summary(4), reportRun }), {
      initialProps: { over: true },
    });
    rerender({ over: false });
    rerender({ over: true });
    expect(reportRun).toHaveBeenCalledTimes(2);
  });
});
