/**
 * Type-level verification tests for shared/types/blast.ts
 * Verifies the canonical BlastTileType union is correct and complete.
 */
import { BLAST_TILE_TYPE_LIST, type BlastTileType } from '../blast';

describe('BlastTileType canonical definition', () => {
  // NOTE: intentionally no hardcoded total-count assertion. A magic number here
  // drifts every time a tile is added (and silently blocks unrelated PRs once it
  // lands red on master). The real invariants — required members present, retired
  // members absent, no duplicates — are asserted below and never go stale.
  it('is a non-empty canonical list', () => {
    expect(BLAST_TILE_TYPE_LIST.length).toBeGreaterThan(0);
  });

  it('should contain chocolate and cake (cc-mechanics 2026-05-10)', () => {
    expect(BLAST_TILE_TYPE_LIST).toContain('chocolate');
    expect(BLAST_TILE_TYPE_LIST).toContain('cake');
  });

  it('should contain mystery (seeded surprise-outcome tile)', () => {
    expect(BLAST_TILE_TYPE_LIST).toContain('mystery');
  });

  it('should contain fuse (linked pair detonation tile)', () => {
    expect(BLAST_TILE_TYPE_LIST).toContain('fuse');
  });

  it('should contain anchor (long-word length bonus)', () => {
    expect(BLAST_TILE_TYPE_LIST).toContain('anchor');
  });

  it('should include standard (not normal)', () => {
    expect(BLAST_TILE_TYPE_LIST).toContain('standard');
    expect(BLAST_TILE_TYPE_LIST).not.toContain('normal');
  });

  it('should NOT contain retired tiles (mirror, silver, wildcard)', () => {
    expect(BLAST_TILE_TYPE_LIST).not.toContain('mirror' as BlastTileType);
    expect(BLAST_TILE_TYPE_LIST).not.toContain('silver' as BlastTileType);
    expect(BLAST_TILE_TYPE_LIST).not.toContain('wildcard' as BlastTileType);
  });

  it('should contain diamond, countdown, shuffle, magma, portal, catalyst', () => {
    expect(BLAST_TILE_TYPE_LIST).toContain('diamond');
    expect(BLAST_TILE_TYPE_LIST).toContain('countdown');
    expect(BLAST_TILE_TYPE_LIST).toContain('shuffle');
    expect(BLAST_TILE_TYPE_LIST).toContain('magma');
    expect(BLAST_TILE_TYPE_LIST).toContain('portal');
    expect(BLAST_TILE_TYPE_LIST).toContain('catalyst');
  });

  // Subset guard: every documented canonical tile must be present. Adding a NEW
  // tile to the source does NOT break this (no exact-length assertion) — it only
  // fails if a documented tile is removed, which is the case worth catching.
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
      'diamond',
      'countdown',
      'shuffle',
      'magma',
      'portal',
      'catalyst',
      'crystal',
      'fuse',
      'anchor',
      'mystery',
      'chocolate',
      'cake',
      'locked',
      'key',
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
