import { generateLevelLoot, type LootDrop } from '../lootGenerator';

describe('lootGenerator', () => {
  describe('generateLevelLoot', () => {
    it('should always include gold for completed levels', () => {
      const loot = generateLevelLoot({ world: 1, level: 1, stars: 1, score: 200, isFirstCompletion: true, isBossLevel: false });
      const goldDrop = loot.find(d => d.type === 'gold');
      expect(goldDrop).toBeDefined();
      expect(goldDrop!.quantity).toBeGreaterThan(0);
    });

    it('should award more gold for higher stars', () => {
      const loot1 = generateLevelLoot({ world: 1, level: 1, stars: 1, score: 100, isFirstCompletion: true, isBossLevel: false });
      const loot3 = generateLevelLoot({ world: 1, level: 1, stars: 3, score: 100, isFirstCompletion: true, isBossLevel: false });
      const gold1 = loot1.find(d => d.type === 'gold')!.quantity;
      const gold3 = loot3.find(d => d.type === 'gold')!.quantity;
      expect(gold3).toBeGreaterThan(gold1);
    });

    it('should award rune fragment only for 3-star completion', () => {
      const loot2 = generateLevelLoot({ world: 1, level: 1, stars: 2, score: 200, isFirstCompletion: true, isBossLevel: false });
      const loot3 = generateLevelLoot({ world: 1, level: 1, stars: 3, score: 200, isFirstCompletion: true, isBossLevel: false });
      expect(loot2.find(d => d.type === 'runeFragment')).toBeUndefined();
      expect(loot3.find(d => d.type === 'runeFragment')).toBeDefined();
    });

    it('should award lore scroll on first completion of non-boss levels', () => {
      const first = generateLevelLoot({ world: 1, level: 1, stars: 1, score: 100, isFirstCompletion: true, isBossLevel: false });
      const repeat = generateLevelLoot({ world: 1, level: 1, stars: 1, score: 100, isFirstCompletion: false, isBossLevel: false });
      expect(first.find(d => d.type === 'loreScroll')).toBeDefined();
      expect(repeat.find(d => d.type === 'loreScroll')).toBeUndefined();
    });

    it('should not award lore scroll for boss levels', () => {
      const loot = generateLevelLoot({ world: 1, level: 7, stars: 3, score: 500, isFirstCompletion: true, isBossLevel: true });
      expect(loot.find(d => d.type === 'loreScroll')).toBeUndefined();
    });

    it('should award boss trophy on first boss defeat', () => {
      const loot = generateLevelLoot({ world: 1, level: 7, stars: 2, score: 500, isFirstCompletion: true, isBossLevel: true });
      expect(loot.find(d => d.type === 'bossTrophy')).toBeDefined();
    });

    it('should not award boss trophy on repeat boss defeat', () => {
      const loot = generateLevelLoot({ world: 1, level: 7, stars: 2, score: 500, isFirstCompletion: false, isBossLevel: true });
      expect(loot.find(d => d.type === 'bossTrophy')).toBeUndefined();
    });

    it('should return no loot for 0 stars', () => {
      const loot = generateLevelLoot({ world: 1, level: 1, stars: 0, score: 50, isFirstCompletion: false, isBossLevel: false });
      expect(loot).toHaveLength(0);
    });

    it('should scale gold with world difficulty', () => {
      const w1 = generateLevelLoot({ world: 1, level: 1, stars: 2, score: 200, isFirstCompletion: true, isBossLevel: false });
      const w10 = generateLevelLoot({ world: 10, level: 1, stars: 2, score: 200, isFirstCompletion: true, isBossLevel: false });
      const gold1 = w1.find(d => d.type === 'gold')!.quantity;
      const gold10 = w10.find(d => d.type === 'gold')!.quantity;
      expect(gold10).toBeGreaterThan(gold1);
    });

    it('should have valid rarity on all drops', () => {
      const loot = generateLevelLoot({ world: 5, level: 3, stars: 3, score: 500, isFirstCompletion: true, isBossLevel: false });
      for (const drop of loot) {
        expect(['common', 'rare', 'epic']).toContain(drop.rarity);
      }
    });
  });
});
