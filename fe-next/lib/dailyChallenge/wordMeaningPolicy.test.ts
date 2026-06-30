import { describe, it, expect } from 'vitest';
import { meaningForLanguage, NO_MEANING_LANGUAGES } from './wordMeaningPolicy';

describe('meaningForLanguage', () => {
  it('suppresses meaning for Hebrew (low-quality judge meanings)', () => {
    expect(meaningForLanguage('he', 'קינוח קר')).toBeNull();
    expect(meaningForLanguage('he', '')).toBeNull();
    expect(meaningForLanguage('he', null)).toBeNull();
    expect(NO_MEANING_LANGUAGES.has('he')).toBe(true);
  });

  it('keeps a real meaning for other languages', () => {
    expect(meaningForLanguage('en', 'a cold treat')).toBe('a cold treat');
    expect(meaningForLanguage('ja', '冷たいおやつ')).toBe('冷たいおやつ');
  });

  it('normalises empty / whitespace / nullish meaning to null', () => {
    expect(meaningForLanguage('en', '')).toBeNull();
    expect(meaningForLanguage('en', '   ')).toBeNull();
    expect(meaningForLanguage('en', null)).toBeNull();
    expect(meaningForLanguage('en', undefined)).toBeNull();
    expect(meaningForLanguage('en', '  trimmed  ')).toBe('trimmed');
  });
});
