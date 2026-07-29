import { describe, it, expect } from 'vitest';
import { createBoard, placeTiles } from '../board';
import { hebrewDisplayLetter } from '../hebrewDisplay';
import type { PlacedTile } from '../types';

function tile(row: number, col: number, letter: string, id = `${letter}-${row}-${col}`): PlacedTile {
  return { row, col, letter, value: 1, isBlank: false, rackTileId: id };
}

describe('hebrewDisplayLetter', () => {
  it('returns the original letter for non-he locales', () => {
    const board = createBoard(15);
    placeTiles(board, [tile(7, 5, 'מ'), tile(7, 6, 'מ')]);
    const out = hebrewDisplayLetter({
      board,
      row: 7,
      col: 6,
      letter: 'מ',
      locale: 'en',
    });
    expect(out).toBe('מ');
  });

  it('returns the original letter when the glyph has no sofit variant', () => {
    const board = createBoard(15);
    placeTiles(board, [tile(7, 5, 'א'), tile(7, 6, 'א')]);
    const out = hebrewDisplayLetter({
      board,
      row: 7,
      col: 6,
      letter: 'א',
      locale: 'he',
    });
    expect(out).toBe('א');
  });

  it('swaps to sofit when a tile sits to the left and nothing to the right (horizontal end)', () => {
    const board = createBoard(15);
    placeTiles(board, [tile(7, 5, 'י'), tile(7, 6, 'מ')]);
    const out = hebrewDisplayLetter({
      board,
      row: 7,
      col: 6,
      letter: 'מ',
      locale: 'he',
    });
    expect(out).toBe('ם');
  });

  it('keeps regular form when another tile sits to the right (mid-word)', () => {
    const board = createBoard(15);
    placeTiles(board, [tile(7, 5, 'י'), tile(7, 6, 'מ'), tile(7, 7, 'י')]);
    const out = hebrewDisplayLetter({
      board,
      row: 7,
      col: 6,
      letter: 'מ',
      locale: 'he',
    });
    expect(out).toBe('מ');
  });

  it('keeps regular form when this tile is at start of a horizontal word', () => {
    const board = createBoard(15);
    placeTiles(board, [tile(7, 5, 'מ'), tile(7, 6, 'י')]);
    const out = hebrewDisplayLetter({
      board,
      row: 7,
      col: 5,
      letter: 'מ',
      locale: 'he',
    });
    expect(out).toBe('מ');
  });

  it('swaps to sofit at the bottom of a vertical word', () => {
    const board = createBoard(15);
    placeTiles(board, [tile(5, 7, 'י'), tile(6, 7, 'מ')]);
    const out = hebrewDisplayLetter({
      board,
      row: 6,
      col: 7,
      letter: 'מ',
      locale: 'he',
    });
    expect(out).toBe('ם');
  });

  it('treats pending placements as occupied for the rightward check', () => {
    const board = createBoard(15);
    placeTiles(board, [tile(7, 5, 'י')]);
    // Pending tile to the right of (7, 6) — so (7, 6) is *not* end-of-word.
    const pending: PlacedTile[] = [tile(7, 7, 'ל', 'pending-1')];
    const out = hebrewDisplayLetter({
      board,
      pending,
      row: 7,
      col: 6,
      letter: 'מ',
      locale: 'he',
    });
    expect(out).toBe('מ');
  });

  it('handles all five regular→sofit pairs', () => {
    const board = createBoard(15);
    const cases: Array<[string, string]> = [
      ['מ', 'ם'],
      ['נ', 'ן'],
      ['פ', 'ף'],
      ['צ', 'ץ'],
      ['כ', 'ך'],
    ];
    for (const [regular, sofit] of cases) {
      placeTiles(board, [tile(7, 5, 'י')]);
      const out = hebrewDisplayLetter({
        board,
        pending: [tile(7, 6, regular, `p-${regular}`)],
        row: 7,
        col: 6,
        letter: regular,
        locale: 'he',
      });
      expect(out, `${regular} should display as ${sofit}`).toBe(sofit);
    }
  });
});
