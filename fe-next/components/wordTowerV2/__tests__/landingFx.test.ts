import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLandingFx } from '../rewards/useLandingFx';

/**
 * The payout and the pixel it was paid at arrive from two different clocks
 * (React commit, then the canvas frame). These pin the pairing contract.
 */
describe('useLandingFx', () => {
  it('given a payout armed then a point reported, when read, then one impact carries both', () => {
    const { result } = renderHook(() => useLandingFx());
    act(() => {
      result.current.arm(42, false);
      result.current.report({ x: 120, y: 300, quality: 'perfect' });
    });
    expect(result.current.impacts).toHaveLength(1);
    expect(result.current.impacts[0]).toMatchObject({ x: 120, y: 300, quality: 'perfect', amount: 42, crate: false });
  });

  it('given a streak, when the payout arms, then the burst carries the multiplier it was paid at', () => {
    const { result } = renderHook(() => useLandingFx());
    act(() => {
      result.current.arm(50, false, 4);
      result.current.report({ x: 1, y: 2, quality: 'perfect' });
    });
    expect(result.current.impacts[0]).toMatchObject({ amount: 50, combo: 4 });
  });

  it('given a landing that paid nothing, when reported, then it still bursts with a zero payout', () => {
    const { result } = renderHook(() => useLandingFx());
    act(() => result.current.report({ x: 10, y: 20, quality: 'miss' }));
    expect(result.current.impacts[0]).toMatchObject({ amount: 0, crate: false, quality: 'miss' });
  });

  it('given one armed payout, when two points are reported, then the second cannot claim it again', () => {
    const { result } = renderHook(() => useLandingFx());
    act(() => {
      result.current.arm(30, true);
      result.current.report({ x: 1, y: 1, quality: 'good' });
      result.current.report({ x: 2, y: 2, quality: 'good' });
    });
    expect(result.current.impacts.map((i) => i.amount)).toEqual([30, 0]);
    expect(result.current.impacts[0].crate).toBe(true);
    expect(result.current.impacts[1].crate).toBe(false);
  });

  it('given a fast stack, when many land, then only the newest bursts are kept and keys stay unique', () => {
    const { result } = renderHook(() => useLandingFx());
    act(() => {
      for (let i = 0; i < 6; i += 1) result.current.report({ x: i, y: i, quality: 'good' });
    });
    expect(result.current.impacts).toHaveLength(3);
    expect(new Set(result.current.impacts.map((i) => i.key)).size).toBe(3);
    expect(result.current.impacts.at(-1)?.x).toBe(5);
  });

  /**
   * The React commit that computes the payout and the canvas frame that knows
   * the pixel race each other — observed live, the frame won and the `+N` never
   * rendered. Either order must end with the same burst.
   */
  describe('when the canvas frame beats the payout commit', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('given a point reported first, when the payout arms just after, then it joins that burst', () => {
      const { result } = renderHook(() => useLandingFx());
      act(() => result.current.report({ x: 5, y: 6, quality: 'perfect' }));
      expect(result.current.impacts[0].amount).toBe(0);
      act(() => {
        vi.advanceTimersByTime(40);
        result.current.arm(17, true, 2);
      });
      expect(result.current.impacts).toHaveLength(1);
      expect(result.current.impacts[0]).toMatchObject({ x: 5, y: 6, amount: 17, crate: true, combo: 2 });
    });

    it('given a payout that arrives far too late, when it arms, then it waits for the NEXT landing', () => {
      const { result } = renderHook(() => useLandingFx());
      act(() => result.current.report({ x: 5, y: 6, quality: 'good' }));
      act(() => {
        vi.advanceTimersByTime(5000);
        result.current.arm(9, false);
      });
      expect(result.current.impacts[0].amount).toBe(0);
      act(() => result.current.report({ x: 7, y: 8, quality: 'good' }));
      expect(result.current.impacts[1]).toMatchObject({ x: 7, amount: 9 });
    });

    it('given a burst already paid, when a second payout arms, then it does not overwrite it', () => {
      const { result } = renderHook(() => useLandingFx());
      act(() => {
        result.current.arm(11, false);
        result.current.report({ x: 1, y: 1, quality: 'good' });
      });
      act(() => result.current.arm(99, true));
      expect(result.current.impacts[0].amount).toBe(11);
      act(() => result.current.report({ x: 2, y: 2, quality: 'good' }));
      expect(result.current.impacts[1].amount).toBe(99);
    });
  });

  it('given a finished burst, when cleared, then it leaves and the others stay', () => {
    const { result } = renderHook(() => useLandingFx());
    act(() => {
      result.current.report({ x: 1, y: 1, quality: 'good' });
      result.current.report({ x: 2, y: 2, quality: 'good' });
    });
    const first = result.current.impacts[0].key;
    act(() => result.current.clear(first));
    expect(result.current.impacts.map((i) => i.x)).toEqual([2]);
  });
});
