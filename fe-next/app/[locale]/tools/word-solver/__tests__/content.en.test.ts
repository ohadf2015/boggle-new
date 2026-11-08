import { describe, expect, it } from 'vitest';
import { getContent } from '../content';

describe('word-solver en content (GR #25983 — "solver" queries)', () => {
  const en = getContent('en');
  const allText = JSON.stringify(en);

  it('leads the SERP title with the head query "anagram solver" (frozen snippet, #1485/#1487)', () => {
    // The title/description are frozen in seo-freeze.json until 2026-11-28;
    // this asserts the frozen snippet already targets the rising query.
    expect(en.metaTitle?.toLowerCase()).toContain('anagram solver');
    expect(en.description.toLowerCase()).toContain('anagram solver');
  });

  it('has a quotable FAQ line for the exact queries people search', () => {
    const questions = en.faqs.map((f) => f.question.toLowerCase());
    expect(questions.some((q) => q.includes('anagram solver'))).toBe(true);
    expect(questions.some((q) => q.includes('find words from letters'))).toBe(true);
    expect(questions.some((q) => q.includes('multiple words'))).toBe(true);
  });

  it('never claims a 500-word common list — the solver uses the full game dictionary', () => {
    expect(allText).not.toContain('500+ common English words');
  });
});
