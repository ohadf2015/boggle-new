import {
  selectBlastTileToTeach,
  collectVisibleSpecialTypes,
  BLAST_TEACHABLE_ORDER,
} from '../blastTileFirstUse';
import type { BlastTileType } from '@/shared/types/blast';

const cell = (type: BlastTileType, isCleared = false) => ({ type, isCleared });

describe('selectBlastTileToTeach', () => {
  it('returns the first present, unseen teachable tile in order', () => {
    // bomb is earlier in order than diamond, both present + unseen → bomb wins.
    const present: BlastTileType[] = ['diamond', 'bomb'];
    expect(selectBlastTileToTeach(present, new Set())).toBe('bomb');
  });

  it('skips tiles the player has already seen', () => {
    const present: BlastTileType[] = ['bomb', 'diamond'];
    const seen = new Set<BlastTileType>(['bomb']);
    expect(selectBlastTileToTeach(present, seen)).toBe('diamond');
  });

  it('returns null when every present tile has been taught', () => {
    const present: BlastTileType[] = ['bomb', 'gold'];
    const seen = new Set<BlastTileType>(['bomb', 'gold']);
    expect(selectBlastTileToTeach(present, seen)).toBeNull();
  });

  it('returns null when no teachable special is on the board', () => {
    expect(selectBlastTileToTeach(['standard'], new Set())).toBeNull();
  });

  it('accepts a Set directly', () => {
    expect(selectBlastTileToTeach(new Set<BlastTileType>(['gold']), new Set())).toBe('gold');
  });

  it('teachable order only contains the curated core', () => {
    expect(BLAST_TEACHABLE_ORDER).toEqual(['bomb', 'gold', 'diamond']);
  });
});

describe('collectVisibleSpecialTypes', () => {
  it('collects distinct non-cleared special types, ignoring standard + cleared', () => {
    const grid = [
      [cell('standard'), cell('bomb')],
      [cell('bomb'), cell('gold', true)], // duplicate bomb + cleared coin
    ];
    const out = collectVisibleSpecialTypes(grid);
    expect([...out].sort()).toEqual(['bomb']);
  });

  it('returns an empty set for null/empty boards', () => {
    expect(collectVisibleSpecialTypes(null).size).toBe(0);
    expect(collectVisibleSpecialTypes([]).size).toBe(0);
  });
});
