import { describe, it, expect } from 'vitest';
import { parseLetters, findAnagramsFromLetters, getLetterCounts } from '../lib/anagramLogic';

describe('Anagram Logic', () => {
  describe('parseLetters', () => {
    it('normalizes uppercase to lowercase', () => {
      expect(parseLetters('ABC')).toBe('abc');
    });

    it('normalizes mixed case', () => {
      expect(parseLetters('AbC')).toBe('abc');
    });

    it('strips non-letter characters', () => {
      // 'ab1cd' → 'abcd' (4 letters, valid)
      expect(parseLetters('ab1cd')).toBe('abcd');
    });

    it('strips spaces and non-letters', () => {
      // 'ab cd' → 'abcd' (4 letters, valid)
      expect(parseLetters('ab cd')).toBe('abcd');
    });

    it('rejects too-short input (< 2 letters)', () => {
      expect(parseLetters('a')).toBeNull();
    });

    it('rejects too-long input (> 10 letters)', () => {
      expect(parseLetters('abcdefghijk')).toBeNull();
    });

    it('rejects too many of one letter (> 4 of same letter)', () => {
      expect(parseLetters('aaaaa')).toBeNull();
    });

    it('allows exactly 2 letters', () => {
      expect(parseLetters('ab')).toBe('ab');
    });

    it('allows exactly 10 letters', () => {
      expect(parseLetters('abcdefghij')).toBe('abcdefghij');
    });

    it('allows 4 of the same letter', () => {
      expect(parseLetters('aaaa')).toBe('aaaa');
    });

    it('allows reasonable duplicates like aa, ee', () => {
      expect(parseLetters('aabbcc')).toBe('aabbcc');
    });

    it('normalizes to sorted form for consistency', () => {
      const result = parseLetters('CBA');
      expect(result).toBeDefined();
      expect(result?.split('').sort().join('')).toBe('abc');
    });
  });

  describe('getLetterCounts', () => {
    it('counts letters correctly', () => {
      expect(getLetterCounts('aab')).toEqual({ a: 2, b: 1 });
    });

    it('handles single letter', () => {
      expect(getLetterCounts('a')).toEqual({ a: 1 });
    });

    it('handles all same letters', () => {
      expect(getLetterCounts('aaaa')).toEqual({ a: 4 });
    });
  });

  describe('findAnagramsFromLetters', () => {
    const mockDictionary = ['cat', 'act', 'a', 'at', 'ca', 'tac', 'dog', 'cats'];

    it('returns empty array for empty input', () => {
      const result = findAnagramsFromLetters('', mockDictionary);
      expect(result).toEqual([]);
    });

    it('finds simple anagrams', () => {
      const result = findAnagramsFromLetters('cat', mockDictionary);
      expect(result).toContain('cat');
      expect(result).toContain('act');
      expect(result).toContain('tac');
    });

    it('respects letter counts — does not return words needing extra letters', () => {
      // "cat" has c:1 a:1 t:1, so "cats" (needs s) should not be included
      const result = findAnagramsFromLetters('cat', mockDictionary);
      expect(result).not.toContain('cats');
    });

    it('filters out words longer than input', () => {
      const result = findAnagramsFromLetters('at', mockDictionary);
      expect(result).not.toContain('cat');
    });

    it('sorts results by length descending, then alphabetically', () => {
      const result = findAnagramsFromLetters('cat', mockDictionary);
      // Sort manually to verify
      const sorted = result.slice().sort((a, b) => b.length - a.length || a.localeCompare(b));
      expect(result).toEqual(sorted);
    });

    it('excludes 1-letter words', () => {
      const result = findAnagramsFromLetters('cat', mockDictionary);
      expect(result).not.toContain('a');
    });

    it('includes 2-letter words', () => {
      const result = findAnagramsFromLetters('cat', mockDictionary);
      // 'at' is valid (2 letters, can form from 'cat')
      expect(result).toContain('at');
    });

    it('caps results at 300 words', () => {
      const largeDictionary = Array.from({ length: 500 }, () => 'a'.repeat(2));
      const result = findAnagramsFromLetters('aaaaaaaaaa', largeDictionary);
      expect(result.length).toBeLessThanOrEqual(300);
    });

    it('returns anagrams of 5-letter input correctly', () => {
      const dict = ['stone', 'tones', 'notes', 'seton', 'onset', 'ones', 'dog'];
      const result = findAnagramsFromLetters('stone', dict);
      expect(result).toContain('stone');
      expect(result).toContain('tones');
      expect(result).toContain('notes');
      expect(result).not.toContain('dog');
    });
  });
});
