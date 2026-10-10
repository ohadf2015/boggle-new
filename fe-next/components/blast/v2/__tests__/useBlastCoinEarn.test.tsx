import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { COIN_EARNED_EVENT } from '@/utils/coinEarnedFx';
import { useBlastCoinEarn } from '../useBlastCoinEarn';

describe('useBlastCoinEarn', () => {
  afterEach(() => vi.restoreAllMocks());

  function listen() {
    const handler = vi.fn();
    window.addEventListener(COIN_EARNED_EVENT, handler);
    return { handler, stop: () => window.removeEventListener(COIN_EARNED_EVENT, handler) };
  }

  it('emits the in-level coin delta when the level total rises', () => {
    const { handler, stop } = listen();
    const { rerender } = renderHook(({ coins }) => useBlastCoinEarn(coins), { initialProps: { coins: 0 } });
    rerender({ coins: 12 });
    rerender({ coins: 30 });
    stop();
    expect(handler).toHaveBeenCalledTimes(2);
    expect((handler.mock.calls[0][0] as CustomEvent).detail.amount).toBe(12);
    expect((handler.mock.calls[1][0] as CustomEvent).detail.amount).toBe(18);
  });

  it('stays silent on mount and when the total drops back to zero at level reset', () => {
    const { handler, stop } = listen();
    const { rerender } = renderHook(({ coins }) => useBlastCoinEarn(coins), { initialProps: { coins: 40 } });
    rerender({ coins: 0 });
    stop();
    expect(handler).not.toHaveBeenCalled();
  });
});
