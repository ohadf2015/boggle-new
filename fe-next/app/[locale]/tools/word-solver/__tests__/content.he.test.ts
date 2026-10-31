import { describe, expect, it } from 'vitest';
import { getContent } from '../content';

describe('word-solver he content', () => {
  const he = getContent('he');
  const allText = JSON.stringify(he);

  it('given the he page, then it never claims a 500-word common list or English results', () => {
    expect(allText).not.toContain('500+ מילים נפוצות');
    expect(allText).not.toContain('באנגלית');
  });

  it('given the he input, then the placeholder example is Hebrew, not Latin letters', () => {
    expect(he.inputPlaceholder).not.toMatch(/[A-Za-z]/);
  });

  it('given the he FAQs, then the Hebrew anagram question comes first with a worked example', () => {
    expect(he.faqs[0].question).toContain('אנגרמות בעברית');
    expect(he.faqs[0].answer).toContain('מלח');
  });
});
