import { describe, it, expect } from 'vitest';
import { rollShop, SHOP_SIZE, ABILITY_CATALOG } from '../shopRoll';

describe('gems/shopRoll', () => {
  it('rolls SHOP_SIZE cards', () => {
    const cards = rollShop({ seed: 1, turnIndex: 0 });
    expect(cards).toHaveLength(SHOP_SIZE);
  });

  it('is deterministic for (seed, turnIndex)', () => {
    const a = rollShop({ seed: 5, turnIndex: 2 });
    const b = rollShop({ seed: 5, turnIndex: 2 });
    expect(a).toEqual(b);
  });

  it('different turnIndex produces different rolls (most of the time)', () => {
    const a = rollShop({ seed: 5, turnIndex: 0 });
    const b = rollShop({ seed: 5, turnIndex: 1 });
    // Allow occasional equal pulls; just assert at least one card differs.
    const same = a.every((c, i) => c.kind === b[i].kind && c.cost.color === b[i].cost.color && c.cost.rarity === b[i].cost.rarity);
    expect(same).toBe(false);
  });

  it('every rolled card kind exists in catalog', () => {
    const cards = rollShop({ seed: 7, turnIndex: 0 });
    for (const card of cards) {
      expect(ABILITY_CATALOG[card.kind]).toBeDefined();
    }
  });

  it('cards have stable per-roll ids', () => {
    const cards = rollShop({ seed: 7, turnIndex: 0 });
    const ids = new Set(cards.map((c) => c.id));
    expect(ids.size).toBe(cards.length);
  });

  it('cost color matches one of the 4 gem colors', () => {
    const cards = rollShop({ seed: 11, turnIndex: 0 });
    const valid = new Set(['amber', 'ruby', 'sapphire', 'emerald']);
    for (const card of cards) {
      expect(valid.has(card.cost.color)).toBe(true);
      expect([1, 2, 3].includes(card.cost.rarity)).toBe(true);
    }
  });
});
