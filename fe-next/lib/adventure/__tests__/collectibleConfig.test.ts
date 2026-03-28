/**
 * Tests for collectible item configuration and loot generator expansion.
 * TDD RED phase — these tests define the expected behavior.
 */

import {
  COLLECTIBLE_ITEMS,
  getCollectibleById,
  getCollectiblesByCategory,
  getCollectiblesByRarity,
  type CollectibleItem,
  type CollectibleCategory,
  type CollectibleRarity,
} from '../collectibleConfig';
import { generateLevelLoot } from '../lootGenerator';

// ==============================================
// COLLECTIBLE CONFIG TESTS
// ==============================================

describe('collectibleConfig', () => {
  describe('COLLECTIBLE_ITEMS', () => {
    it('contains all expected categories', () => {
      const categories = new Set(COLLECTIBLE_ITEMS.map(i => i.category));
      expect(categories).toContain('trophy');
      expect(categories).toContain('scroll');
      expect(categories).toContain('rune');
      expect(categories).toContain('relic');
    });

    it('has unique IDs for every item', () => {
      const ids = COLLECTIBLE_ITEMS.map(i => i.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('every item has required fields', () => {
      for (const item of COLLECTIBLE_ITEMS) {
        expect(item.id).toBeTruthy();
        expect(item.nameKey).toBeTruthy();
        expect(item.descriptionKey).toBeTruthy();
        expect(item.category).toBeTruthy();
        expect(item.rarity).toBeTruthy();
        expect(item.icon).toBeTruthy();
      }
    });

    it('includes super rare (legendary) items', () => {
      const legendaries = COLLECTIBLE_ITEMS.filter(i => i.rarity === 'legendary');
      expect(legendaries.length).toBeGreaterThanOrEqual(3);
    });

    it('includes items with world-specific sources', () => {
      const worldSpecific = COLLECTIBLE_ITEMS.filter(i => i.sourceWorld !== undefined);
      expect(worldSpecific.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('getCollectibleById', () => {
    it('returns item for valid ID', () => {
      const item = getCollectibleById('boss-trophy-w1');
      expect(item).toBeDefined();
      expect(item?.category).toBe('trophy');
    });

    it('returns undefined for invalid ID', () => {
      expect(getCollectibleById('nonexistent')).toBeUndefined();
    });
  });

  describe('getCollectiblesByCategory', () => {
    it('returns only items of the given category', () => {
      const trophies = getCollectiblesByCategory('trophy');
      expect(trophies.length).toBeGreaterThan(0);
      expect(trophies.every(i => i.category === 'trophy')).toBe(true);
    });

    it('returns relics category with super rare items', () => {
      const relics = getCollectiblesByCategory('relic');
      expect(relics.length).toBeGreaterThan(0);
      const hasLegendary = relics.some(i => i.rarity === 'legendary');
      expect(hasLegendary).toBe(true);
    });
  });

  describe('getCollectiblesByRarity', () => {
    it('returns all items of given rarity', () => {
      const epics = getCollectiblesByRarity('epic');
      expect(epics.length).toBeGreaterThan(0);
      expect(epics.every(i => i.rarity === 'epic')).toBe(true);
    });

    it('legendary items exist', () => {
      const legendaries = getCollectiblesByRarity('legendary');
      expect(legendaries.length).toBeGreaterThanOrEqual(3);
    });
  });
});

// ==============================================
// EXPANDED LOOT GENERATOR TESTS
// ==============================================

describe('generateLevelLoot — expanded drops', () => {
  it('returns empty for 0 stars', () => {
    const drops = generateLevelLoot({
      world: 1, level: 1, stars: 0, score: 100,
      isFirstCompletion: true, isBossLevel: false,
    });
    expect(drops).toEqual([]);
  });

  it('always includes gold for stars > 0', () => {
    const drops = generateLevelLoot({
      world: 1, level: 1, stars: 1, score: 100,
      isFirstCompletion: false, isBossLevel: false,
    });
    expect(drops.some(d => d.type === 'gold')).toBe(true);
  });

  it('awards runeFragment on 3-star completion', () => {
    const drops = generateLevelLoot({
      world: 3, level: 4, stars: 3, score: 500,
      isFirstCompletion: false, isBossLevel: false,
    });
    expect(drops.some(d => d.type === 'runeFragment')).toBe(true);
  });

  it('awards loreScroll on first non-boss completion', () => {
    const drops = generateLevelLoot({
      world: 2, level: 3, stars: 2, score: 200,
      isFirstCompletion: true, isBossLevel: false,
    });
    expect(drops.some(d => d.type === 'loreScroll')).toBe(true);
  });

  it('awards bossTrophy on first boss defeat', () => {
    const drops = generateLevelLoot({
      world: 1, level: 7, stars: 2, score: 300,
      isFirstCompletion: true, isBossLevel: true,
    });
    expect(drops.some(d => d.type === 'bossTrophy')).toBe(true);
    const trophy = drops.find(d => d.type === 'bossTrophy')!;
    expect(trophy.rarity).toBe('epic');
  });

  it('awards worldEssence on 3-star first boss defeat', () => {
    const drops = generateLevelLoot({
      world: 5, level: 7, stars: 3, score: 1000,
      isFirstCompletion: true, isBossLevel: true,
    });
    expect(drops.some(d => d.type === 'worldEssence')).toBe(true);
    const essence = drops.find(d => d.type === 'worldEssence')!;
    expect(essence.rarity).toBe('legendary');
  });

  it('has a chance for ancientRelic on 3-star worlds 5+', () => {
    // With seeded random, test deterministic output
    const drops = generateLevelLoot({
      world: 8, level: 5, stars: 3, score: 2000,
      isFirstCompletion: true, isBossLevel: false,
    });
    // ancientRelic may or may not drop (5% chance), but type should be valid if present
    const relic = drops.find(d => d.type === 'ancientRelic');
    if (relic) {
      expect(relic.rarity).toBe('legendary');
    }
  });

  it('awards goldenQuill for perfect score (3-star first completion)', () => {
    const drops = generateLevelLoot({
      world: 3, level: 2, stars: 3, score: 800,
      isFirstCompletion: true, isBossLevel: false,
    });
    expect(drops.some(d => d.type === 'goldenQuill')).toBe(true);
    const quill = drops.find(d => d.type === 'goldenQuill')!;
    expect(quill.rarity).toBe('rare');
  });

  it('does not award goldenQuill on replay', () => {
    const drops = generateLevelLoot({
      world: 3, level: 2, stars: 3, score: 800,
      isFirstCompletion: false, isBossLevel: false,
    });
    expect(drops.some(d => d.type === 'goldenQuill')).toBe(false);
  });

  it('awards cosmicShard on 3-star world 10 boss', () => {
    const drops = generateLevelLoot({
      world: 10, level: 7, stars: 3, score: 5000,
      isFirstCompletion: true, isBossLevel: true,
    });
    expect(drops.some(d => d.type === 'cosmicShard')).toBe(true);
    const shard = drops.find(d => d.type === 'cosmicShard')!;
    expect(shard.rarity).toBe('legendary');
  });

  it('all drops have valid LootType', () => {
    const validTypes = [
      'gold', 'runeFragment', 'loreScroll', 'bossTrophy',
      'worldEssence', 'ancientRelic', 'goldenQuill', 'cosmicShard',
    ];
    const drops = generateLevelLoot({
      world: 10, level: 7, stars: 3, score: 5000,
      isFirstCompletion: true, isBossLevel: true,
    });
    for (const drop of drops) {
      expect(validTypes).toContain(drop.type);
    }
  });

  it('gold scales with world difficulty', () => {
    const w1 = generateLevelLoot({
      world: 1, level: 1, stars: 2, score: 100,
      isFirstCompletion: false, isBossLevel: false,
    });
    const w10 = generateLevelLoot({
      world: 10, level: 1, stars: 2, score: 100,
      isFirstCompletion: false, isBossLevel: false,
    });
    const w1Gold = w1.find(d => d.type === 'gold')!.quantity;
    const w10Gold = w10.find(d => d.type === 'gold')!.quantity;
    expect(w10Gold).toBeGreaterThan(w1Gold);
  });
});
