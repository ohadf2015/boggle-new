/**
 * GEO invariant for GR #2719 ("word shake boggle", grounded but not cited).
 * Models quote the first self-contained statement. The answer must name the
 * query, stand alone, and stay above the sibling "wordplay boggle shake" block.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const page = readFileSync(resolve(__dirname, 'page.tsx'), 'utf8');

describe('word shake boggle answer', () => {
  it('names the query in a self-contained answer before the sibling block', () => {
    const answer = page.match(/const WORD_SHAKE_BOGGLE_ANSWER =\n  '([^']+)'/)?.[1] ?? '';
    expect(answer.startsWith('Word shake boggle')).toBe(true);
    expect(answer).toContain('1973');
    expect(answer).toContain('16 letter cubes');
    expect(answer).toContain('22 October 2026');
    expect(answer).not.toMatch(/\b(this|we|our)\b/i);
    const wordShake = page.indexOf('What is word shake boggle?');
    const wordplay = page.indexOf('What is wordplay boggle shake?');
    expect(wordShake).toBeGreaterThan(-1);
    expect(wordplay).toBeGreaterThan(wordShake);
  });

  it('keeps the FAQPage question identical to the visible heading and answer', () => {
    expect(page).toContain("q: 'What is word shake boggle?'");
    expect(page).toContain('a: WORD_SHAKE_BOGGLE_ANSWER');
    expect(page).toContain("q: 'What is wordplay boggle shake?'");
  });
});
