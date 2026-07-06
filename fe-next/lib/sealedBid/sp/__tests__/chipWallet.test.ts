import { describe, it, expect } from 'vitest';
import { initWallet, clampStake, applyDelta, cashOutCoins, START_CHIPS, MIN_STAKE } from '../chipWallet';

describe('chipWallet', () => {
  it('inits with START_CHIPS, not busted', () => {
    expect(initWallet()).toEqual({ chips: START_CHIPS, busted: false });
  });
  it('clampStake floors at MIN_STAKE and caps at balance', () => {
    const w = initWallet(30);
    expect(clampStake(w, 0)).toBe(MIN_STAKE);
    expect(clampStake(w, 500)).toBe(30);
    expect(clampStake(w, 20)).toBe(20);
  });
  it('applyDelta adds winnings', () => {
    expect(applyDelta(initWallet(50), 25)).toEqual({ chips: 75, busted: false });
  });
  it('applyDelta never goes below 0 and marks busted at 0', () => {
    expect(applyDelta(initWallet(20), -50)).toEqual({ chips: 0, busted: true });
    expect(applyDelta(initWallet(20), -20)).toEqual({ chips: 0, busted: true });
  });
  it('cashOutCoins floors chips/CHIPS_PER_COIN', () => {
    expect(cashOutCoins(95)).toBe(9);
    expect(cashOutCoins(9)).toBe(0);
  });
});
