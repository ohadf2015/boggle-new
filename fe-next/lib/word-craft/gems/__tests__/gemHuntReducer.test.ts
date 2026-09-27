import { describe, it, expect } from 'vitest';
import { buildInitialGemHunt, gemHuntReducer } from '../gemHuntReducer';
import type { PlacedTile } from '../../types';
import type { ScoredWord } from '../../moveValidator';

function placedAt(row: number, col: number, letter: string, id: string): PlacedTile {
  return { row, col, letter, value: 1, isBlank: false, rackTileId: id };
}

describe('gems/gemHuntReducer', () => {
  it('builds a fresh state with shop, gem cells, empty inventory', () => {
    const s = buildInitialGemHunt({ seed: 1 });
    expect(s.shop.length).toBeGreaterThan(0);
    expect(s.gemCells.length).toBeGreaterThan(0);
    expect(s.outcome).toBeNull();
    expect(s.turnIndex).toBe(0);
  });

  it('PLACE_PENDING appends placement and clears selection', () => {
    const s = buildInitialGemHunt({ seed: 1 });
    const placement = placedAt(5, 5, 'A', 'r1');
    const next = gemHuntReducer({ ...s, selectedRackTileId: 'r1' }, { type: 'PLACE_PENDING', placement });
    expect(next.pendingPlacements).toHaveLength(1);
    expect(next.selectedRackTileId).toBeNull();
  });

  it('COMMIT collects gems whose cells were placed on this turn and replenishes', () => {
    const s = buildInitialGemHunt({ seed: 1 });
    const targetCell = s.gemCells[0];
    const placement = placedAt(targetCell.row, targetCell.col, 'X', 'r1');
    const words: ScoredWord[] = [{ word: 'XX', score: 10, tiles: [], direction: 'across', cells: [{ row: targetCell.row, col: targetCell.col }] }];
    const withPending = { ...s, pendingPlacements: [placement] };
    const next = gemHuntReducer(withPending, { type: 'COMMIT', words, score: 10 });
    expect(next.lastCollection).toHaveLength(1);
    expect(next.lastCollection[0].cellId).toBe(targetCell.id);
    expect(next.inventory[targetCell.color][targetCell.rarity]).toBe(1);
    expect(next.gemCells.length).toBeGreaterThanOrEqual(s.gemCells.length - 1);
  });

  it('marks outcome=won when COMMIT completes 4-crown inventory', () => {
    let s = buildInitialGemHunt({ seed: 1 });
    s = {
      ...s,
      inventory: {
        amber: { 1: 0, 2: 0, 3: 1 },
        ruby: { 1: 0, 2: 0, 3: 1 },
        sapphire: { 1: 0, 2: 0, 3: 1 },
        emerald: { 1: 0, 2: 0, 3: 0 },
      },
      gemCells: [{ row: 0, col: 0, color: 'emerald', rarity: 3, id: 'fake-crown' }],
    };
    const placement = placedAt(0, 0, 'X', 'r1');
    const words: ScoredWord[] = [{ word: 'XX', score: 5, tiles: [], direction: 'across', cells: [{ row: 0, col: 0 }] }];
    const next = gemHuntReducer({ ...s, pendingPlacements: [placement] }, { type: 'COMMIT', words, score: 5 });
    expect(next.outcome).toBe('won');
  });

  it('BUY_ABILITY deducts gem cost and moves card to pendingAbilities', () => {
    const s = buildInitialGemHunt({ seed: 1 });
    const card = s.shop[0];
    const inv = { ...s.inventory };
    inv[card.cost.color] = { ...inv[card.cost.color], [card.cost.rarity]: 1 };
    const next = gemHuntReducer({ ...s, inventory: inv }, { type: 'BUY_ABILITY', card });
    expect(next.inventory[card.cost.color][card.cost.rarity]).toBe(0);
    expect(next.pendingAbilities.map((c) => c.id)).toContain(card.id);
    expect(next.shop.find((c) => c.id === card.id)).toBeUndefined();
  });

  it('BUY_ABILITY fails when player cannot afford', () => {
    const s = buildInitialGemHunt({ seed: 1 });
    const card = s.shop[0];
    const next = gemHuntReducer(s, { type: 'BUY_ABILITY', card });
    expect(next.lastError).toBe('INSUFFICIENT_GEMS');
    expect(next.pendingAbilities).toHaveLength(0);
  });

  it('TRANSMUTE merges 3 chips into a shard and may flip outcome to won', () => {
    let s = buildInitialGemHunt({ seed: 1 });
    s = {
      ...s,
      inventory: {
        amber: { 1: 0, 2: 0, 3: 1 },
        ruby: { 1: 0, 2: 0, 3: 1 },
        sapphire: { 1: 0, 2: 0, 3: 1 },
        emerald: { 1: 0, 2: 3, 3: 0 },
      },
    };
    // Promote emerald shard → crown wins game
    const next = gemHuntReducer(s, { type: 'TRANSMUTE', color: 'emerald', rarity: 2 });
    expect(next.inventory.emerald[2]).toBe(0);
    expect(next.inventory.emerald[3]).toBe(1);
    expect(next.outcome).toBe('won');
  });

  it('post-outcome dispatches are no-ops (except RESET)', () => {
    let s = buildInitialGemHunt({ seed: 1 });
    s = { ...s, outcome: 'won' };
    const next = gemHuntReducer(s, { type: 'SELECT_RACK_TILE', id: 'foo' });
    expect(next).toBe(s);
    const reset = gemHuntReducer(s, { type: 'RESET', seed: 99, locale: 'en' });
    expect(reset.outcome).toBeNull();
    expect(reset.seed).toBe(99);
  });
});
