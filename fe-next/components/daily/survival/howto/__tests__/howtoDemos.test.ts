import { describe, it, expect } from 'vitest';
import { getHowtoDemo, HOWTO_LOCALES } from '../howtoDemos';

describe('how-to-play demo boards', () => {
  it.each(HOWTO_LOCALES)('given %s, the traced path spells the demo word on its own grid', (lang) => {
    const demo = getHowtoDemo(lang);
    const spelled = demo.path.map(({ row, col }) => demo.grid[row][col]).join('');
    expect(spelled).toBe(demo.word);
    expect(demo.word.length).toBeGreaterThanOrEqual(3);
  });

  it.each(HOWTO_LOCALES)('given %s, the demo word lights green, yellow and gray against the hidden word', (lang) => {
    const states = new Set(getHowtoDemo(lang).feedback.map((f) => f.feedback));
    expect([...states].sort()).toEqual(['gray', 'green', 'yellow']);
  });

  it('given a locale without its own demo, then it falls back to English', () => {
    expect(getHowtoDemo('xx').word).toBe(getHowtoDemo('en').word);
  });

  it('given Russian, then the board is Cyrillic', () => {
    expect(getHowtoDemo('ru').word).toMatch(/^[А-Я]+$/);
  });
});
