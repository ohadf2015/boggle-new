import { generateLootChest, type LootChest, type LootDrop } from '../lootConfig';

describe('generateLootChest', () => {
  it('always includes a gold drop with correct formula', () => {
    const chest = generateLootChest(1, 1, 2, 300, 1);
    const gold = chest.drops.find(d => d.type === 'gold');
    expect(gold).toBeDefined();
    // baseGold = 10*2 = 20, perfectBonus = 0, multiplier = 1 → 20
    expect(gold!.amount).toBe(20);
  });

  it('applies goldMultiplier', () => {
    const chest = generateLootChest(1, 1, 2, 300, 2);
    const gold = chest.drops.find(d => d.type === 'gold');
    expect(gold!.amount).toBe(40);
  });

  it('gives perfect bonus for 3-star gold', () => {
    const chest = generateLootChest(1, 1, 3, 100, 1);
    const gold = chest.drops.find(d => d.type === 'gold');
    // baseGold = 30, perfectBonus = 50, multiplier = 1 → 80
    expect(gold!.amount).toBe(80);
  });

  it('always includes XP', () => {
    const chest = generateLootChest(1, 1, 1, 100, 1);
    const xp = chest.drops.find(d => d.type === 'xp');
    expect(xp).toBeDefined();
    // 25 + 1*15 = 40
    expect(xp!.amount).toBe(40);
  });

  it('guarantees rune fragment on 3-star', () => {
    const chest = generateLootChest(1, 1, 3, 100, 1);
    const rune = chest.drops.find(d => d.type === 'runeFragment');
    expect(rune).toBeDefined();
    expect(rune!.rarity).toBe('rare');
  });

  it('does not award rune fragment on 1-star', () => {
    const chest = generateLootChest(1, 1, 1, 100, 1);
    const rune = chest.drops.find(d => d.type === 'runeFragment');
    expect(rune).toBeUndefined();
  });

  it('does not award lore scroll on boss levels (level 5)', () => {
    const chest = generateLootChest(1, 5, 3, 500, 1);
    const scroll = chest.drops.find(d => d.type === 'loreScroll');
    expect(scroll).toBeUndefined();
  });

  it('does not award lore scroll on boss levels (level 7)', () => {
    const chest = generateLootChest(1, 7, 3, 500, 1);
    const scroll = chest.drops.find(d => d.type === 'loreScroll');
    expect(scroll).toBeUndefined();
  });

  it('awards lore scroll on non-boss levels with stars >= 1', () => {
    const chest = generateLootChest(2, 3, 1, 100, 1);
    const scroll = chest.drops.find(d => d.type === 'loreScroll');
    expect(scroll).toBeDefined();
    expect(scroll!.scrollId).toBe('scroll-w2-l3');
    expect(scroll!.rarity).toBe('epic');
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
