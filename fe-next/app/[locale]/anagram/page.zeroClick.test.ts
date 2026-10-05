import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/** Growth Radar rec 6487: zero-click `anagram svenska` on /sv/anagram. */
const SRC = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
const SITEMAP = fs.readFileSync(path.resolve(__dirname, '../../sitemap.ts'), 'utf8');

function answerWordCount(): number {
  const m = SRC.match(/ANAGRAM_SVENSKA_ANSWER =\s*\n?\s*'([^']+)'/);
  expect(m, 'ANAGRAM_SVENSKA_ANSWER string').toBeTruthy();
  return m![1].trim().split(/\s+/).length;
}

describe('anagram hub zero-click (anagram svenska)', () => {
  it('repeats the query as a visible H2 with a 40–60 word answer under it', () => {
    expect(SRC).toContain("ANAGRAM_SVENSKA_QUESTION = 'anagram svenska'");
    expect(SRC).toContain('<h2');
    expect(SRC).toContain('{ANAGRAM_SVENSKA_QUESTION}');
    expect(SRC).toContain('{ANAGRAM_SVENSKA_ANSWER}');
    const n = answerWordCount();
    expect(n).toBeGreaterThanOrEqual(40);
    expect(n).toBeLessThanOrEqual(60);
  });

  it('emits FAQPage JSON-LD whose Question name matches the H2', () => {
    expect(SRC).toContain('FaqPageJsonLd');
    expect(SRC).toContain("q: ANAGRAM_SVENSKA_QUESTION");
    expect(SRC).toContain('a: ANAGRAM_SVENSKA_ANSWER');
    expect(SRC).not.toContain("from 'next/script'");
  });

  it('keeps a play/tool CTA after the answer', () => {
    const q = SRC.indexOf('{ANAGRAM_SVENSKA_ANSWER}');
    const cta = SRC.indexOf('/anagram/', q);
    const play = SRC.indexOf('/multiplayer', q);
    expect(q).toBeGreaterThan(-1);
    expect(cta).toBeGreaterThan(q);
    expect(play).toBeGreaterThan(q);
  });

  it('indexes Swedish /sv/anagram (noindex was why the query earned 0 clicks)', () => {
    expect(SRC).toContain('isEnglish || isSwedish');
    expect(SRC).toContain('/sv/anagram');
    expect(SITEMAP).toContain("addForLocaleOnly(routes, '/anagram'");
    expect(SITEMAP).toContain(", 'sv');");
  });
});
