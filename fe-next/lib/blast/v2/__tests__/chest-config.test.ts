import { describe, it, expect } from 'vitest';
import { tierForChestNumber, CHEST_TIERS } from '../chest-config';

describe('chest-config', () => {
  it('returns wood tier for chest 1', () => {
    const tier = tierForChestNumber(1);
    expect(tier.tier).toBe('wood');
  });

  it('returns wood tier for odd numbers like 3, 7, 9, 11, 13, 17, 19', () => {
    [3, 7, 9, 11, 13, 17, 19].forEach((n) => {
      expect(tierForChestNumber(n).tier).toBe('wood');
    });
  });

  it('returns silver tier for even numbers not divisible by 5', () => {
    [2, 4, 6, 8, 12, 14, 16, 18].forEach((n) => {
      expect(tierForChestNumber(n).tier).toBe('silver');
    });
  });

  it('returns gold tier for multiples of 5 not divisible by 10', () => {
    [5, 15].forEach((n) => {
      expect(tierForChestNumber(n).tier).toBe('gold');
    });
  });

  it('returns legendary tier for multiples of 10', () => {
    [10, 20, 30].forEach((n) => {
      expect(tierForChestNumber(n).tier).toBe('legendary');
    });
  });

  it('cycles pattern every 20 chests', () => {
    expect(tierForChestNumber(1).tier).toBe(tierForChestNumber(21).tier);
    expect(tierForChestNumber(5).tier).toBe(tierForChestNumber(25).tier);
    expect(tierForChestNumber(10).tier).toBe(tierForChestNumber(30).tier);
  });

  it('has CHEST_TIERS constant with all four tier definitions', () => {
    expect(CHEST_TIERS.wood).toBeDefined();
    expect(CHEST_TIERS.silver).toBeDefined();
    expect(CHEST_TIERS.gold).toBeDefined();
    expect(CHEST_TIERS.legendary).toBeDefined();
  });

  it('wood tier has correct coinBase and boostCount', () => {
    const wood = CHEST_TIERS.wood;
    expect(wood.coinBase).toBe(200);
    expect(wood.boostCount).toBe(0);
  });

  it('legendary tier has highest coinBase and boostCount', () => {
    const legendary = CHEST_TIERS.legendary;
    expect(legendary.coinBase).toBe(2000);
    expect(legendary.boostCount).toBe(3);
  });
});
