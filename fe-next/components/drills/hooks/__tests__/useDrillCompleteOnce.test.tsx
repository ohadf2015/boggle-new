import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDrillCompleteOnce } from '../useDrillCompleteOnce';

type Result = { score: number };

describe('useDrillCompleteOnce', () => {
  it('does not fire when phase is not complete', () => {
    const onComplete = vi.fn();
    const getResults = vi.fn(() => ({ score: 10 }) as Result);

    renderHook(() => useDrillCompleteOnce('playing', getResults, onComplete));

    expect(onComplete).not.toHaveBeenCalled();
  });

  it('fires onComplete exactly once when phase becomes complete', () => {
    const onComplete = vi.fn();
    const getResults = vi.fn(() => ({ score: 42 }) as Result);

    const { rerender } = renderHook(
      ({ phase }) => useDrillCompleteOnce(phase, getResults, onComplete),
      { initialProps: { phase: 'playing' as string } },
    );

    rerender({ phase: 'complete' });

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith({ score: 42 });
  });

  it('does not re-fire when onComplete reference changes after completion', () => {
    // Reproduces the loop bug: parent recreates onComplete after coin-state update.
    const firstOnComplete = vi.fn();
    const secondOnComplete = vi.fn();
    const getResults = () => ({ score: 1 }) as Result;

    const { rerender } = renderHook(
      ({ phase, cb }: { phase: string; cb: (r: Result) => void }) =>
        useDrillCompleteOnce(phase, getResults, cb),
      { initialProps: { phase: 'complete', cb: firstOnComplete } },
    );

    expect(firstOnComplete).toHaveBeenCalledTimes(1);

    rerender({ phase: 'complete', cb: secondOnComplete });
    rerender({ phase: 'complete', cb: secondOnComplete });

    expect(firstOnComplete).toHaveBeenCalledTimes(1);
    expect(secondOnComplete).not.toHaveBeenCalled();
  });

  it('runs optional side-effect once before onComplete', () => {
    const order: string[] = [];
    const sideEffect = vi.fn(() => order.push('side'));
    const onComplete = vi.fn(() => order.push('complete'));
    const getResults = () => ({ score: 0 }) as Result;

    renderHook(() =>
      useDrillCompleteOnce('complete', getResults, onComplete, sideEffect),
    );

    expect(sideEffect).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(order).toEqual(['side', 'complete']);
  });
});
