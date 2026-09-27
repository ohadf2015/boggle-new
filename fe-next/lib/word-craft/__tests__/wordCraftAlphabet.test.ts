import { describe, it, expect } from 'vitest';
import { alphabetForLocale } from '../wordCraftAlphabet';

describe('alphabetForLocale', () => {
  it('returns the 26 English letters with no blank marker', () => {
    const letters = alphabetForLocale('en');
    expect(letters).toHaveLength(26);
    expect(letters).toContain('A');
    expect(letters).toContain('Z');
    expect(letters).not.toContain('_');
  });

  it('returns Hebrew base letters (no blank, no sofit) for he', () => {
    const letters = alphabetForLocale('he');
    expect(letters).not.toContain('_');
    expect(letters).toContain('א');
    expect(letters).toContain('ת');
    // Sofit forms are not drawable tiles → must be absent from the picker.
    expect(letters).not.toContain('ך');
    expect(letters).not.toContain('ם');
  });

  it('falls back to English for an unknown locale', () => {
    // @ts-expect-error testing runtime fallback
    expect(alphabetForLocale('xx')).toEqual(alphabetForLocale('en'));
  });
});
