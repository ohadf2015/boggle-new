import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useBlastUpgradeStore } from '../useBlastUpgradeStore';
import { getUpgrade, upgradeCost } from '../blastUpgradeCatalog';

const paid = () => vi.fn(async () => true);

describe('useBlastUpgradeStore', () => {
  beforeEach(() => useBlastUpgradeStore.getState().reset());

  it('buys an upgrade through the coin wallet spend and bumps its level', async () => {
    const spend = paid();
    expect(await useBlastUpgradeStore.getState().buy('extraMoves', spend)).toBe(true);
    expect(useBlastUpgradeStore.getState().levelOf('extraMoves')).toBe(1);
    expect(spend).toHaveBeenCalledWith(upgradeCost(getUpgrade('extraMoves')!, 0), 'blast_upgrade', { id: 'extraMoves', level: 1 });
  });

  it('every upgrade, including the ones gems used to buy, is paid in coins', async () => {
    for (const id of ['comboSurge', 'safetyNet'] as const) {
      const spend = paid();
      expect(await useBlastUpgradeStore.getState().buy(id, spend)).toBe(true);
      expect(spend).toHaveBeenCalledOnce();
    }
  });

  it('a refused spend leaves the level untouched', async () => {
    const spend = vi.fn(async () => false);
    expect(await useBlastUpgradeStore.getState().buy('extraMoves', spend)).toBe(false);
    expect(useBlastUpgradeStore.getState().levelOf('extraMoves')).toBe(0);
  });

  it('stops selling at maxLevel without charging', async () => {
    const def = getUpgrade('safetyNet')!;
    for (let i = 0; i < def.maxLevel; i++) await useBlastUpgradeStore.getState().buy('safetyNet', paid());
    expect(useBlastUpgradeStore.getState().levelOf('safetyNet')).toBe(def.maxLevel);
    const spend = paid();
    expect(await useBlastUpgradeStore.getState().buy('safetyNet', spend)).toBe(false);
    expect(spend).not.toHaveBeenCalled();
  });

  it('effects() reflects owned levels', async () => {
    await useBlastUpgradeStore.getState().buy('extraMoves', paid());
    expect(useBlastUpgradeStore.getState().effects().startingMovesBonus).toBeGreaterThan(0);
  });
});
