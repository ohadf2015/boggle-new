import {
  selectBlastTileToTeach,
  collectVisibleSpecialTypes,
  BLAST_TEACHABLE_ORDER,
} from '../blastTileFirstUse';
import type { BlastTileType } from '@/shared/types/blast';

const cell = (type: BlastTileType, isCleared = false) => ({ type, isCleared });

describe('selectBlastTileToTeach', () => {
  it('returns the first present, unseen teachable tile in order', () => {
    // bomb is earlier in order than lightning, both present + unseen → bomb wins.
    const present: BlastTileType[] = ['lightning', 'bomb'];
    expect(selectBlastTileToTeach(present, new Set())).toBe('bomb');
  });

  it('skips tiles the player has already seen', () => {
    const present: BlastTileType[] = ['bomb', 'lightning'];
    const seen = new Set<BlastTileType>(['bomb']);
    expect(selectBlastTileToTeach(present, seen)).toBe('lightning');
  });

  it('returns null when every present tile has been taught', () => {
    const present: BlastTileType[] = ['bomb', 'ice'];
    const seen = new Set<BlastTileType>(['bomb', 'ice']);
    expect(selectBlastTileToTeach(present, seen)).toBeNull();
  });

  it('returns null when no teachable special is on the board', () => {
    // a retired/objective tile not in the teachable order must not be taught
    expect(selectBlastTileToTeach(['catalyst' as BlastTileType], new Set())).toBeNull();
  });

  it('accepts a Set directly', () => {
    expect(selectBlastTileToTeach(new Set<BlastTileType>(['gold']), new Set())).toBe('gold');
  });

  it('teachable order only contains the curated core', () => {
    expect(BLAST_TEACHABLE_ORDER).toEqual([
      'bomb', 'ice', 'gold', 'rainbow', 'prism', 'lightning', 'frozen', 'mystery',
    ]);
  });
});

describe('collectVisibleSpecialTypes', () => {
  it('collects distinct non-cleared special types, ignoring standard + cleared', () => {
    const grid = [
      [cell('standard'), cell('bomb')],
      [cell('bomb'), cell('ice', true)], // duplicate bomb + cleared ice
    ];
    const out = collectVisibleSpecialTypes(grid);
    expect([...out].sort()).toEqual(['bomb']);
  });

  it('returns an empty set for null/empty boards', () => {
    expect(collectVisibleSpecialTypes(null).size).toBe(0);
    expect(collectVisibleSpecialTypes([]).size).toBe(0);
  });
});
