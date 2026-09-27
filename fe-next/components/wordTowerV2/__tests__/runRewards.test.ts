import { useCallback } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { type ChestRoll, type RunSummary, runCoins } from '@/lib/wordTowerV2/estate';
import { type RunState, createRun } from '@/lib/wordTowerV2/run';
import { useRunPayout } from '../rewards/useRunPayout';
import { useRunRewards } from '../rewards/useRunRewards';

const land = (run: RunState, over: Partial<RunState>): RunState => ({ ...run, floors: run.floors + 1, ...over });

const chest = (): ChestRoll => ({ tier: 'rare', coins: 120, shields: 0, bricks: 1, blueprints: 0 });

describe('useRunRewards', () => {
  it('given a landed floor, when paid, then the coins match the server formula exactly', () => {
    let run = createRun(1);
    const { result, rerender } = renderHook((props: { run: RunState }) => useRunRewards({ run: props.run, heightM: 3 }), {
      initialProps: { run },
    });
    run = land(run, { combo: 1 });
    rerender({ run });
    const summary: RunSummary = { floors: 1, perfects: 1, bestCombo: 0, crates: 0, heightM: 3 };
    expect(result.current.coins).toBe(runCoins(summary) - runCoins({ ...summary, floors: 0, perfects: 0 }));
    expect(result.current.perfects).toBe(1);
    expect(result.current.flights).toHaveLength(1);
  });

  it('given a perfect landing, when it pays, then the payout carries the streak it landed on', () => {
    let run = createRun(1);
    const onPayout = vi.fn();
    const { rerender } = renderHook((p: { run: RunState }) => useRunRewards({ run: p.run, heightM: 2, onPayout }), {
      initialProps: { run },
    });
    run = land(run, { combo: 3 });
    rerender({ run });
    expect(onPayout).toHaveBeenCalledWith(expect.any(Number), false, 3);
  });

  it('given a broken streak, when the next floor lands, then it is not counted as a perfect', () => {
    let run = createRun(1);
    const { result, rerender } = renderHook((props: { run: RunState }) => useRunRewards({ run: props.run, heightM: 1 }), {
      initialProps: { run },
    });
    run = land(run, { combo: 1 });
    rerender({ run });
    run = land(run, { combo: 0 });
    rerender({ run });
    expect(result.current.perfects).toBe(1);
    expect(result.current.summary.floors).toBe(2);
  });

  it('given a vault perk, when a floor lands, then the payout is bigger', () => {
    const run = createRun(1);
    const paid = (coinMult: number) => {
      const { result, rerender } = renderHook((p: { run: RunState }) => useRunRewards({ run: p.run, heightM: 1, coinMult }), {
        initialProps: { run },
      });
      rerender({ run: land(run, { combo: 1 }) });
      return result.current.coins;
    };
    expect(paid(1.5)).toBeGreaterThan(paid(1));
  });

  it('given the fifth floor, when it lands, then a milestone fires once', () => {
    let run = createRun(1);
    const { result, rerender } = renderHook((p: { run: RunState }) => useRunRewards({ run: p.run, heightM: 10 }), {
      initialProps: { run },
    });
    for (let i = 0; i < 5; i += 1) {
      run = land(run, { combo: 0 });
      rerender({ run });
    }
    expect(result.current.milestone?.floors).toBe(5);
    act(() => result.current.clearMilestone());
    run = land(run, { combo: 0 });
    rerender({ run });
    expect(result.current.milestone).toBeNull();
  });

  it('given a restart, when the run rewinds, then the counter starts from zero again', () => {
    let run = createRun(1);
    const { result, rerender } = renderHook((p: { run: RunState }) => useRunRewards({ run: p.run, heightM: 4 }), {
      initialProps: { run },
    });
    run = land(run, { combo: 1 });
    rerender({ run });
    expect(result.current.coins).toBeGreaterThan(0);
    rerender({ run: createRun(2) });
    expect(result.current.coins).toBe(0);
    expect(result.current.flights).toHaveLength(0);
  });
});

describe('useRunPayout', () => {
  const summary: RunSummary = { floors: 6, perfects: 2, bestCombo: 2, crates: 1, heightM: 18 };

  it('given a finished run, when the estate is ready, then it banks the run once and only once', async () => {
    const reportRun = vi.fn().mockResolvedValue({ coins: 190, chest: chest() });
    const { result, rerender } = renderHook(
      (p: { over: boolean }) => useRunPayout({ over: p.over, ready: true, getSummary: () => summary, reportRun }),
      { initialProps: { over: false } },
    );
    rerender({ over: true });
    await waitFor(() => expect(result.current.payout?.coins).toBe(190));
    rerender({ over: true });
    rerender({ over: true });
    expect(reportRun).toHaveBeenCalledTimes(1);
    expect(reportRun).toHaveBeenCalledWith(summary);
  });

  it('given the estate still loading, when the run ends, then nothing is banked yet', async () => {
    const reportRun = vi.fn().mockResolvedValue({ coins: 1, chest: chest() });
    const { result, rerender } = renderHook(
      (p: { ready: boolean }) => useRunPayout({ over: true, ready: p.ready, getSummary: () => summary, reportRun }),
      { initialProps: { ready: false } },
    );
    expect(reportRun).not.toHaveBeenCalled();
    rerender({ ready: true });
    await waitFor(() => expect(result.current.payout).not.toBeNull());
    expect(reportRun).toHaveBeenCalledTimes(1);
  });

  it('given a failed report, when it resolves, then there is no chest to reveal', async () => {
    const reportRun = vi.fn().mockResolvedValue(null);
    const { result } = renderHook(() => useRunPayout({ over: true, ready: true, getSummary: () => summary, reportRun }));
    await waitFor(() => expect(result.current.waiting).toBe(false));
    expect(result.current.payout).toBeNull();
  });

  it('given a new run, when it ends too, then it is banked again', async () => {
    const reportRun = vi.fn().mockResolvedValue({ coins: 50, chest: chest() });
    const { rerender } = renderHook(
      (p: { over: boolean }) => useRunPayout({ over: p.over, ready: true, getSummary: () => summary, reportRun }),
      { initialProps: { over: true } },
    );
    await waitFor(() => expect(reportRun).toHaveBeenCalledTimes(1));
    rerender({ over: false });
    rerender({ over: true });
    await waitFor(() => expect(reportRun).toHaveBeenCalledTimes(2));
  });
});

describe('the run summary the server is sent', () => {
  it('given the last landing and the collapse in ONE commit, when banked, then the final floor is counted', async () => {
    const reportRun = vi.fn().mockResolvedValue({ coins: 10, chest: chest() });
    // The same order as the game screen: rewards first, then the payout report.
    const { rerender } = renderHook(
      (p: { run: RunState; over: boolean }) => {
        const rewards = useRunRewards({ run: p.run, heightM: 30 });
        const getSummary = useCallback(() => rewards.getSummary(30), [rewards]);
        return useRunPayout({ over: p.over, ready: true, getSummary, reportRun });
      },
      { initialProps: { run: createRun(1), over: false } },
    );
    let run = createRun(1);
    for (let i = 0; i < 3; i += 1) {
      run = land(run, { combo: i + 1 });
      rerender({ run, over: false });
    }
    // The floor that kills the tower: the landing and `over` arrive together.
    run = land(run, { combo: 4 });
    rerender({ run, over: true });
    await waitFor(() => expect(reportRun).toHaveBeenCalledTimes(1));
    expect(reportRun.mock.calls[0][0]).toMatchObject({ floors: 4, perfects: 4 });
  });
});
