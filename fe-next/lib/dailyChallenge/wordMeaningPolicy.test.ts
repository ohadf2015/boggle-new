import { describe, it, expect } from 'vitest';
import {
  meaningForLanguage,
  NO_MEANING_LANGUAGES,
  isMeaningDisplayableForLanguage,
} from './wordMeaningPolicy';

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

describe('isMeaningDisplayableForLanguage', () => {
  it('rejects a Latin-script (English) gloss attached to a Hebrew puzzle', () => {
    // The exact failure mode from the bug report: a Hebrew word (מלחמה / "war")
    // carrying an English definition for an unrelated word (a gazelle).
    expect(
      isMeaningDisplayableForLanguage(
        'he',
        'An antelope of either of the genera Gazella, capable of running at high speeds.',
      ),
    ).toBe(false);
  });

  it('accepts a genuine Hebrew gloss for a Hebrew puzzle', () => {
    expect(isMeaningDisplayableForLanguage('he', 'עימות מזוין בין צבאות')).toBe(true);
  });

  it('rejects a mismatched script for Japanese and Russian puzzles', () => {
    expect(isMeaningDisplayableForLanguage('ja', 'a cold treat')).toBe(false);
    expect(isMeaningDisplayableForLanguage('ru', 'a cold treat')).toBe(false);
    expect(isMeaningDisplayableForLanguage('ja', '冷たいおやつ')).toBe(true);
    expect(isMeaningDisplayableForLanguage('ru', 'холодное лакомство')).toBe(true);
  });

  it('has no script guard for Latin-script languages (en/es/sv)', () => {
    expect(isMeaningDisplayableForLanguage('en', 'a cold treat')).toBe(true);
    expect(isMeaningDisplayableForLanguage('es', 'un postre frío')).toBe(true);
  });

  it('rejects empty / whitespace / nullish meanings for any language', () => {
    expect(isMeaningDisplayableForLanguage('en', '')).toBe(false);
    expect(isMeaningDisplayableForLanguage('he', '   ')).toBe(false);
    expect(isMeaningDisplayableForLanguage('he', null)).toBe(false);
    expect(isMeaningDisplayableForLanguage('en', undefined)).toBe(false);
  });
});
