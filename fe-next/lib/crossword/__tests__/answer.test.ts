import { describe, it, expect } from 'vitest';
import { normalizeCell, checkCell, isSolved, displayLetter } from '../answer';
import { buildGrid } from '../grid';
import type { CrosswordPuzzle, GridLayout } from '../types';

function puzzleFrom(layout: GridLayout, locale: CrosswordPuzzle['locale']): CrosswordPuzzle {
  const { size, cells, slots } = buildGrid(layout);
  return {
    id: 'test',
    locale,
    size,
    rtl: layout.rtl,
    cells,
    slots,
    difficulty: 'easy',
    source: 'authored',
  };
}

describe('normalizeCell', () => {
  it('lowercases English', () => {
    expect(normalizeCell('A', 'en')).toBe('a');
    expect(normalizeCell(' b ', 'en')).toBe('b');
  });

  it('folds Hebrew final (sofit) forms to their regular form', () => {
    expect(normalizeCell('ך', 'he')).toBe('כ');
    expect(normalizeCell('ם', 'he')).toBe('מ');
    expect(normalizeCell('ן', 'he')).toBe('נ');
    expect(normalizeCell('ף', 'he')).toBe('פ');
    expect(normalizeCell('ץ', 'he')).toBe('צ');
  });

  it('returns empty string for empty/invalid input', () => {
    expect(normalizeCell('', 'en')).toBe('');
  });
});

describe('checkCell', () => {
  it('matches regardless of case (en)', () => {
    expect(checkCell('C', 'c', 'en')).toBe(true);
    expect(checkCell('x', 'c', 'en')).toBe(false);
  });

  it('matches a sofit-typed letter against the normalized solution (he)', () => {
    // Player types final-mem; solution stored as regular mem.
    expect(checkCell('ם', 'מ', 'he')).toBe(true);
  });

  it('empty entry is never correct', () => {
    expect(checkCell('', 'c', 'en')).toBe(false);
  });
});

describe('isSolved', () => {
  const layout: GridLayout = {
    rtl: false,
    solution: [
      ['c', 'a', 't'],
      ['a', null, null],
      ['r', null, null],
    ],
  };
  const puzzle = puzzleFrom(layout, 'en');

  it('false when incomplete', () => {
    expect(isSolved(puzzle, { '0,0': 'c' }, 'en')).toBe(false);
  });

  it('false when a filled cell is wrong', () => {
    const entries = { '0,0': 'c', '0,1': 'a', '0,2': 't', '1,0': 'x', '2,0': 'r' };
    expect(isSolved(puzzle, entries, 'en')).toBe(false);
  });

  it('true when every non-block cell matches (case-insensitive)', () => {
    const entries = { '0,0': 'C', '0,1': 'A', '0,2': 'T', '1,0': 'A', '2,0': 'R' };
    expect(isSolved(puzzle, entries, 'en')).toBe(true);
  });
});

describe('displayLetter — Hebrew sofit at word end', () => {
  it('applies final form only at the last cell of a Hebrew run', () => {
    // mem-mem run: stored regular מ both; last cell should display ם
    expect(displayLetter('מ', { isWordEnd: false }, 'he')).toBe('מ');
    expect(displayLetter('מ', { isWordEnd: true }, 'he')).toBe('ם');
  });

  it('leaves non-Hebrew untouched', () => {
    expect(displayLetter('a', { isWordEnd: true }, 'en')).toBe('a');
  });
});

describe('normalizeCell — Spanish accent folding', () => {
  // Spanish crosswords omit grid diacritics: accented input must match the folded grid letter, and
  // accented/unaccented letters must be the same cell so the sparse pool can cross-fill a 4×4.
  it('folds accented vowels to plain (es)', () => {
    expect(normalizeCell('á', 'es')).toBe('a');
    expect(normalizeCell('É', 'es')).toBe('e');
    expect(normalizeCell('í', 'es')).toBe('i');
    expect(normalizeCell('ó', 'es')).toBe('o');
    expect(normalizeCell('ú', 'es')).toBe('u');
    expect(normalizeCell('ü', 'es')).toBe('u');
  });
  it('keeps ñ distinct (it is a letter, not an accent)', () => {
    expect(normalizeCell('ñ', 'es')).toBe('ñ');
  });
  it('a player typing an accented letter matches the folded solution', () => {
    expect(checkCell('í', 'i', 'es')).toBe(true);
    expect(checkCell('Á', 'a', 'es')).toBe(true);
  });
  it('does NOT fold accents for other locales (en/he unaffected)', () => {
    expect(normalizeCell('á', 'en')).toBe('á');
  });
});
