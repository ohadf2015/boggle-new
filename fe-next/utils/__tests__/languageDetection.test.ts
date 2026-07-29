/**
 * Tests for language detection utility
 */

import { detectInputLanguage, getLanguageName } from '../languageDetection';

describe('detectInputLanguage', () => {
  describe('Hebrew detection', () => {
    it('should detect Hebrew characters', () => {
      expect(detectInputLanguage('א')).toBe('he');
      expect(detectInputLanguage('ב')).toBe('he');
      expect(detectInputLanguage('ש')).toBe('he');
      expect(detectInputLanguage('ת')).toBe('he');
      expect(detectInputLanguage('ן')).toBe('he'); // Final nun
      expect(detectInputLanguage('ך')).toBe('he'); // Final kaf
    });
  });

  describe('English detection', () => {
    it('should detect English lowercase letters', () => {
      expect(detectInputLanguage('a')).toBe('en');
      expect(detectInputLanguage('z')).toBe('en');
      expect(detectInputLanguage('m')).toBe('en');
    });

    it('should detect English uppercase letters', () => {
      expect(detectInputLanguage('A')).toBe('en');
      expect(detectInputLanguage('Z')).toBe('en');
      expect(detectInputLanguage('M')).toBe('en');
    });
  });

  describe('Swedish detection', () => {
    it('should detect Swedish-specific characters', () => {
      expect(detectInputLanguage('å')).toBe('sv');
      expect(detectInputLanguage('ä')).toBe('sv');
      expect(detectInputLanguage('ö')).toBe('sv');
      expect(detectInputLanguage('Å')).toBe('sv');
      expect(detectInputLanguage('Ä')).toBe('sv');
      expect(detectInputLanguage('Ö')).toBe('sv');
    });

    it('should detect standard Latin letters as English (Swedish fallback)', () => {
      // Standard Latin letters could be Swedish or English, defaults to English
      expect(detectInputLanguage('b')).toBe('en');
      expect(detectInputLanguage('c')).toBe('en');
    });
  });

  describe('Japanese detection', () => {
    it('should detect Hiragana characters', () => {
      expect(detectInputLanguage('あ')).toBe('ja');
      expect(detectInputLanguage('か')).toBe('ja');
      expect(detectInputLanguage('ん')).toBe('ja');
    });

    it('should detect Katakana characters', () => {
      expect(detectInputLanguage('ア')).toBe('ja');
      expect(detectInputLanguage('カ')).toBe('ja');
      expect(detectInputLanguage('ン')).toBe('ja');
    });

    it('should detect Kanji characters', () => {
      expect(detectInputLanguage('漢')).toBe('ja');
      expect(detectInputLanguage('字')).toBe('ja');
      expect(detectInputLanguage('本')).toBe('ja');
    });
  });

  describe('Spanish detection', () => {
    it('should detect Spanish-specific characters', () => {
      expect(detectInputLanguage('ñ')).toBe('es');
      expect(detectInputLanguage('Ñ')).toBe('es');
      expect(detectInputLanguage('á')).toBe('es');
      expect(detectInputLanguage('é')).toBe('es');
      expect(detectInputLanguage('í')).toBe('es');
      expect(detectInputLanguage('ó')).toBe('es');
      expect(detectInputLanguage('ú')).toBe('es');
      expect(detectInputLanguage('ü')).toBe('es');
    });

    it('should detect standard Latin letters as English (Spanish fallback)', () => {
      // Standard Latin letters could be Spanish or English, defaults to English
      expect(detectInputLanguage('c')).toBe('en');
      expect(detectInputLanguage('h')).toBe('en');
    });
  });

  describe('Edge cases', () => {
    it('should return null for numbers', () => {
      expect(detectInputLanguage('0')).toBeNull();
      expect(detectInputLanguage('5')).toBeNull();
      expect(detectInputLanguage('9')).toBeNull();
    });

    it('should return null for symbols', () => {
      expect(detectInputLanguage('!')).toBeNull();
      expect(detectInputLanguage('@')).toBeNull();
      expect(detectInputLanguage('#')).toBeNull();
      expect(detectInputLanguage(' ')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(detectInputLanguage('')).toBeNull();
    });

    it('should handle multi-character strings by checking first character', () => {
      expect(detectInputLanguage('abc')).toBe('en');
      expect(detectInputLanguage('שלום')).toBe('he');
      expect(detectInputLanguage('åäö')).toBe('sv');
    });
  });
});

describe('getLanguageName', () => {
  it('should return localized language names', () => {
    expect(getLanguageName('he')).toBe('Hebrew');
    expect(getLanguageName('en')).toBe('English');
    expect(getLanguageName('sv')).toBe('Swedish');
    expect(getLanguageName('ja')).toBe('Japanese');
    expect(getLanguageName('es')).toBe('Spanish');
  });

  it('should handle unknown languages', () => {
    expect(getLanguageName('unknown' as any)).toBe('Unknown');
  });
});
