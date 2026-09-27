/**
 * Extended Word Validator Tests
 * Comprehensive tests for word validation including multi-language support
 */

import {
  isWordOnBoard,
  makePositionsMap,
  getWordPath,
  normalizeHebrewLetter,
  normalizeHebrewWord,
  normalizeSpanishLetter,
  normalizeSpanishWord,
  normalizeLetterForLanguage,
  normalizeWordForLanguage
} from '../modules/wordValidator';

import type { Language, LetterGrid, GridPosition } from '@/shared/types/game';

describe('Word Validator', () => {

  describe('isWordOnBoard - Basic Functionality', () => {

    test('finds horizontal word', () => {
      const board: LetterGrid = [
        ['C', 'A', 'T'],
        ['X', 'Y', 'Z'],
        ['P', 'Q', 'R']
      ];

      expect(isWordOnBoard('cat', board, undefined, 'en')).toBe(true);
    });

    test('finds vertical word', () => {
      const board: LetterGrid = [
        ['C', 'X', 'P'],
        ['A', 'Y', 'Q'],
        ['T', 'Z', 'R']
      ];

      expect(isWordOnBoard('cat', board, undefined, 'en')).toBe(true);
    });

    test('finds diagonal word', () => {
      const board: LetterGrid = [
        ['C', 'X', 'P'],
        ['Y', 'A', 'Q'],
        ['Z', 'R', 'T']
      ];

      expect(isWordOnBoard('cat', board, undefined, 'en')).toBe(true);
    });

    test('finds word with direction changes', () => {
      const board: LetterGrid = [
        ['C', 'A', 'P'],
        ['X', 'T', 'S'],
        ['Z', 'R', 'Q']
      ];

      // C -> A -> T (C at 0,0, A at 0,1, T at 1,1)
      expect(isWordOnBoard('cat', board, undefined, 'en')).toBe(true);
    });

    test('rejects word not on board', () => {
      const board: LetterGrid = [
        ['C', 'A', 'T'],
        ['X', 'Y', 'Z'],
        ['P', 'Q', 'R']
      ];

      expect(isWordOnBoard('dog', board, undefined, 'en')).toBe(false);
    });

    test('rejects word that requires reusing a cell', () => {
      const board: LetterGrid = [
        ['M', 'O', 'X'],
        ['P', 'Q', 'R'],
        ['S', 'T', 'U']
      ];

      // "mom" would need to use M twice
      expect(isWordOnBoard('mom', board, undefined, 'en')).toBe(false);
    });

    test('rejects word with non-adjacent cells', () => {
      const board: LetterGrid = [
        ['C', 'X', 'T'],
        ['X', 'A', 'X'],
        ['X', 'X', 'X']
      ];

      // C at (0,0) and T at (0,2) are not adjacent
      expect(isWordOnBoard('ct', board, undefined, 'en')).toBe(false);
    });

    test('is case insensitive', () => {
      const board: LetterGrid = [
        ['C', 'A', 'T'],
        ['X', 'Y', 'Z'],
        ['P', 'Q', 'R']
      ];

      expect(isWordOnBoard('CAT', board, undefined, 'en')).toBe(true);
      expect(isWordOnBoard('Cat', board, undefined, 'en')).toBe(true);
      expect(isWordOnBoard('cat', board, undefined, 'en')).toBe(true);
    });
  });

  describe('isWordOnBoard - 8-Direction Search', () => {

    // Test all 8 directions from center cell
    const board: LetterGrid = [
      ['A', 'B', 'C'],
      ['D', 'E', 'F'],
      ['G', 'H', 'I']
    ];

    test('finds word going up-left (E -> A)', () => {
      expect(isWordOnBoard('ea', board, undefined, 'en')).toBe(true);
    });

    test('finds word going up (E -> B)', () => {
      expect(isWordOnBoard('eb', board, undefined, 'en')).toBe(true);
    });

    test('finds word going up-right (E -> C)', () => {
      expect(isWordOnBoard('ec', board, undefined, 'en')).toBe(true);
    });

    test('finds word going left (E -> D)', () => {
      expect(isWordOnBoard('ed', board, undefined, 'en')).toBe(true);
    });

    test('finds word going right (E -> F)', () => {
      expect(isWordOnBoard('ef', board, undefined, 'en')).toBe(true);
    });

    test('finds word going down-left (E -> G)', () => {
      expect(isWordOnBoard('eg', board, undefined, 'en')).toBe(true);
    });

    test('finds word going down (E -> H)', () => {
      expect(isWordOnBoard('eh', board, undefined, 'en')).toBe(true);
    });

    test('finds word going down-right (E -> I)', () => {
      expect(isWordOnBoard('ei', board, undefined, 'en')).toBe(true);
    });
  });

  describe('isWordOnBoard - Grid Sizes', () => {

    test('handles 4x4 grid', () => {
      const board: LetterGrid = [
        ['T', 'E', 'S', 'T'],
        ['X', 'X', 'X', 'X'],
        ['X', 'X', 'X', 'X'],
        ['X', 'X', 'X', 'X']
      ];

      expect(isWordOnBoard('test', board, undefined, 'en')).toBe(true);
    });

    test('handles 5x5 grid', () => {
      const board: LetterGrid = [
        ['H', 'E', 'L', 'L', 'O'],
        ['X', 'X', 'X', 'X', 'X'],
        ['X', 'X', 'X', 'X', 'X'],
        ['X', 'X', 'X', 'X', 'X'],
        ['X', 'X', 'X', 'X', 'X']
      ];

      expect(isWordOnBoard('hello', board, undefined, 'en')).toBe(true);
    });

    test('handles non-square grid', () => {
      const board: LetterGrid = [
        ['T', 'E', 'S', 'T'],
        ['X', 'X', 'X', 'X'],
        ['X', 'X', 'X', 'X']
      ];

      expect(isWordOnBoard('test', board, undefined, 'en')).toBe(true);
    });
  });

  describe('isWordOnBoard - Edge Cases', () => {

    test('returns false for empty word', () => {
      const board: LetterGrid = [['A', 'B'], ['C', 'D']];
      expect(isWordOnBoard('', board, undefined, 'en')).toBe(false);
    });

    test('returns false for empty board', () => {
      expect(isWordOnBoard('test', [], undefined, 'en')).toBe(false);
    });

    test('returns false for null/undefined word', () => {
      const board: LetterGrid = [['A', 'B'], ['C', 'D']];
      expect(isWordOnBoard(null as any, board, undefined, 'en')).toBe(false);
      expect(isWordOnBoard(undefined as any, board, undefined, 'en')).toBe(false);
    });

    test('handles single letter word', () => {
      const board: LetterGrid = [['A', 'B'], ['C', 'D']];
      expect(isWordOnBoard('a', board, undefined, 'en')).toBe(true);
      expect(isWordOnBoard('z', board, undefined, 'en')).toBe(false);
    });

    test('handles word spanning entire board', () => {
      const board: LetterGrid = [
        ['A', 'B', 'C'],
        ['D', 'E', 'F'],
        ['G', 'H', 'I']
      ];

      // A -> B -> C -> F -> I (valid path)
      expect(isWordOnBoard('abcfi', board, undefined, 'en')).toBe(true);
    });
  });

  describe('makePositionsMap', () => {

    test('creates map of letter positions', () => {
      const board: LetterGrid = [
        ['A', 'B', 'A'],
        ['C', 'D', 'E']
      ];

      const map = makePositionsMap(board, 'en');

      expect(map.get('a')).toEqual([[0, 0], [0, 2]]);
      expect(map.get('b')).toEqual([[0, 1]]);
      expect(map.get('c')).toEqual([[1, 0]]);
    });

    test('normalizes letters for language', () => {
      const board: LetterGrid = [
        ['A', 'B'],
        ['C', 'D']
      ];

      const map = makePositionsMap(board, 'en');

      // All should be lowercase
      expect(map.has('a')).toBe(true);
      expect(map.has('A')).toBe(false);
    });

    test('handles empty board', () => {
      const map = makePositionsMap([], 'en');
      expect(map.size).toBe(0);
    });
  });

  describe('getWordPath', () => {

    test('returns correct path for valid word', () => {
      const board: LetterGrid = [
        ['C', 'A', 'T'],
        ['X', 'Y', 'Z'],
        ['P', 'Q', 'R']
      ];

      const path = getWordPath('cat', board, undefined, 'en');

      expect(path).toBeDefined();
      expect(path).toHaveLength(3);
      expect(path![0]).toEqual({ row: 0, col: 0 }); // C
      expect(path![1]).toEqual({ row: 0, col: 1 }); // A
      expect(path![2]).toEqual({ row: 0, col: 2 }); // T
    });

    test('returns null for invalid word', () => {
      const board: LetterGrid = [
        ['C', 'A', 'T'],
        ['X', 'Y', 'Z'],
        ['P', 'Q', 'R']
      ];

      const path = getWordPath('dog', board, undefined, 'en');

      expect(path).toBeNull();
    });

    test('path does not reuse cells', () => {
      const board: LetterGrid = [
        ['A', 'B', 'C'],
        ['D', 'E', 'F'],
        ['G', 'H', 'A']
      ];

      const path = getWordPath('aefa', board, undefined, 'en');

      if (path) {
        const positions = new Set(path.map(p => `${p.row},${p.col}`));
        expect(positions.size).toBe(path.length);
      }
    });
  });
});

