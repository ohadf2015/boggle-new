import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/** Growth Radar rec 5893: zero-click `scrable on line` → /en/scrabble-alternative-online. */
const SRC = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');

function answerWordCount(): number {
  const m = SRC.match(/SCRABLE_ON_LINE_ANSWER =\s*\n?\s*'([^']+)'/);
  expect(m, 'SCRABLE_ON_LINE_ANSWER string').toBeTruthy();
  return m![1].trim().split(/\s+/).length;
}

describe('scrabble-alternative-online zero-click (scrable on line)', () => {
  it('repeats the misspelled query as a visible H2 with a 40–60 word answer', () => {
    expect(SRC).toContain("SCRABLE_ON_LINE_QUESTION = 'scrable on line'");
    expect(SRC).toContain('{SCRABLE_ON_LINE_QUESTION}');
    expect(SRC).toContain('{SCRABLE_ON_LINE_ANSWER}');
    const n = answerWordCount();
    expect(n).toBeGreaterThanOrEqual(40);
    expect(n).toBeLessThanOrEqual(60);
  });

  it('includes the query in FAQPage JSON-LD', () => {
    expect(SRC).toContain("'@type': 'FAQPage'");
    expect(SRC).toContain('SCRABLE_ON_LINE_QUESTION');
    expect(SRC).toContain('SCRABLE_ON_LINE_ANSWER');
  });

  it('keeps a play CTA after the answer', () => {
    const q = SRC.indexOf('{SCRABLE_ON_LINE_ANSWER}');
    const play = SRC.indexOf('/en/multiplayer', q);
    expect(q).toBeGreaterThan(-1);
    expect(play).toBeGreaterThan(q);
  });
});
