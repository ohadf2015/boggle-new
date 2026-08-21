import { describe, it, expect } from 'vitest';
import { getSightWordsContent } from '../content';

describe('sight-words-practice content', () => {
  it('provides required meta fields', () => {
    const c = getSightWordsContent('en');
    expect(c.metaTitle).toBeTruthy();
    expect(c.metaDescription).toBeTruthy();
  });

  it('is EN-only: every locale renders the English body', () => {
    const en = getSightWordsContent('en');
    ['he', 'sv', 'ja', 'es', 'ru', 'fr'].forEach((locale) => {
      expect(getSightWordsContent(locale).metaTitle).toBe(en.metaTitle);
    });
  });

  it('FAQ answers stay honest about real product behavior', () => {
    const c = getSightWordsContent('en');
    expect(c.faqs.length).toBeGreaterThanOrEqual(6);
    const blob = c.faqs.map((f) => `${f.q} ${f.a}`).join(' ');
    // The page sells Dolch/Fry practice — both lists must be covered.
    expect(blob).toContain('Dolch');
    expect(blob).toContain('Fry');
    // No invented features: never promise a built-in Dolch/Fry word bank —
    // the product works via teacher-created custom word lists.
    expect(blob.toLowerCase()).not.toContain('built-in dolch');
    expect(blob.toLowerCase()).not.toContain('built-in fry');
  });
});