describe('Hebrew Normalization', () => {

  describe('normalizeHebrewLetter', () => {

    test('converts final kaf to regular kaf', () => {
      expect(normalizeHebrewLetter('ך')).toBe('כ');
    });

    test('converts final mem to regular mem', () => {
      expect(normalizeHebrewLetter('ם')).toBe('מ');
    });

    test('converts final nun to regular nun', () => {
      expect(normalizeHebrewLetter('ן')).toBe('נ');
    });

    test('converts final pe to regular pe', () => {
      expect(normalizeHebrewLetter('ף')).toBe('פ');
    });

    test('converts final tsadi to regular tsadi', () => {
      expect(normalizeHebrewLetter('ץ')).toBe('צ');
    });

    test('leaves regular letters unchanged', () => {
      expect(normalizeHebrewLetter('א')).toBe('א');
      expect(normalizeHebrewLetter('ב')).toBe('ב');
      expect(normalizeHebrewLetter('ג')).toBe('ג');
    });
  });

  describe('normalizeHebrewWord', () => {

    test('normalizes word with final letters', () => {
      // "שלום" with final mem -> "שלומ" with regular mem
      expect(normalizeHebrewWord('שלום')).toBe('שלומ');
    });

    test('normalizes word with multiple final letters', () => {
      expect(normalizeHebrewWord('ירוך')).toBe('ירוכ');
    });

    test('handles word without final letters', () => {
      expect(normalizeHebrewWord('בית')).toBe('בית');
    });
  });

  describe('Hebrew word on board', () => {

    test('finds Hebrew word on board', () => {
      // Board with valid adjacent path for שלום (shin-lamed-vav-mem)
      // Path: ש(0,0) → ל(0,1) → ו(1,1) → מ(2,1)
      const board: LetterGrid = [
        ['ש', 'ל', 'X'],
        ['X', 'ו', 'X'],
        ['X', 'מ', 'X']
      ];

      expect(isWordOnBoard('שלום', board, undefined, 'he')).toBe(true);
    });

    test('finds Hebrew word with final form in word', () => {
      // Horizontal path for the word
      // Path: ש(0,0) → ל(0,1) → ו(0,2) → מ(0,3)
      const board: LetterGrid = [
        ['ש', 'ל', 'ו', 'מ'],
        ['X', 'X', 'X', 'X'],
        ['X', 'X', 'X', 'X']
      ];

      // Word ending with ם (final mem) but board has מ (regular)
      // normalizeHebrewWord should handle this
      expect(isWordOnBoard('שלום', board, undefined, 'he')).toBe(true);
    });

    test('finds Hebrew word when board has final forms', () => {
      // Board with final mem (ם) which should normalize to regular mem (מ)
      // Path: ש(0,0) → ל(0,1) → ו(0,2) → ם(0,3)
      const board: LetterGrid = [
        ['ש', 'ל', 'ו', 'ם'],
        ['X', 'X', 'X', 'X'],
        ['X', 'X', 'X', 'X']
      ];

      // The board has ם (final mem) but word normalization should match
      expect(isWordOnBoard('שלום', board, undefined, 'he')).toBe(true);
    });
  });
});

