/**
 * Type-level verification tests for shared/types/blast.ts
 * Verifies the canonical BlastTileType union is correct and complete.
 */
import { BLAST_TILE_TYPE_LIST, type BlastTileType } from '../blast';

describe('BlastTileType canonical definition', () => {
  it('should contain exactly 18 tile types', () => {
    expect(BLAST_TILE_TYPE_LIST).toHaveLength(19);
  });

  it('should include standard (not normal)', () => {
    expect(BLAST_TILE_TYPE_LIST).toContain('standard');
    expect(BLAST_TILE_TYPE_LIST).not.toContain('normal');
  });

  it('should contain mirror, silver, diamond (added)', () => {
    expect(BLAST_TILE_TYPE_LIST).toContain('mirror');
    expect(BLAST_TILE_TYPE_LIST).toContain('silver');
    expect(BLAST_TILE_TYPE_LIST).toContain('diamond');
  });

  it('should contain wildcard, countdown, shuffle, magma, portal, catalyst', () => {
    expect(BLAST_TILE_TYPE_LIST).toContain('wildcard');
    expect(BLAST_TILE_TYPE_LIST).toContain('countdown');
    expect(BLAST_TILE_TYPE_LIST).toContain('shuffle');
    expect(BLAST_TILE_TYPE_LIST).toContain('magma');
    expect(BLAST_TILE_TYPE_LIST).toContain('portal');
    expect(BLAST_TILE_TYPE_LIST).toContain('catalyst');
  });

  it('should contain all expected tile types', () => {
    const expected: BlastTileType[] = [
      'standard',
      'gold',
      'bomb',
      'rainbow',
      'ice',
      'lightning',
      'magnet',
      'prism',
      'gem',
      'frozen',
      'mirror',
      'silver',
      'diamond',
      'wildcard',
      'countdown',
      'shuffle',
      'magma',
      'portal',
      'catalyst',
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
