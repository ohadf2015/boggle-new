import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const spendCoins = vi.fn();
vi.mock('@/contexts/CoinContext', () => ({ useCoinsFromContext: () => ({ canAfford: () => true, spendCoins }) }));
vi.mock('@/hooks/useHasRealAdProvider', () => ({ useHasRealAdProvider: () => true }));

import { useSurvivalExtraLife } from '../useSurvivalExtraLife';

function setup() {
  const restore = vi.fn();
  const hook = renderHook(() => useSurvivalExtraLife({ practice: false }));
  hook.result.current.restoreRef.current = restore;
  return { ...hook, restore };
}

describe('useSurvivalExtraLife', () => {
  beforeEach(() => spendCoins.mockReset());

  it('given a double tap on the coin button, when the first spend is still pending, then coins are charged once', async () => {
    let settle: (ok: boolean) => void = () => {};
    spendCoins.mockReturnValue(new Promise((r) => { settle = r; }));
    const { result, restore } = setup();
    act(() => { void result.current.onCoinRestore(); void result.current.onCoinRestore(); });
    expect(result.current.coinPending).toBe(true);
    await act(async () => { settle(true); });
    expect(spendCoins).toHaveBeenCalledTimes(1);
    expect(restore).toHaveBeenCalledTimes(1);
  });

  it('given the life was already restored by an ad, when the coin path fires, then nothing is charged', async () => {
    const { result, restore } = setup();
    act(() => result.current.onAdRestore());
    await act(async () => { await result.current.onCoinRestore(); });
    act(() => result.current.onAdRestore());
    expect(spendCoins).not.toHaveBeenCalled();
    expect(restore).toHaveBeenCalledTimes(1);
  });

  it('given a failed spend, when it settles, then the button is usable again', async () => {
    spendCoins.mockResolvedValue(false);
    const { result, restore } = setup();
    await act(async () => { await result.current.onCoinRestore(); });
    expect(result.current.coinPending).toBe(false);
    expect(restore).not.toHaveBeenCalled();
  });
});
