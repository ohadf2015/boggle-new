/**
 * Client Word Validator Tests
 * 
 * Comprehensive tests for client-side word validation logic
 */

import {
  normalizeWord,
  normalizeHebrewWord,
  normalizeSpanishWord,
  getLanguageRegex,
  validateWordLocally,
  couldBeOnBoard,
  isWordOnBoard,
} from '../clientWordValidator';

describe('normalizeWord', () => {
  it('normalizes English words to lowercase', () => {
    expect(normalizeWord('HELLO', 'en')).toBe('hello');
    expect(normalizeWord('World', 'en')).toBe('world');
  });

  it('normalizes Hebrew words (final letters)', () => {
    expect(normalizeWord('שלום', 'he')).toBe('שלומ');
    expect(normalizeWord('בית', 'he')).toBe('בית');
    expect(normalizeWord('ביתץ', 'he')).toBe('ביתצ');
    expect(normalizeWord('ביתך', 'he')).toBe('ביתכ');
    expect(normalizeWord('ביתם', 'he')).toBe('ביתמ');
  });

  it('normalizes Spanish words (accents)', () => {
    expect(normalizeWord('café', 'es')).toBe('cafe');
    expect(normalizeWord('niño', 'es')).toBe('niño');
    expect(normalizeWord('MÉXICO', 'es')).toBe('mexico');
  });

  it('handles Japanese without normalization', () => {
    expect(normalizeWord('こんにちは', 'ja')).toBe('こんにちは');
  });

  it('handles Swedish', () => {
    expect(normalizeWord('HÄLSINGBORG', 'sv')).toBe('hälsingborg');
  });
});

describe('normalizeHebrewWord', () => {
  it('converts final letters to regular letters', () => {
    expect(normalizeHebrewWord('ביתץ')).toBe('ביתצ');
    expect(normalizeHebrewWord('ביתך')).toBe('ביתכ');
    expect(normalizeHebrewWord('ביתם')).toBe('ביתמ');
  });

  it('handles mixed final and regular letters', () => {
    expect(normalizeHebrewWord('ביתך')).toBe('ביתכ');
  });
});

describe('normalizeSpanishWord', () => {
  it('removes accents from vowels', () => {
    expect(normalizeSpanishWord('café')).toBe('cafe');
    expect(normalizeSpanishWord('niño')).toBe('niño');
    expect(normalizeSpanishWord('MÉXICO')).toBe('mexico');
  });

  it('preserves ñ', () => {
    expect(normalizeSpanishWord('niño')).toBe('niño');
    expect(normalizeSpanishWord('año')).toBe('año');
  });
});

describe('getLanguageRegex', () => {
  it('returns correct regex for English', () => {
    const regex = getLanguageRegex('en');
    expect(regex.test('hello')).toBe(true);
    expect(regex.test('WORLD')).toBe(true);
    expect(regex.test('Hello123')).toBe(false);
  });

  it('returns correct regex for Hebrew', () => {
    const regex = getLanguageRegex('he');
    expect(regex.test('שלום')).toBe(true);
    expect(regex.test('hello')).toBe(false);
  });

  it('returns correct regex for Spanish', () => {
    const regex = getLanguageRegex('es');
    expect(regex.test('café')).toBe(true);
    expect(regex.test('niño')).toBe(true);
    expect(regex.test('MÉXICO')).toBe(true);
    expect(regex.test('hello')).toBe(true);
    expect(regex.test('123')).toBe(false);
    expect(regex.test('hello123')).toBe(false);
  });

  it('returns correct regex for Swedish', () => {
    const regex = getLanguageRegex('sv');
    expect(regex.test('hälsingborg')).toBe(true);
    expect(regex.test('åäö')).toBe(true);
  });
});

describe('validateWordLocally', () => {
  const mockFoundWords: Array<{ word: string; isValid?: boolean | null }> = [];

  it('rejects words shorter than minimum length', () => {
    const result = validateWordLocally('a', 'en', 2, mockFoundWords);
    expect(result.isValid).toBe(false);
    expect(result.errorKey).toBe('playerView.wordTooShortMin');
    expect(result.shouldSubmitToServer).toBe(false);
  });

  it('rejects words with invalid characters', () => {
    const result = validateWordLocally('hello123', 'en', 2, mockFoundWords);
    expect(result.isValid).toBe(false);
    expect(result.errorKey).toBe('playerView.onlyLanguageWords');
    expect(result.shouldSubmitToServer).toBe(false);
  });

  it('rejects duplicate words', () => {
    const foundWords = [{ word: 'hello', isValid: true }];
    const result = validateWordLocally('hello', 'en', 2, foundWords);
    expect(result.isValid).toBe(false);
    expect(result.errorKey).toBe('playerView.wordAlreadyFound');
    expect(result.shouldSubmitToServer).toBe(false);
  });

  it('accepts valid new words', () => {
    const result = validateWordLocally('hello', 'en', 2, mockFoundWords);
    expect(result.isValid).toBe(true);
    expect(result.shouldSubmitToServer).toBe(true);
  });

  it('handles case-insensitive duplicate detection', () => {
    const foundWords = [{ word: 'Hello', isValid: true }];
    const result = validateWordLocally('HELLO', 'en', 2, foundWords);
    expect(result.isValid).toBe(false);
    expect(result.errorKey).toBe('playerView.wordAlreadyFound');
  });

  it('handles Hebrew normalization in duplicate detection', () => {
    const foundWords = [{ word: 'בית', isValid: true }];
    const result = validateWordLocally('בית', 'he', 2, foundWords);
    expect(result.isValid).toBe(false);
    
    const foundWords2 = [{ word: 'ביתץ', isValid: true }];
    const result2 = validateWordLocally('ביתצ', 'he', 2, foundWords2);
    expect(result2.isValid).toBe(false);
  });
});

