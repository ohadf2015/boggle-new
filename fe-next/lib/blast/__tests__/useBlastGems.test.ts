import { describe, it, expect, beforeEach } from 'vitest';
import { useBlastGems } from '../useBlastGems';

describe('useBlastGems', () => {
  beforeEach(() => useBlastGems.getState().reset());

  it('starts at zero', () => {
    expect(useBlastGems.getState().gems).toBe(0);
  });

  it('accumulates gems', () => {
    useBlastGems.getState().addGems(5);
    useBlastGems.getState().addGems(3);
    expect(useBlastGems.getState().gems).toBe(8);
  });

  it('ignores non-positive add (no negative-earn exploit)', () => {
    useBlastGems.getState().addGems(-5);
    useBlastGems.getState().addGems(0);
    expect(useBlastGems.getState().gems).toBe(0);
  });

  it('spends when affordable and returns true', () => {
    useBlastGems.getState().addGems(10);
    expect(useBlastGems.getState().spendGems(4)).toBe(true);
    expect(useBlastGems.getState().gems).toBe(6);
  });

  it('rejects overspend, returns false, and does not deduct', () => {
    useBlastGems.getState().addGems(3);
    expect(useBlastGems.getState().spendGems(5)).toBe(false);
    expect(useBlastGems.getState().gems).toBe(3);
  });

  it('canAfford reflects balance', () => {
    useBlastGems.getState().addGems(7);
    expect(useBlastGems.getState().canAfford(7)).toBe(true);
    expect(useBlastGems.getState().canAfford(8)).toBe(false);
  });
});
