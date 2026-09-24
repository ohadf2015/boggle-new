import { describe, it, expect } from 'vitest';
import { wordCraftReducer, buildInitialState } from '../useWordCraftGame';
import { isFirstMove } from '../board';
import type { PlacedTile } from '../types';

const opener: PlacedTile[] = [...'CAT'].map((letter, k) => ({ row: 3, col: 2 + k, letter, value: 1, isBlank: false, rackTileId: `opener-${k}` }));

describe('buildInitialState initialTiles (academy Word Workshop opener)', () => {
  it('GIVEN no initialTiles THEN the board starts empty (public game unchanged)', () => {
    const s = buildInitialState({ seed: 1, locale: 'en', viewportDims: { size: 7, bagSize: 36 } });
    expect(isFirstMove(s.board)).toBe(true);
  });

  it('GIVEN initialTiles THEN they sit on the board unclaimed and the bag/racks are untouched', () => {
    const plain = buildInitialState({ seed: 1, locale: 'en', viewportDims: { size: 7, bagSize: 36 } });
    const s = buildInitialState({ seed: 1, locale: 'en', viewportDims: { size: 7, bagSize: 36 }, initialTiles: opener });
    expect(s.board.cells[3][2].tile?.letter).toBe('C');
    expect(s.board.cells[3][4].tile?.letter).toBe('T');
    expect(s.board.cells[3][3].claim ?? null).toBeNull();
    expect(isFirstMove(s.board)).toBe(false);
    expect(s.bag.tiles.length).toBe(plain.bag.tiles.length);
    expect(s.player.rack).toEqual(plain.player.rack);
    expect(s.history).toEqual([]);
  });

  it('GIVEN a RESET THEN the opener is laid again on the fresh board', () => {
    const s = buildInitialState({ seed: 1, locale: 'en', viewportDims: { size: 7, bagSize: 36 }, initialTiles: opener, lessonTargets: ['CAT'] });
    const next = wordCraftReducer(s, { type: 'RESET', seed: 2, locale: 'en', boardSize: 15, viewportDims: { size: 7, bagSize: 36 } });
    expect(next.board.cells[3][3].tile?.letter).toBe('A');
  });
});
