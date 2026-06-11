import { describe, it, expect } from 'vitest';
import { getSpellingBeeContent, EDUCATION_LOCALES } from '../content';

describe('spelling-bee-practice content', () => {
  it('provides required meta fields for all 5 locales', () => {
    EDUCATION_LOCALES.forEach((locale) => {
      const c = getSpellingBeeContent(locale);
      expect(c.metaTitle, `metaTitle missing for ${locale}`).toBeTruthy();
      expect(c.metaDescription, `metaDescription missing for ${locale}`).toBeTruthy();
    });
  });

  it('falls back to en for unknown locale', () => {
    const c = getSpellingBeeContent('fr' as never);
    expect(c.metaTitle).toBeTruthy();
  });
});
