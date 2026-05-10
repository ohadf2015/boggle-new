import { describe, it, expect } from 'vitest';
import { BLAST_TILE_TYPE_LIST, type BlastTileState } from '../blast';

describe('BLAST_TILE_TYPE_LIST', () => {
  it('includes chocolate', () => {
    expect(BLAST_TILE_TYPE_LIST).toContain('chocolate');
  });
  it('includes cake', () => {
    expect(BLAST_TILE_TYPE_LIST).toContain('cake');
  });
});

describe('BlastTileState cc-mechanic fields', () => {
  it('accepts jellyLayers, cakeHp, cakeAnchorUid', () => {
    const s: BlastTileState = {
      uid: 'u1', row: 0, col: 0, type: 'standard',
      isCleared: false, activationEffect: null, hitsRemaining: 1,
      jellyLayers: 2, cakeHp: 5, cakeAnchorUid: 'cake-1',
    };
    expect(s.jellyLayers).toBe(2);
    expect(s.cakeHp).toBe(5);
    expect(s.cakeAnchorUid).toBe('cake-1');
  });
});
