import { describe, it, expect } from 'vitest';
import { generateDailyPuzzle, generateFreeplayPuzzle } from '../generate.daily';

const CYRILLIC_WORD = /^[а-я]+$/;

describe('ru single-player crossword', () => {
  it('daily is served from the Russian pool, never an English-clued generated grid', async () => {
    const p = await generateDailyPuzzle('2026-10-09', 'ru');
    expect(p?.locale).toBe('ru');
    expect(p?.slots.length).toBeGreaterThan(0);
    for (const s of p?.slots ?? []) expect(s.answer).toMatch(CYRILLIC_WORD);
  });

  it('freeplay is served from the Russian pool too', async () => {
    const p = await generateFreeplayPuzzle(42, 'ru');
    expect(p?.locale).toBe('ru');
    for (const s of p?.slots ?? []) expect(s.answer).toMatch(CYRILLIC_WORD);
  });
});