describe('couldBeOnBoard', () => {
  const testGrid = [
    ['C', 'A', 'T'],
    ['D', 'O', 'G'],
    ['B', 'A', 'T'],
  ];

  it('returns true if all letters exist in grid', () => {
    expect(couldBeOnBoard('cat', testGrid, 'en')).toBe(true);
    expect(couldBeOnBoard('dog', testGrid, 'en')).toBe(true);
  });

  it('returns false if letter is missing', () => {
    expect(couldBeOnBoard('zoo', testGrid, 'en')).toBe(false);
    expect(couldBeOnBoard('xyz', testGrid, 'en')).toBe(false);
  });

  it('handles letter count correctly', () => {
    expect(couldBeOnBoard('bat', testGrid, 'en')).toBe(true);
    expect(couldBeOnBoard('baat', testGrid, 'en')).toBe(true);
    expect(couldBeOnBoard('cat', testGrid, 'en')).toBe(true);
    expect(couldBeOnBoard('cats', testGrid, 'en')).toBe(false);
    expect(couldBeOnBoard('batt', testGrid, 'en')).toBe(true);
    
    const limitedGrid = [
      ['C', 'A', 'T'],
      ['D', 'O', 'G'],
    ];
    expect(couldBeOnBoard('baat', limitedGrid, 'en')).toBe(false);
    expect(couldBeOnBoard('cat', limitedGrid, 'en')).toBe(true);
    expect(couldBeOnBoard('dog', limitedGrid, 'en')).toBe(true);
  });

  it('returns true for null grid (optimistic)', () => {
    expect(couldBeOnBoard('hello', null, 'en')).toBe(true);
  });

  it('handles Hebrew normalization', () => {
    const hebrewGrid = [
      ['ש', 'ל', 'ו'],
      ['מ', 'ת', 'ה'],
    ];
    expect(couldBeOnBoard('שלום', hebrewGrid, 'he')).toBe(true);
  });
});

describe('isWordOnBoard', () => {
  const testGrid = [
    ['C', 'A', 'T', 'S'],
    ['D', 'O', 'G', 'S'],
    ['B', 'A', 'T', 'S'],
    ['R', 'A', 'T', 'S'],
  ];

  it('finds horizontal words', () => {
    expect(isWordOnBoard('cat', testGrid, 'en')).toBe(true);
    expect(isWordOnBoard('dog', testGrid, 'en')).toBe(true);
  });

  it('finds vertical words', () => {
    const verticalGrid = [
      ['C', 'D', 'B'],
      ['A', 'O', 'A'],
      ['T', 'G', 'T'],
    ];
    expect(isWordOnBoard('cat', verticalGrid, 'en')).toBe(true);
  });

  it('finds diagonal words', () => {
    const diagonalGrid = [
      ['C', 'X', 'X'],
      ['X', 'A', 'X'],
      ['X', 'X', 'T'],
    ];
    expect(isWordOnBoard('cat', diagonalGrid, 'en')).toBe(true);
  });

  it('rejects words not on board', () => {
    expect(isWordOnBoard('zoo', testGrid, 'en')).toBe(false);
    expect(isWordOnBoard('xyz', testGrid, 'en')).toBe(false);
  });

  it('rejects words that use same cell twice', () => {
    const smallGrid = [
      ['C', 'A'],
      ['T', 'S'],
    ];
    expect(isWordOnBoard('cat', smallGrid, 'en')).toBe(true);
    expect(isWordOnBoard('caca', smallGrid, 'en')).toBe(false);
  });

  it('handles case-insensitive matching', () => {
    expect(isWordOnBoard('CAT', testGrid, 'en')).toBe(true);
    expect(isWordOnBoard('Cat', testGrid, 'en')).toBe(true);
  });

  it('handles empty grid', () => {
    expect(isWordOnBoard('cat', [], 'en')).toBe(false);
  });

  it('handles null grid', () => {
    expect(isWordOnBoard('cat', null, 'en')).toBe(false);
  });

  it('handles Hebrew words with final letters', () => {
    const hebrewGrid = [
      ['ש', 'ל', 'ו', 'מ'],
    ];
    expect(isWordOnBoard('שלום', hebrewGrid, 'he')).toBe(true);
    
    const hebrewGrid2 = [
      ['ב', 'י', 'ת'],
    ];
    expect(isWordOnBoard('בית', hebrewGrid2, 'he')).toBe(true);
    
    const hebrewGrid3 = [
      ['ש', 'ל'],
      ['ו', 'מ'],
    ];
    expect(isWordOnBoard('שלום', hebrewGrid3, 'he')).toBe(true);
  });

  it('handles complex paths', () => {
    const complexGrid = [
      ['C', 'A', 'T'],
      ['X', 'R', 'X'],
      ['X', 'X', 'S'],
    ];
    expect(isWordOnBoard('car', complexGrid, 'en')).toBe(true);
    
    const catsGrid = [
      ['C', 'A', 'T'],
      ['X', 'X', 'S'],
    ];
    expect(isWordOnBoard('cats', catsGrid, 'en')).toBe(true);
    
    const diagonalGrid = [
      ['C', 'X', 'X'],
      ['X', 'A', 'X'],
      ['X', 'X', 'T'],
      ['X', 'X', 'S'],
    ];
    expect(isWordOnBoard('cats', diagonalGrid, 'en')).toBe(true);
  });
});

