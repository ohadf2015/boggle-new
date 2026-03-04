/**
 * Type-level verification tests for shared/types/blast.ts
 * Verifies the canonical BlastTileType union is correct and complete.
 */
import { BLAST_TILE_TYPE_LIST, type BlastTileType } from '../blast';

describe('BlastTileType canonical definition', () => {
  it('should contain exactly 11 tile types', () => {
    expect(BLAST_TILE_TYPE_LIST).toHaveLength(11);
  });

  it('should include standard (not normal)', () => {
    expect(BLAST_TILE_TYPE_LIST).toContain('standard');
    expect(BLAST_TILE_TYPE_LIST).not.toContain('normal');
  });

  it('should contain all expected tile types', () => {
    const expected: BlastTileType[] = [
      'standard',
      'gold',
      'bomb',
      'rainbow',
      'ice',
      'wildcard',
      'lightning',
      'magnet',
      'prism',
      'gem',
      'frozen',
    ];
    for (const type of expected) {
      expect(BLAST_TILE_TYPE_LIST).toContain(type);
    }
  });

  it('should have no duplicate entries', () => {
    const unique = new Set(BLAST_TILE_TYPE_LIST);
    expect(unique.size).toBe(BLAST_TILE_TYPE_LIST.length);
  });
});
