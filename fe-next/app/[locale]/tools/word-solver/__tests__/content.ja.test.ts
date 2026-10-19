import { describe, expect, it } from 'vitest';
import { getContent } from '../content';

/**
 * Growth Radar rec 5282: /ja/tools/word-solver ranks ~4.5 for アナグラムソルバー.
 * On /ja the solver defaults to the Japanese dictionary (~40万語 via /api/word-solver),
 * so the copy must not describe it as a 500-word English list.
 */
describe('word-solver ja content', () => {
  const ja = getContent('ja');
  const allText = JSON.stringify(ja);

  it('given the ja page, then it never claims a 500-word common list', () => {
    expect(allText).not.toContain('500以上の一般的な単語');
  });

  it('given the アナグラムソルバー FAQ, then the answer is self-contained and Japanese-specific', () => {
    const faq = ja.faqs.find((f) => f.question.includes('アナグラムソルバー'));
    expect(faq).toBeDefined();
    expect(faq!.answer).toContain('アナグラムソルバー');
    expect(faq!.answer).toContain('日本語');
    expect(faq!.answer).toContain('40万');
    expect(faq!.answer).toContain('さくらんぼ');
  });

  it('given the ja input, then the placeholder example is kana, not Latin letters', () => {
    expect(ja.inputPlaceholder).not.toMatch(/[A-Za-z]/);
  });

  it('given the ja FAQs, then the anagram-solver question comes first', () => {
    expect(ja.faqs[0].question).toContain('アナグラムソルバー');
  });
});
