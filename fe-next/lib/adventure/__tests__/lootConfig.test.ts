import { generateLootChest, type LootChest, type LootDrop } from '../lootConfig';

describe('generateLootChest', () => {
  it('always includes a gold drop with world-scaled formula', () => {
    const chest = generateLootChest(1, 1, 2, 300, 1);
    const gold = chest.drops.find(d => d.type === 'gold');
    expect(gold).toBeDefined();
    // baseGold = (10 + 1*3) * 2 = 26, perfectBonus = 0, multiplier = 1 → 26
    expect(gold!.amount).toBe(26);
  });

  it('applies goldMultiplier', () => {
    const chest = generateLootChest(1, 1, 2, 300, 2);
    const gold = chest.drops.find(d => d.type === 'gold');
    // (10 + 3) * 2 * 2 = 52
    expect(gold!.amount).toBe(52);
  });

  it('gives perfect bonus for 3-star gold', () => {
    const chest = generateLootChest(1, 1, 3, 100, 1);
    const gold = chest.drops.find(d => d.type === 'gold');
    // baseGold = (10+3)*3 = 39, perfectBonus = 50, multiplier = 1 → 89
    expect(gold!.amount).toBe(89);
  });

  it('gold scales significantly with world number', () => {
    const w1Gold = generateLootChest(1, 1, 3, 100, 1).drops.find(d => d.type === 'gold')!.amount;
    const w10Gold = generateLootChest(10, 1, 3, 100, 1).drops.find(d => d.type === 'gold')!.amount;
    // W1: (10+3)*3+50 = 89, W10: (10+30)*3+50 = 170
    expect(w10Gold).toBeGreaterThan(w1Gold * 1.5);
  });

  it('always includes XP', () => {
    const chest = generateLootChest(1, 1, 1, 100, 1);
    const xp = chest.drops.find(d => d.type === 'xp');
    expect(xp).toBeDefined();
    // 25 + 1*15 = 40
    expect(xp!.amount).toBe(40);
  });

  it('guarantees bonus gold on 3-star', () => {
    const chest = generateLootChest(1, 1, 3, 100, 1);
    const bonus = chest.drops.find(d => d.type === 'bonusGold');
    expect(bonus).toBeDefined();
    expect(bonus!.rarity).toBe('rare');
    // World 1 * 15 * 1 multiplier = 15
    expect(bonus!.amount).toBe(15);
  });

  it('does not award bonus gold on 1-star', () => {
    const chest = generateLootChest(1, 1, 1, 100, 1);
    const bonus = chest.drops.find(d => d.type === 'bonusGold');
    expect(bonus).toBeUndefined();
  });

  it('awards boss trophy gold on boss levels with 3 stars', () => {
    const chest = generateLootChest(3, 7, 3, 500, 1);
    const trophy = chest.drops.filter(d => d.type === 'bonusGold');
    // Should have both bonus gold (rare) and trophy gold (epic)
    expect(trophy.length).toBe(2);
    expect(trophy.some(d => d.rarity === 'epic')).toBe(true);
  });

  it('does not award boss trophy on non-boss levels', () => {
    const chest = generateLootChest(3, 3, 3, 500, 1);
    const epic = chest.drops.find(d => d.rarity === 'epic');
    expect(epic).toBeUndefined();
  });

  it('does not award boss trophy on level 5 (only level 7 is boss)', () => {
    const chest = generateLootChest(3, 5, 3, 500, 1);
    const epic = chest.drops.find(d => d.rarity === 'epic');
    expect(epic).toBeUndefined();
  });

  it('awards boss trophy only on level 7 (the actual boss level)', () => {
    for (let lvl = 1; lvl <= 7; lvl++) {
      const chest = generateLootChest(3, lvl, 3, 500, 1);
      const hasEpic = chest.drops.some(d => d.rarity === 'epic');
      if (lvl === 7) {
        expect(hasEpic).toBe(true);
      } else {
        expect(hasEpic).toBe(false);
      }
    }
  });

  it('bonus gold scales with world number', () => {
    const w1 = generateLootChest(1, 1, 3, 100, 1);
    const w5 = generateLootChest(5, 1, 3, 100, 1);
    const w1Bonus = w1.drops.find(d => d.type === 'bonusGold')!.amount;
    const w5Bonus = w5.drops.find(d => d.type === 'bonusGold')!.amount;
    expect(w5Bonus).toBeGreaterThan(w1Bonus);
  });

  it('maps chest tier to 3-star → golden', () => {
    expect(generateLootChest(1, 1, 3, 100, 1).chestTier).toBe('golden');
  });

  it('maps chest tier to 2-star → silver', () => {
    expect(generateLootChest(1, 1, 2, 100, 1).chestTier).toBe('silver');
  });

  it('maps chest tier to 1-star → wooden', () => {
    expect(generateLootChest(1, 1, 1, 100, 1).chestTier).toBe('wooden');
  });

  it('all drops have a nameKey', () => {
    const chest = generateLootChest(3, 2, 3, 500, 1);
    for (const drop of chest.drops) {
      expect(drop.nameKey).toBeTruthy();
    }
  });
});
