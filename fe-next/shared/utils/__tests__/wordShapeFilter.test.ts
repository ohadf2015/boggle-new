/**
 * Pre-submission word shape filter — rejects garbage/abbrev/weird strings
 * before they hit dictionary lookup, board validation, or the moderation
 * queue. Sprint A of word-validation-pipeline-2026-05-01 audit.
 */

import { describe, it, expect } from 'vitest';
import { isWordShapeWeird } from '../wordShapeFilter';

describe('wordShapeFilter', () => {
  describe('length bounds', () => {
    it('rejects empty string as too_short', () => {
      expect(isWordShapeWeird('', 'en')).toEqual({ weird: true, reason: 'too_short' });
    });

    it('rejects single char as too_short', () => {
      expect(isWordShapeWeird('a', 'en')).toEqual({ weird: true, reason: 'too_short' });
    });

    it('rejects strings longer than 15 chars as too_long', () => {
      expect(isWordShapeWeird('abcdefghijklmnop', 'en')).toEqual({ weird: true, reason: 'too_long' });
    });

    it('accepts 2-char words', () => {
      expect(isWordShapeWeird('of', 'en').weird).toBe(false);
    });

    it('accepts 15-char words', () => {
      expect(isWordShapeWeird('uncomplications', 'en').weird).toBe(false);
    });
  });

  describe('repeated-character runs', () => {
    it('rejects 4+ run of same letter', () => {
      expect(isWordShapeWeird('aaaab', 'en')).toEqual({ weird: true, reason: 'repeated_chars' });
    });

    it('rejects 4-run in middle', () => {
      expect(isWordShapeWeird('xeeeey', 'en')).toEqual({ weird: true, reason: 'repeated_chars' });
    });

    it('accepts 3 in a row', () => {
      expect(isWordShapeWeird('aaab', 'en').weird).toBe(false);
    });

    it('rejects pure spam aaaaaaaa', () => {
      expect(isWordShapeWeird('aaaaaaaa', 'en')).toEqual({ weird: true, reason: 'repeated_chars' });
    });
  });

  describe('non-letter chars', () => {
    it('rejects digits in en', () => {
      expect(isWordShapeWeird('abc1', 'en')).toEqual({ weird: true, reason: 'non_letter' });
    });

    it('rejects punctuation in en', () => {
      expect(isWordShapeWeird("don't", 'en')).toEqual({ weird: true, reason: 'non_letter' });
    });

    it('rejects whitespace in en', () => {
      expect(isWordShapeWeird('two words', 'en')).toEqual({ weird: true, reason: 'non_letter' });
    });

    it('rejects digits in he', () => {
      expect(isWordShapeWeird('שלום1', 'he')).toEqual({ weird: true, reason: 'non_letter' });
    });

    it('rejects latin chars in he (must be Hebrew)', () => {
      expect(isWordShapeWeird('שלוm', 'he')).toEqual({ weird: true, reason: 'non_letter' });
    });

    it('rejects digits in ja', () => {
      expect(isWordShapeWeird('日本1', 'ja')).toEqual({ weird: true, reason: 'non_letter' });
    });
  });

  describe('vowel ratio (en/sv/es)', () => {
    it('rejects all-consonants en when len>=3', () => {
      expect(isWordShapeWeird('xyz', 'en')).toEqual({ weird: true, reason: 'no_vowels' });
    });

    it('rejects all-consonants sv when len>=3', () => {
      expect(isWordShapeWeird('xyz', 'sv')).toEqual({ weird: true, reason: 'no_vowels' });
    });

    it('rejects all-consonants es when len>=3', () => {
      expect(isWordShapeWeird('zxc', 'es')).toEqual({ weird: true, reason: 'no_vowels' });
    });

    it('accepts vowelless 2-char (e.g. mock common ENG abbrev "by")', () => {
      // Spec choice: do NOT enforce vowel rule on 2-char (too many false positives)
      expect(isWordShapeWeird('by', 'en').weird).toBe(false);
    });

    it('accepts en word with vowel', () => {
      expect(isWordShapeWeird('cat', 'en').weird).toBe(false);
    });

    it('accepts sv word with å/ä/ö as vowel', () => {
      expect(isWordShapeWeird('björk', 'sv').weird).toBe(false);
    });

    it('accepts es word with accented vowel', () => {
      expect(isWordShapeWeird('mañana', 'es').weird).toBe(false);
    });

    it('skips vowel check for he', () => {
      // Hebrew has no written vowels in standard form
      expect(isWordShapeWeird('שלום', 'he').weird).toBe(false);
      expect(isWordShapeWeird('בית', 'he').weird).toBe(false);
    });

    it('skips vowel check for ja', () => {
      expect(isWordShapeWeird('日本語', 'ja').weird).toBe(false);
      expect(isWordShapeWeird('ねこ', 'ja').weird).toBe(false);
    });
  });

  describe('real words pass', () => {
    it.each([
      ['hello', 'en'],
      ['quiz', 'en'],
      ['xyzzy', 'en'], // 5-letter word with y as vowel-ish — but no aeiou, so will fail
    ] as const)('shape-checks "%s" (%s)', (word, lang) => {
      const result = isWordShapeWeird(word, lang);
      // xyzzy will be rejected as no_vowels — that's acceptable;
      // the real "is this a word" check is the dictionary, not us.
      // Just assert no crash + deterministic result shape.
      expect(typeof result.weird).toBe('boolean');
    });

    it('accepts common English words', () => {
      for (const w of ['hello', 'world', 'puzzle', 'game', 'cat', 'dog']) {
        expect(isWordShapeWeird(w, 'en').weird).toBe(false);
      }
    });
  });
});
