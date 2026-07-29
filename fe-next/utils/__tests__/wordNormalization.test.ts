/**
 * Word Normalization Utilities Tests
 *
 * Tests for sanitization, Hebrew normalization, and other word processing
 */

import {
  sanitizeWord,
  normalizeHebrewLetter,
  normalizeHebrewWord,
  normalizeSpanishWord,
  normalizeWord,
  isValidHebrewLetter,
  filterHebrewWord,
  applyHebrewFinalLetters,
  isValidWordCharacters,
} from '@/shared/utils/wordNormalization';

describe('sanitizeWord', () => {
  describe('invisible Unicode character removal', () => {
    it('removes RTL mark (U+200F)', () => {
      const wordWithRtl = 'שמים\u200F';
      expect(sanitizeWord(wordWithRtl)).toBe('שמים');
    });

    it('removes LTR mark (U+200E)', () => {
      const wordWithLtr = 'hello\u200E';
      expect(sanitizeWord(wordWithLtr)).toBe('hello');
    });

    it('removes zero-width space (U+200B)', () => {
      const wordWithZws = 'he\u200Bllo';
      expect(sanitizeWord(wordWithZws)).toBe('hello');
    });

    it('removes zero-width non-joiner (U+200C)', () => {
      const word = 'hel\u200Clo';
      expect(sanitizeWord(word)).toBe('hello');
    });

    it('removes zero-width joiner (U+200D)', () => {
      const word = 'hel\u200Dlo';
      expect(sanitizeWord(word)).toBe('hello');
    });

    it('removes byte order mark (U+FEFF)', () => {
      const word = '\uFEFFhello';
      expect(sanitizeWord(word)).toBe('hello');
    });

    it('removes soft hyphen (U+00AD)', () => {
      const word = 'hel\u00ADlo';
      expect(sanitizeWord(word)).toBe('hello');
    });

    it('removes non-breaking space (U+00A0)', () => {
      const word = 'hello\u00A0';
      expect(sanitizeWord(word)).toBe('hello');
    });

    it('removes multiple invisible characters', () => {
      const word = '\u200F\uFEFFשמים\u200B\u200F';
      expect(sanitizeWord(word)).toBe('שמים');
    });
  });

  describe('Hebrew niqqud (vowel points) removal', () => {
    it('removes patach (U+05B7)', () => {
      const word = 'שַמים';
      expect(sanitizeWord(word)).toBe('שמים');
    });

    it('removes qamats (U+05B8)', () => {
      const word = 'שָמים';
      expect(sanitizeWord(word)).toBe('שמים');
    });

    it('removes hiriq (U+05B4)', () => {
      const word = 'שמִים';
      expect(sanitizeWord(word)).toBe('שמים');
    });

    it('removes full niqqud from word', () => {
      // שָׁמַיִם with full vocalization
      const word = 'שָׁמַיִם';
      expect(sanitizeWord(word)).toBe('שמים');
    });

    it('removes shin/sin dot (U+05C1, U+05C2)', () => {
      const word = 'שׁמים';
      expect(sanitizeWord(word)).toBe('שמים');
    });
  });

  describe('whitespace handling', () => {
    it('trims leading whitespace', () => {
      expect(sanitizeWord('   hello')).toBe('hello');
    });

    it('trims trailing whitespace', () => {
      expect(sanitizeWord('hello   ')).toBe('hello');
    });

    it('trims both leading and trailing whitespace', () => {
      expect(sanitizeWord('   hello   ')).toBe('hello');
    });
  });

  describe('language-specific filtering', () => {
    it('filters to valid Hebrew letters when language is he', () => {
      // Word with invalid characters mixed in
      const word = 'שמ.ים!';
      expect(sanitizeWord(word, 'he')).toBe('שמים');
    });

    it('keeps valid Hebrew final letters', () => {
      const word = 'שמים';
      expect(sanitizeWord(word, 'he')).toBe('שמים');
    });

    it('does not filter characters for other languages', () => {
      const word = 'hello!';
      expect(sanitizeWord(word, 'en')).toBe('hello!');
    });
  });

  describe('edge cases', () => {
    it('handles empty string', () => {
      expect(sanitizeWord('')).toBe('');
    });

    it('handles null-like input', () => {
      // @ts-expect-error - testing invalid input
      expect(sanitizeWord(null)).toBe('');
      // @ts-expect-error - testing invalid input
      expect(sanitizeWord(undefined)).toBe('');
    });

    it('handles string with only invisible characters', () => {
      expect(sanitizeWord('\u200F\u200B\uFEFF')).toBe('');
    });

    it('handles string with only whitespace', () => {
      expect(sanitizeWord('   ')).toBe('');
    });
  });
});

