import { describe, expect, it } from 'vitest';
import { getContent } from '../content';

describe('word-solver en content (GR #25983 — "solver" queries)', () => {
  const en = getContent('en');
  const allText = JSON.stringify(en);

  it('leads the SERP title and H1 with the head query "anagram solver"', () => {
    expect(en.metaTitle?.toLowerCase()).toContain('anagram solver');
    expect(en.title.toLowerCase()).toContain('anagram solver');
  });

  it('answers in searchers\' words in the first sentence of the visible description', () => {
    expect(en.description.toLowerCase()).toMatch(/^an anagram solver/);
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
