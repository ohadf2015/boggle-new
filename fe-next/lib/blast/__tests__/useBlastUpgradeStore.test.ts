import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

vi.mock('@/utils/coinManager', () => ({
  getCoins: vi.fn(() => 100000),
  spendCoins: vi.fn(() => true),
}));

import { useBlastUpgradeStore } from '../useBlastUpgradeStore';
import { useBlastGems } from '../useBlastGems';
import { getUpgrade } from '../blastUpgradeCatalog';
import * as coinManager from '@/utils/coinManager';

describe('useBlastUpgradeStore', () => {
  beforeEach(() => {
    useBlastUpgradeStore.getState().reset();
    useBlastGems.getState().reset();
    vi.clearAllMocks();
    (coinManager.getCoins as Mock).mockReturnValue(100000);
    (coinManager.spendCoins as Mock).mockReturnValue(true);
  });

  it('buys a coin-priced upgrade when affordable and bumps its level', () => {
    expect(useBlastUpgradeStore.getState().buy('extraMoves')).toBe(true);
    expect(useBlastUpgradeStore.getState().levelOf('extraMoves')).toBe(1);
    expect(coinManager.spendCoins).toHaveBeenCalledOnce();
  });

  it('refuses a coin upgrade when the balance is too low (no level change)', () => {
    (coinManager.getCoins as Mock).mockReturnValue(0);
    expect(useBlastUpgradeStore.getState().buy('extraMoves')).toBe(false);
    expect(useBlastUpgradeStore.getState().levelOf('extraMoves')).toBe(0);
    expect(coinManager.spendCoins).not.toHaveBeenCalled();
  });

  it('buys a gem-priced upgrade from the gem wallet', () => {
    useBlastGems.getState().addGems(100);
    expect(useBlastUpgradeStore.getState().buy('comboSurge')).toBe(true);
    expect(useBlastUpgradeStore.getState().levelOf('comboSurge')).toBe(1);
    expect(useBlastGems.getState().gems).toBeLessThan(100);
    // Gem purchases must NOT touch the coin balance.
    expect(coinManager.spendCoins).not.toHaveBeenCalled();
  });

  it('refuses a gem upgrade when gems are short', () => {
    expect(useBlastUpgradeStore.getState().buy('comboSurge')).toBe(false);
    expect(useBlastUpgradeStore.getState().levelOf('comboSurge')).toBe(0);
  });

  it('stops selling at maxLevel', () => {
    useBlastGems.getState().addGems(1_000_000);
    const def = getUpgrade('safetyNet')!;
    for (let i = 0; i < def.maxLevel; i++) useBlastUpgradeStore.getState().buy('safetyNet');
    expect(useBlastUpgradeStore.getState().levelOf('safetyNet')).toBe(def.maxLevel);
    expect(useBlastUpgradeStore.getState().buy('safetyNet')).toBe(false);
  });

  it('effects() reflects owned levels', () => {
    useBlastUpgradeStore.getState().buy('extraMoves');
    expect(useBlastUpgradeStore.getState().effects().startingMovesBonus).toBeGreaterThan(0);
  });
});
