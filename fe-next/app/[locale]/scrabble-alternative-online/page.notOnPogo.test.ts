import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/** Growth Radar rec 11099: Bing grounds "play scrabble not on pogo" but cites other domains. */
const SRC = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');

function answer(): string {
  const m = SRC.match(/NOT_ON_POGO_ANSWER =\s*\n?\s*'([^']+)'/);
  expect(m, 'NOT_ON_POGO_ANSWER string').toBeTruthy();
  return m![1].trim();
}

describe('scrabble-alternative-online GEO (play scrabble not on pogo)', () => {
  it('asks the query as a visible H2 and answers it in 40–60 quotable words', () => {
    // Given the page source
    // When the not-on-Pogo question and answer are rendered
    expect(SRC).toMatch(/NOT_ON_POGO_QUESTION = '[^']*Scrabble[^']*not on Pogo[^']*'/i);
    expect(SRC).toContain('{NOT_ON_POGO_QUESTION}');
    expect(SRC).toContain('{NOT_ON_POGO_ANSWER}');
    // Then the answer stands alone: it names the subject and the query terms
    const a = answer();
    const words = a.split(/\s+/).length;
    expect(words).toBeGreaterThanOrEqual(40);
    expect(words).toBeLessThanOrEqual(60);
    expect(a.startsWith('LexiClash')).toBe(true);
    expect(a).toMatch(/Pogo/);
    expect(a).toMatch(/Scrabble/);
  });

  it('puts the question in FAQPage JSON-LD', () => {
    const faqs = SRC.slice(SRC.indexOf('const faqs = ['), SRC.indexOf('const faqJsonLd'));
    expect(faqs).toContain('q: NOT_ON_POGO_QUESTION');
    expect(faqs).toContain('a: NOT_ON_POGO_ANSWER');
  });

  it('keeps a play CTA right after the answer', () => {
    const q = SRC.indexOf('{NOT_ON_POGO_ANSWER}');
    const play = SRC.indexOf('/en/multiplayer', q);
    expect(q).toBeGreaterThan(-1);
    expect(play - q).toBeLessThan(400);
  });
});
