import { describe, it, expect } from 'vitest';
import { dailySeoContent } from './dailySeo.data';

describe('dailySeoContent', () => {
  const locales = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;

  it('has an entry for every supported locale', () => {
    for (const locale of locales) {
      expect(dailySeoContent[locale]).toBeDefined();
      expect(dailySeoContent[locale].title.length).toBeGreaterThan(0);
      expect(dailySeoContent[locale].description.length).toBeGreaterThan(0);
    }
  });

  it('every FAQ entry has a non-empty question and answer', () => {
    for (const locale of locales) {
      for (const qa of dailySeoContent[locale].faq) {
        expect(qa.question.trim().length).toBeGreaterThan(0);
        expect(qa.answer.trim().length).toBeGreaterThan(0);
      }
    }
  });

  // AdSense depth fix (2026-08-03): /daily rendered 86 visible words. The
  // below-the-fold GamePageSeoContent card is the main copy source, so every
  // locale needs enough FAQ items to carry real explanatory weight.
  it('every locale has at least 3 FAQ questions', () => {
    for (const locale of locales) {
      expect(dailySeoContent[locale].faq.length).toBeGreaterThanOrEqual(3);
    }
  });

  // Hebrew FAQ was previously a single Q&A — a GEO/AI-Overview gap vs English's 4.
  it('Hebrew FAQ has at least 5 questions (parity + AI-Overview eligibility)', () => {
    expect(dailySeoContent.he.faq.length).toBeGreaterThanOrEqual(5);
  });

  it('Hebrew FAQ defines the target term "המילה היומית"', () => {
    const heQuestions = dailySeoContent.he.faq.map((qa) => qa.question).join(' ');
    const heAnswers = dailySeoContent.he.faq.map((qa) => qa.answer).join(' ');
    // A definition-style question is what AI assistants quote into "what is X" answers.
    expect(heQuestions).toContain('המילה היומית');
    expect(heAnswers).toContain('המילה היומית');
  });
});