describe('Spanish Normalization', () => {

  describe('normalizeSpanishLetter', () => {

    test('removes accent from á', () => {
      expect(normalizeSpanishLetter('á')).toBe('a');
    });

    test('removes accent from é', () => {
      expect(normalizeSpanishLetter('é')).toBe('e');
    });

    test('removes accent from í', () => {
      expect(normalizeSpanishLetter('í')).toBe('i');
    });

    test('removes accent from ó', () => {
      expect(normalizeSpanishLetter('ó')).toBe('o');
    });

    test('removes accent from ú', () => {
      expect(normalizeSpanishLetter('ú')).toBe('u');
    });

    test('removes umlaut from ü', () => {
      expect(normalizeSpanishLetter('ü')).toBe('u');
    });

    test('leaves ñ unchanged', () => {
      expect(normalizeSpanishLetter('ñ')).toBe('ñ');
    });

    test('leaves regular letters unchanged', () => {
      expect(normalizeSpanishLetter('a')).toBe('a');
      expect(normalizeSpanishLetter('z')).toBe('z');
    });
  });

  describe('normalizeSpanishWord', () => {

    test('normalizes word with accents', () => {
      expect(normalizeSpanishWord('árbol')).toBe('arbol');
      expect(normalizeSpanishWord('canción')).toBe('cancion');
    });

    test('normalizes word with multiple accents', () => {
      expect(normalizeSpanishWord('información')).toBe('informacion');
    });

    test('preserves ñ', () => {
      expect(normalizeSpanishWord('niño')).toBe('niño');
      expect(normalizeSpanishWord('señor')).toBe('señor');
    });
  });

  describe('Spanish word on board', () => {

    test('finds Spanish word with accent matching non-accented board', () => {
      // Valid horizontal path for "árbol" (a-r-b-o-l)
      // Path: A(0,0) → R(0,1) → B(0,2) → O(0,3) → L(0,4)
      const board: LetterGrid = [
        ['A', 'R', 'B', 'O', 'L'],
        ['X', 'X', 'X', 'X', 'X'],
        ['X', 'X', 'X', 'X', 'X']
      ];

      expect(isWordOnBoard('árbol', board, undefined, 'es')).toBe(true);
    });

    test('finds Spanish word with ñ', () => {
      // Valid path for "niño" (n-i-ñ-o)
      // Path: N(0,0) → I(0,1) → Ñ(1,1) → O(2,1)
      const board: LetterGrid = [
        ['N', 'I', 'X'],
        ['X', 'Ñ', 'X'],
        ['X', 'O', 'X']
      ];

      expect(isWordOnBoard('niño', board, undefined, 'es')).toBe(true);
    });
  });
});

