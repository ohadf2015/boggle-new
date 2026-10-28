import { describe, it, expect } from 'vitest';
import {
  BLAST_TILE_TYPE_LIST,
  BLAST_COMBO_TYPES,
  normalizeBlastTileType,
  normalizeBlastTileState,
  type BlastTileState,
} from '../blast';

describe('Blast tile roster', () => {
  it('is exactly standard, coin, bomb and diamond', () => {
    expect([...BLAST_TILE_TYPE_LIST].sort()).toEqual(['bomb', 'diamond', 'gold', 'standard']);
  });

  it('only has combos built from bombs and coins', () => {
    expect([...BLAST_COMBO_TYPES].sort()).toEqual(['bomb_bomb', 'gold_special', 'triple_special']);
  });
});

describe('normalizeBlastTileType', () => {
  it('keeps live types', () => {
    for (const t of BLAST_TILE_TYPE_LIST) expect(normalizeBlastTileType(t)).toBe(t);
  });

  it('turns retired or garbage types into standard', () => {
    for (const t of ['ice', 'rainbow', 'frozen', 'cake', 'locked', '', null, undefined, 3]) {
      expect(normalizeBlastTileType(t)).toBe('standard');
    }
  });
});

describe('normalizeBlastTileState', () => {
  it('drops fields from retired mechanics and resets multi-hit counters', () => {
    const legacy = {
      uid: 'u1', row: 1, col: 2, type: 'frozen', isCleared: false, activationEffect: null,
      hitsRemaining: 2, innerType: 'bomb', isThawed: false, countdown: 3, jellyLayers: 2, colorTag: 'pink',
    } as unknown as BlastTileState;
    expect(normalizeBlastTileState(legacy)).toEqual({
      uid: 'u1', row: 1, col: 2, type: 'standard', isCleared: false, activationEffect: null,
      hitsRemaining: 0, colorTag: 'pink',
    });
  });
});
