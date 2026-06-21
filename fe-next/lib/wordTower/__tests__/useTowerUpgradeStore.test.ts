/**
 * Word Tower — upgrade store glue (Phase 5). Verifies buy() reads the live coin
 * balance, spends through coinManager, and commits the level only on a real spend.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

let balance = 0;
vi.mock('@/utils/coinManager', () => ({
  getCoins: () => balance,
  spendCoins: (amount: number) => {
    if (balance < amount) return false;
    balance -= amount;
    return true;
  },
}));

import { useTowerUpgradeStore } from '../useTowerUpgradeStore';
import { upgradeCost, UPGRADE_DEFS } from '../upgrades';

beforeEach(() => {
  balance = 0;
  useTowerUpgradeStore.getState().reset();
});

describe('useTowerUpgradeStore.buy', () => {
  it('buys a level and deducts the cost from coinManager', () => {
    balance = 10_000;
    const cost = upgradeCost('windbreak', 0);
    const ok = useTowerUpgradeStore.getState().buy('windbreak');
    expect(ok).toBe(true);
    expect(useTowerUpgradeStore.getState().levelOf('windbreak')).toBe(1);
    expect(balance).toBe(10_000 - cost);
  });

  it('refuses (and spends nothing) when the player is broke', () => {
    balance = 5;
    const ok = useTowerUpgradeStore.getState().buy('masterArchitect');
    expect(ok).toBe(false);
    expect(useTowerUpgradeStore.getState().levelOf('masterArchitect')).toBe(0);
    expect(balance).toBe(5);
  });

  it('refuses to exceed max level', () => {
    balance = 10_000_000;
    const id = 'reinforcedCore';
    for (let i = 0; i < UPGRADE_DEFS[id].maxLevel; i++) {
      expect(useTowerUpgradeStore.getState().buy(id)).toBe(true);
    }
    expect(useTowerUpgradeStore.getState().buy(id)).toBe(false);
    expect(useTowerUpgradeStore.getState().levelOf(id)).toBe(UPGRADE_DEFS[id].maxLevel);
  });

  it('effects() reflects purchased levels', () => {
    balance = 10_000;
    useTowerUpgradeStore.getState().buy('masterArchitect');
    expect(useTowerUpgradeStore.getState().effects().rewardMult).toBeGreaterThan(1);
  });
});
