import { describe, it, expect } from 'vitest';
import { previewScore } from '../scorePreview';
import { createBoard } from '../../board';
import type { PlacedTile } from '../../types';

const t = (rackTileId: string, row: number, col: number, letter: string, value: number): PlacedTile => ({
  rackTileId,
  row,
  col,
  letter,
  value,
});

describe('previewScore', () => {
  it('returns null for empty placements', () => {
    const board = createBoard(15);
    expect(previewScore(board, [])).toBeNull();
  });

  it('returns score + tier for a valid linear placement covering centre', () => {
    const board = createBoard(15);
    // CAT placed across centre row 7.
    const placements: PlacedTile[] = [
      t('1', 7, 6, 'C', 3),
      t('2', 7, 7, 'A', 1),
      t('3', 7, 8, 'T', 1),
    ];
    const p = previewScore(board, placements);
    expect(p).not.toBeNull();
    expect(p!.score).toBeGreaterThan(0);
    // Centre cell is a premium → tier promotes from soft to nice.
    expect(['soft', 'nice']).toContain(p!.tier);
    expect(p!.bingoReady).toBe(false);
  });

  it('flags bingoReady when seven tiles are placed', () => {
    const board = createBoard(15);
    const placements: PlacedTile[] = [
      t('1', 7, 4, 'A', 1),
      t('2', 7, 5, 'B', 3),
      t('3', 7, 6, 'C', 3),
      t('4', 7, 7, 'D', 2),
      t('5', 7, 8, 'E', 1),
      t('6', 7, 9, 'F', 4),
      t('7', 7, 10, 'G', 2),
    ];
    const p = previewScore(board, placements);
    expect(p).not.toBeNull();
    expect(p!.bingoReady).toBe(true);
    expect(p!.tier).toBe('bingo');
  });

  it('returns null for an off-board placement', () => {
    const board = createBoard(15);
    expect(previewScore(board, [t('1', 99, 99, 'A', 1)])).toBeNull();
  });
});
