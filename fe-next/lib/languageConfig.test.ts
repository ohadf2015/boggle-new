import { describe, it, expect } from 'vitest';
import { isRtlLanguage, languageDir } from './languageConfig';

describe('languageConfig direction helpers', () => {
  describe('isRtlLanguage', () => {
    it('treats Hebrew as RTL', () => {
      expect(isRtlLanguage('he')).toBe(true);
    });

    it('treats Latin/CJK languages as LTR', () => {
      expect(isRtlLanguage('en')).toBe(false);
      expect(isRtlLanguage('sv')).toBe(false);
      expect(isRtlLanguage('ja')).toBe(false);
      expect(isRtlLanguage('es')).toBe(false);
    });
  });

  describe('languageDir', () => {
    it('returns "rtl" for Hebrew', () => {
      expect(languageDir('he')).toBe('rtl');
    });

    it('returns "ltr" for English (game lang drives board direction, not UI lang)', () => {
      expect(languageDir('en')).toBe('ltr');
    });

    it('returns "ltr" for every non-Hebrew supported language', () => {
      expect(languageDir('sv')).toBe('ltr');
      expect(languageDir('ja')).toBe('ltr');
      expect(languageDir('es')).toBe('ltr');
    });

    it('defaults to "ltr" when language is null/undefined', () => {
      expect(languageDir(null)).toBe('ltr');
      expect(languageDir(undefined)).toBe('ltr');
    });
  });
});