describe('normalizeHebrewLetter', () => {
  it('converts final kaf to regular kaf', () => {
    expect(normalizeHebrewLetter('ך')).toBe('כ');
  });

  it('converts final mem to regular mem', () => {
    expect(normalizeHebrewLetter('ם')).toBe('מ');
  });

  it('converts final nun to regular nun', () => {
    expect(normalizeHebrewLetter('ן')).toBe('נ');
  });

  it('converts final pe to regular pe', () => {
    expect(normalizeHebrewLetter('ף')).toBe('פ');
  });

  it('converts final tsadi to regular tsadi', () => {
    expect(normalizeHebrewLetter('ץ')).toBe('צ');
  });

  it('leaves regular letters unchanged', () => {
    expect(normalizeHebrewLetter('א')).toBe('א');
    expect(normalizeHebrewLetter('ב')).toBe('ב');
    expect(normalizeHebrewLetter('ש')).toBe('ש');
  });
});

describe('normalizeHebrewWord', () => {
  it('normalizes all final letters in a word', () => {
    expect(normalizeHebrewWord('שמים')).toBe('שמימ');
  });

  it('handles word with multiple final letters', () => {
    expect(normalizeHebrewWord('אמן')).toBe('אמנ');
  });

  it('returns empty string for non-string input', () => {
    // @ts-expect-error - testing invalid input
    expect(normalizeHebrewWord(null)).toBe('');
  });
});

describe('normalizeSpanishWord', () => {
  it('removes accent from á', () => {
    expect(normalizeSpanishWord('árbol')).toBe('arbol');
  });

  it('removes accent from é', () => {
    expect(normalizeSpanishWord('café')).toBe('cafe');
  });

  it('removes accent from í', () => {
    expect(normalizeSpanishWord('día')).toBe('dia');
  });

  it('removes accent from ó', () => {
    expect(normalizeSpanishWord('ratón')).toBe('raton');
  });

  it('removes accent from ú', () => {
    expect(normalizeSpanishWord('menú')).toBe('menu');
  });

  it('removes umlaut from ü', () => {
    expect(normalizeSpanishWord('pingüino')).toBe('pinguino');
  });

  it('keeps ñ unchanged', () => {
    expect(normalizeSpanishWord('niño')).toBe('niño');
  });
});

describe('normalizeWord', () => {
  it('normalizes Hebrew words', () => {
    expect(normalizeWord('שמים', 'he')).toBe('שמימ');
  });

  it('normalizes Spanish words', () => {
    expect(normalizeWord('Café', 'es')).toBe('cafe');
  });

  it('lowercases English words', () => {
    expect(normalizeWord('HELLO', 'en')).toBe('hello');
  });

  it('lowercases Swedish words', () => {
    expect(normalizeWord('HÄLSA', 'sv')).toBe('hälsa');
  });

  it('leaves Japanese words unchanged', () => {
    expect(normalizeWord('こんにちは', 'ja')).toBe('こんにちは');
  });
});

describe('isValidHebrewLetter', () => {
  it('returns true for regular Hebrew letters', () => {
    expect(isValidHebrewLetter('א')).toBe(true);
    expect(isValidHebrewLetter('ב')).toBe(true);
    expect(isValidHebrewLetter('ת')).toBe(true);
  });

  it('returns true for Hebrew final letters', () => {
    expect(isValidHebrewLetter('ך')).toBe(true);
    expect(isValidHebrewLetter('ם')).toBe(true);
    expect(isValidHebrewLetter('ן')).toBe(true);
    expect(isValidHebrewLetter('ף')).toBe(true);
    expect(isValidHebrewLetter('ץ')).toBe(true);
  });

  it('returns false for non-Hebrew characters', () => {
    expect(isValidHebrewLetter('a')).toBe(false);
    expect(isValidHebrewLetter('.')).toBe(false);
    expect(isValidHebrewLetter(' ')).toBe(false);
  });
});