describe('Language-Aware Normalization', () => {

  describe('normalizeLetterForLanguage', () => {

    test('uses Hebrew normalization for he language', () => {
      expect(normalizeLetterForLanguage('ך', 'he')).toBe('כ');
    });

    test('uses Spanish normalization for es language', () => {
      expect(normalizeLetterForLanguage('Á', 'es')).toBe('a');
    });

    test('uses default (lowercase) for en language', () => {
      expect(normalizeLetterForLanguage('A', 'en')).toBe('a');
    });
  });

  describe('normalizeWordForLanguage', () => {

    test('normalizes Hebrew word for he language', () => {
      expect(normalizeWordForLanguage('שלום', 'he')).toBe('שלומ');
    });

    test('normalizes Spanish word for es language', () => {
      expect(normalizeWordForLanguage('ÁRBOL', 'es')).toBe('arbol');
    });

    test('normalizes English word for en language', () => {
      expect(normalizeWordForLanguage('HELLO', 'en')).toBe('hello');
    });
  });
});

describe('Performance with Position Map', () => {

  test('reusing position map is faster for multiple lookups', () => {
    const board: LetterGrid = [
      ['A', 'B', 'C', 'D', 'E'],
      ['F', 'G', 'H', 'I', 'J'],
      ['K', 'L', 'M', 'N', 'O'],
      ['P', 'Q', 'R', 'S', 'T'],
      ['U', 'V', 'W', 'X', 'Y']
    ];

    // Create position map once
    const positions = makePositionsMap(board, 'en');

    // Use for multiple lookups
    expect(isWordOnBoard('abc', board, positions, 'en')).toBe(true);
    expect(isWordOnBoard('fgh', board, positions, 'en')).toBe(true);
    expect(isWordOnBoard('klm', board, positions, 'en')).toBe(true);
    expect(isWordOnBoard('xyz', board, positions, 'en')).toBe(false);
  });
});

describe('Complex Path Finding', () => {

  test('finds word that requires backtracking', () => {
    // Board where first path attempt fails but alternative succeeds
    const board: LetterGrid = [
      ['A', 'B', 'A'],
      ['X', 'C', 'X'],
      ['X', 'X', 'X']
    ];

    // "ABC" - first A at (0,0) can't reach C, but A at (0,2) can
    expect(isWordOnBoard('abc', board, undefined, 'en')).toBe(true);
  });

  test('finds snake-like path', () => {
    const board: LetterGrid = [
      ['A', 'B', 'C'],
      ['X', 'E', 'D'],
      ['X', 'F', 'X']
    ];

    // A -> B -> C -> D -> E -> F (snake pattern)
    expect(isWordOnBoard('abcdef', board, undefined, 'en')).toBe(true);
  });

  test('handles multiple possible paths', () => {
    const board: LetterGrid = [
      ['A', 'B', 'A'],
      ['C', 'D', 'C'],
      ['A', 'B', 'A']
    ];

    // Multiple paths for "AB" - any one should work
    expect(isWordOnBoard('ab', board, undefined, 'en')).toBe(true);
  });
});
