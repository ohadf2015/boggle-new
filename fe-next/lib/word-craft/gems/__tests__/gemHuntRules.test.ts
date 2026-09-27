import { describe, it, expect } from 'vitest';
import {
  addToInventory,
  canTransmute,
  transmute,
  hasWinningInventory,
  collectGemsFromPlacements,
  canStillWin,
} from '../gemHuntRules';
import { emptyInventory, type GemCell } from '../types';

describe('gems/gemHuntRules', () => {
  describe('addToInventory', () => {
    it('increments the right color/rarity slot', () => {
      const inv = emptyInventory();
      const next = addToInventory(inv, { color: 'amber', rarity: 1 });
      expect(next.amber[1]).toBe(1);
      expect(next.ruby[1]).toBe(0);
      // immutable
      expect(inv.amber[1]).toBe(0);
    });
  });

  describe('canTransmute', () => {
    it('returns false when fewer than 3 of a rarity', () => {
      const inv = emptyInventory();
      inv.amber[1] = 2;
      expect(canTransmute(inv, 'amber', 1)).toBe(false);
    });
    it('returns true with 3 of a rarity', () => {
      const inv = emptyInventory();
      inv.amber[1] = 3;
      expect(canTransmute(inv, 'amber', 1)).toBe(true);
    });
    it('returns false at rarity 3 (cannot transmute crown)', () => {
      const inv = emptyInventory();
      inv.amber[3] = 5;
      expect(canTransmute(inv, 'amber', 3)).toBe(false);
    });
  });

  describe('transmute', () => {
    it('consumes 3 of rarity N, adds 1 of rarity N+1', () => {
      const inv = emptyInventory();
      inv.amber[1] = 4;
      const next = transmute(inv, 'amber', 1);
      expect(next.amber[1]).toBe(1);
      expect(next.amber[2]).toBe(1);
    });
    it('throws on illegal transmute', () => {
      const inv = emptyInventory();
      inv.amber[1] = 2;
      expect(() => transmute(inv, 'amber', 1)).toThrow();
    });
  });

  describe('hasWinningInventory', () => {
    it('returns true with ≥1 crown of all 4 colors', () => {
      const inv = emptyInventory();
      inv.amber[3] = 1;
      inv.ruby[3] = 2;
      inv.sapphire[3] = 1;
      inv.emerald[3] = 1;
      expect(hasWinningInventory(inv)).toBe(true);
    });
    it('returns false when one color is missing crown', () => {
      const inv = emptyInventory();
      inv.amber[3] = 1;
      inv.ruby[3] = 1;
      inv.sapphire[3] = 1;
      inv.emerald[3] = 0;
      expect(hasWinningInventory(inv)).toBe(false);
    });
  });

  describe('collectGemsFromPlacements', () => {
    it('returns gems whose cells were placed on this turn', () => {
      const cells: GemCell[] = [
        { row: 5, col: 5, color: 'amber', rarity: 1, id: 'g1' },
        { row: 7, col: 7, color: 'ruby', rarity: 2, id: 'g2' },
        { row: 9, col: 9, color: 'sapphire', rarity: 1, id: 'g3' },
      ];
      const placements = [
        { row: 5, col: 5 },
        { row: 7, col: 7 },
      ];
      const { collected, remaining } = collectGemsFromPlacements(cells, placements);
      expect(collected.map((c) => c.cellId).sort()).toEqual(['g1', 'g2']);
      expect(remaining.map((c) => c.id)).toEqual(['g3']);
    });
    it('returns empty when no placements hit gem cells', () => {
      const cells: GemCell[] = [{ row: 5, col: 5, color: 'amber', rarity: 1, id: 'g1' }];
      const placements = [{ row: 0, col: 0 }];
      const { collected, remaining } = collectGemsFromPlacements(cells, placements);
      expect(collected).toEqual([]);
      expect(remaining).toEqual(cells);
    });
  });

  describe('canStillWin', () => {
    it('returns true when inventory already winning', () => {
      const inv = emptyInventory();
      inv.amber[3] = 1;
      inv.ruby[3] = 1;
      inv.sapphire[3] = 1;
      inv.emerald[3] = 1;
      expect(canStillWin(inv, [])).toBe(true);
    });
    it('returns true when missing color can be reached via remaining cells', () => {
      const inv = emptyInventory();
      inv.amber[3] = 1;
      inv.ruby[3] = 1;
      inv.sapphire[3] = 1;
      // emerald missing — need a crown (3) or 3 shards or 9 chips
      const cells: GemCell[] = [{ row: 0, col: 0, color: 'emerald', rarity: 3, id: 'e1' }];
      expect(canStillWin(inv, cells)).toBe(true);
    });
    it('returns true when missing color reachable via transmute (3 chips)', () => {
      const inv = emptyInventory();
      inv.amber[3] = 1;
      inv.ruby[3] = 1;
      inv.sapphire[3] = 1;
      inv.emerald[1] = 6; // 6 chips → 2 shards (transmute) → not yet crown
      // need: 9 chips → 3 shards → 1 crown. Has 6, so transmute path falls short.
      expect(canStillWin(inv, [])).toBe(false);
    });
    it('returns true when remaining + inventory chips can be transmuted to a crown', () => {
      const inv = emptyInventory();
      inv.amber[3] = 1;
      inv.ruby[3] = 1;
      inv.sapphire[3] = 1;
      inv.emerald[1] = 6;
      // 3 more emerald chips on board → 9 total → 3 shards → 1 crown
      const cells: GemCell[] = [
        { row: 0, col: 0, color: 'emerald', rarity: 1, id: 'e1' },
        { row: 1, col: 0, color: 'emerald', rarity: 1, id: 'e2' },
        { row: 2, col: 0, color: 'emerald', rarity: 1, id: 'e3' },
      ];
      expect(canStillWin(inv, cells)).toBe(true);
    });
  });
});