describe('filterHebrewWord', () => {
  it('removes non-Hebrew characters', () => {
    expect(filterHebrewWord('שמ.ים')).toBe('שמים');
  });

  it('removes punctuation', () => {
    expect(filterHebrewWord('שמים!')).toBe('שמים');
  });

  it('keeps only valid Hebrew letters', () => {
    expect(filterHebrewWord('abc שמים 123')).toBe('שמים');
  });
});

describe('applyHebrewFinalLetters', () => {
  it('converts regular letter to final at end of word', () => {
    expect(applyHebrewFinalLetters('שמימ')).toBe('שמים');
  });

  it('converts kaf to final kaf at end', () => {
    expect(applyHebrewFinalLetters('מלכ')).toBe('מלך');
  });

  it('converts nun to final nun at end', () => {
    expect(applyHebrewFinalLetters('אמנ')).toBe('אמן');
  });

  it('leaves word unchanged if last letter cannot be final', () => {
    expect(applyHebrewFinalLetters('שלא')).toBe('שלא');
  });

  it('handles empty string', () => {
    expect(applyHebrewFinalLetters('')).toBe('');
  });
});

describe('isValidWordCharacters', () => {
  it('validates Hebrew words', () => {
    expect(isValidWordCharacters('שמים', 'he')).toBe(true);
    expect(isValidWordCharacters('hello', 'he')).toBe(false);
  });

  it('validates English words', () => {
    expect(isValidWordCharacters('hello', 'en')).toBe(true);
    expect(isValidWordCharacters('hello123', 'en')).toBe(false);
  });

  it('validates Swedish words with special characters', () => {
    expect(isValidWordCharacters('hälsa', 'sv')).toBe(true);
    expect(isValidWordCharacters('öra', 'sv')).toBe(true);
  });

  it('validates Spanish words with accents', () => {
    expect(isValidWordCharacters('niño', 'es')).toBe(true);
    expect(isValidWordCharacters('café', 'es')).toBe(true);
  });

  it('validates Japanese words', () => {
    expect(isValidWordCharacters('こんにちは', 'ja')).toBe(true);
    expect(isValidWordCharacters('日本', 'ja')).toBe(true);
  });
});

describe('null-safety (Sentry JAVASCRIPT-NEXTJS-1ME / 1MA)', () => {
  // A null/undefined board cell reached normalizeWord during a rAF tick.
  // es branch threw "Cannot read properties of null (reading 'split')" (1ME);
  // en/sv branch threw "toLowerCase is not a function" (1MA). One guard fixes both.
  describe('normalizeWord returns "" for non-string input in every language', () => {
    it.each(['en', 'he', 'sv', 'ja', 'es'] as const)('handles null for %s', (lang) => {
      expect(normalizeWord(null as unknown as string, lang)).toBe('');
    });

    it.each(['en', 'he', 'sv', 'ja', 'es'] as const)('handles undefined for %s', (lang) => {
      expect(normalizeWord(undefined as unknown as string, lang)).toBe('');
    });
  });

  describe('normalizeSpanishWord matches its Hebrew sibling guard', () => {
    it('returns "" for null instead of throwing', () => {
      expect(normalizeSpanishWord(null as unknown as string)).toBe('');
    });

    it('returns "" for undefined instead of throwing', () => {
      expect(normalizeSpanishWord(undefined as unknown as string)).toBe('');
    });

    it('still normalizes real accented words (ñ preserved, vowel accents stripped)', () => {
      expect(normalizeSpanishWord('niño')).toBe('niño');
      expect(normalizeSpanishWord('café')).toBe('cafe');
      expect(normalizeSpanishWord('ácido')).toBe('acido');
    });
  });
});
