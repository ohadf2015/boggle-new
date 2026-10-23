import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildLocaleLlms } from '../llms.txt/content';

/** Growth Radar rec 2718: Bing grounds "scrabble på svenska" (111 groundings) but cites other domains. */
const SRC = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');

function answer(): string {
  const m = SRC.match(/SCRABBLE_SV_ANSWER =\s*\n?\s*'([^']+)'/);
  expect(m, 'SCRABBLE_SV_ANSWER string').toBeTruthy();
  return m![1].trim();
}

describe('swedish-multiplayer-word-game GEO (scrabble på svenska)', () => {
  it('asks the query as a visible H2 above the feature grid and answers it in 40–60 quotable words', () => {
    // Given the page source
    // When the scrabble-på-svenska question and answer are rendered
    expect(SRC).toMatch(/SCRABBLE_SV_QUESTION = '[^']*Scrabble på svenska[^']*'/i);
    const q = SRC.indexOf('{SCRABBLE_SV_QUESTION}');
    expect(q).toBeGreaterThan(-1);
    expect(SRC).toContain('{SCRABBLE_SV_ANSWER}');
    // Then it sits in the first viewport, before the feature grid
    expect(q).toBeLessThan(SRC.indexOf('Varför spela LexiClash Multiplayer?'));
    // And the answer stands alone: subject named, query terms and real numbers present
    const a = answer();
    const words = a.split(/\s+/).length;
    expect(words).toBeGreaterThanOrEqual(40);
    expect(words).toBeLessThanOrEqual(60);
    expect(a.startsWith('LexiClash')).toBe(true);
    expect(a).toMatch(/Scrabble på svenska/i);
    expect(a).toMatch(/240 000/);
    expect(a).toMatch(/50 spelare/);
    expect(a).toMatch(/90 sekunder/);
  });

  it('puts the question in FAQPage JSON-LD', () => {
    const faqs = SRC.slice(SRC.indexOf('const faqs = ['), SRC.indexOf('];', SRC.indexOf('const faqs = [')));
    expect(faqs).toContain('q: SCRABBLE_SV_QUESTION');
    expect(faqs).toContain('a: SCRABBLE_SV_ANSWER');
  });

  it('maps the query to the page in the Swedish llms.txt', () => {
    const sv = buildLocaleLlms('sv');
    expect(sv).toMatch(/scrabble på svenska/i);
    expect(sv).toContain('https://www.lexiclash.live/sv/swedish-multiplayer-word-game');
  });
});
