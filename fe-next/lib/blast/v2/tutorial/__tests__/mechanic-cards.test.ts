import { describe, it, expect } from 'vitest';
import { getCardForMechanic, getAllCards, type MechanicCard } from '../mechanic-cards';

describe('mechanic-cards registry', () => {
  describe('getCardForMechanic', () => {
    it('returns card for frozenTiles with level 8', () => {
      const card = getCardForMechanic('frozenTiles');
      expect(card.key).toBe('frozenTiles');
      expect(card.level).toBe(8);
      expect(card.titleKey).toContain('frozenTiles');
      expect(card.bodyKey).toContain('frozenTiles');
    });

    it('returns card for coinOverlay with level 3', () => {
      const card = getCardForMechanic('coinOverlay');
      expect(card.key).toBe('coinOverlay');
      expect(card.level).toBe(3);
    });

    it('returns card for gemTiles with correct properties', () => {
      const card = getCardForMechanic('gemTiles');
      expect(card).toHaveProperty('key');
      expect(card).toHaveProperty('level');
      expect(card).toHaveProperty('titleKey');
      expect(card).toHaveProperty('bodyKey');
      expect(card).toHaveProperty('iconAsset');
    });
  });

  describe('getAllCards', () => {
    it('returns 12 mechanic cards', () => {
      const cards = getAllCards();
      expect(cards.length).toBe(12);
    });

    it('returns cards sorted by level', () => {
      const cards = getAllCards();
      for (let i = 1; i < cards.length; i++) {
        expect(cards[i].level).toBeGreaterThanOrEqual(cards[i - 1].level);
      }
    });

    it('includes coinOverlay, frozenTiles, and multiWordReveal', () => {
      const cards = getAllCards();
      const keys = cards.map((c) => c.key);
      expect(keys).toContain('coinOverlay');
      expect(keys).toContain('frozenTiles');
      expect(keys).toContain('multiWordReveal');
    });

    it('each card has valid structure', () => {
      const cards = getAllCards();
      cards.forEach((card: MechanicCard) => {
        expect(card.key).toBeDefined();
        expect(card.level).toBeGreaterThan(0);
        expect(card.titleKey).toMatch(/blast\.tutorial\.mechanic/);
        expect(card.bodyKey).toMatch(/blast\.tutorial\.mechanic/);
        expect(card.iconAsset).toBeDefined();
      });
    });
  });
});
