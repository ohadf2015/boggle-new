// Smoke test: validate parser handles real article prose across all 5 locales.
// Delete this file after verification — parser unit tests cover the contract.
import { describe, it, expect } from 'vitest';
import { extractFaqFromSections } from './parseFaqProse';
import { contentByLocale as wordleContent } from '@/app/[locale]/blog/boggle-vs-wordle/content';
import { contentByLocale as scrabbleContent } from '@/app/[locale]/blog/boggle-vs-scrabble/content';
import { contentByLocale as wwfContent } from '@/app/[locale]/blog/boggle-vs-words-with-friends/content';

describe('FAQ extraction smoke against real article content', () => {
  const locales = ['en', 'he', 'sv', 'ja', 'es'];
  // boggle-vs-wordle/en was rewritten 2026-05-19 as flowing prose without a
  // structured FAQ section — the other 4 locales still ship the Q/A block.
  // Other articles' EN content still has FAQ. Skip wordle/en only.
  for (const locale of locales) {
    if (locale !== 'en') {
      it(`boggle-vs-wordle/${locale} extracts ≥3 Q/A`, () => {
        const items = extractFaqFromSections(wordleContent[locale].sections);
        expect(items.length).toBeGreaterThanOrEqual(3);
        items.forEach((qa) => {
          expect(qa.question.length).toBeGreaterThan(0);
          expect(qa.answer.length).toBeGreaterThan(0);
        });
      });
    }
    it(`boggle-vs-scrabble/${locale} extracts ≥3 Q/A`, () => {
      const items = extractFaqFromSections(scrabbleContent[locale].sections);
      expect(items.length).toBeGreaterThanOrEqual(3);
    });
    it(`boggle-vs-words-with-friends/${locale} extracts ≥2 Q/A`, () => {
      const items = extractFaqFromSections(wwfContent[locale].sections);
      expect(items.length).toBeGreaterThanOrEqual(2);
    });
  }
});
