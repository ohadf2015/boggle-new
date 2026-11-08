import { describe, it, expect, vi } from 'vitest';

// Real dictionary loads word lists asynchronously (network/files) and hangs
// vitest — every solver-dependent test in this repo mocks it. We mock ONLY the
// dictionary data; grid generation, solver traversal, and scoring stay real.
vi.mock('../../dictionary', () => {
  const words = new Set(['cat', 'act', 'tac', 'ate', 'tea', 'eat', 'net', 'ten', 'rat', 'tar', 'art', 'ear', 'era', 'ran', 'car', 'arc']);
  return {
    dictionary: {
      englishWords: words,
      hebrewWords: words,
      swedishWords: words,
      japaneseWords: words,
      spanishWords: words,
    },
    isDictionaryWord: (w: string) => words.has(w.toLowerCase()),
    normalizeWord: (w: string) => w.toLowerCase(),
    load: async () => undefined,
  };
});

import { buildQuickRound, scoreWordsForMode, parScoreForMode, PAR_WORDS } from '../quickPlayRound';

describe('buildQuickRound', () => {
  it('same seed → identical board and perfectScore (deterministic)', async () => {
    const a = await buildQuickRound('classic', 'en', 'seed-1');
    const b = await buildQuickRound('classic', 'en', 'seed-1');
    expect(a.grid).toEqual(b.grid);
    expect(a.perfectScore).toBe(b.perfectScore);
    expect(a.seed).toBe('seed-1');
  });

  it('different seeds → different boards', async () => {
    const a = await buildQuickRound('classic', 'en', 'seed-1');
    const b = await buildQuickRound('classic', 'en', 'seed-2');
    expect(a.grid).not.toEqual(b.grid);
  });

  it('no seed → generates one and returns it', async () => {
    const r = await buildQuickRound('blast', 'en');
    expect(r.seed).toBeTruthy();
    expect(r.perfectScore).toBeGreaterThanOrEqual(1);
    expect(r.grid.length).toBeGreaterThan(0);
  });

  it('wheel-rush returns wheel puzzle and positive perfect score', async () => {
    const r = await buildQuickRound('wheel-rush', 'en', 'seed-2');
    expect(r.wheel).toBeTruthy();
    expect(r.wheel!.allLetters).toHaveLength(7);
    expect(r.perfectScore).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(r.words)).toBe(true);
  });

  it('word list is lowercase (case pitfall)', async () => {
    const r = await buildQuickRound('classic', 'en', 'seed-1');
    expect(Array.isArray(r.words)).toBe(true);
    expect(r.words.every((w) => w === w.toLowerCase())).toBe(true);
  });

  it('durationSec is 60 for all modes', async () => {
    const r = await buildQuickRound('word-hunt', 'en', 'seed-3');
    expect(r.durationSec).toBe(60);
  });

  it('word-hunt round includes a seeded target word', async () => {
    const a = await buildQuickRound('word-hunt', 'en', 'seed-3');
    const b = await buildQuickRound('word-hunt', 'en', 'seed-3');
    expect(a.targetWord).toBeTruthy();
    expect(a.targetWord).toBe(b.targetWord);
  });
});

describe('scoreWordsForMode', () => {
  it('grid modes use canonical word scoring, no combo', () => {
    expect(scoreWordsForMode('classic', ['cat', 'trade'])).toBeGreaterThan(0);
  });
  it('wheel-rush uses wheel length ladder (3 letters = 12)', () => {
    expect(scoreWordsForMode('wheel-rush', ['cat'])).toBe(12);
  });
});

/**
 * Par: the 60-second target. "Perfect" is every solver word on the board
 * (hundreds of words, 15k-30k points); real players score 0-5% of that
 * (quick_play_results, Jul-Nov 2026), so "% of perfect", the rank ladder and
 * the 30/60/85% ghost rivals were all on a scale nobody can reach.
 */
describe('parScoreForMode', () => {
  it('sums the easiest PAR_WORDS words, shortest first', () => {
    const words = ['abcdefg', ...Array.from({ length: 40 }, (_, i) => `w${String(i).padStart(2, '0')}`)];
    const par = parScoreForMode('classic', words);
    expect(par.parWords).toBe(PAR_WORDS.classic);
    // 3-letter words score 10 each; the 7-letter word is never in the par.
    expect(par.parScore).toBe(PAR_WORDS.classic * scoreWordsForMode('classic', ['abc']));
  });

  it('a board with fewer words than PAR_WORDS uses all of them (par = perfect)', () => {
    const words = ['cat', 'tea', 'trade'];
    const par = parScoreForMode('classic', words);
    expect(par.parWords).toBe(3);
    expect(par.parScore).toBe(scoreWordsForMode('classic', words));
  });

  it('never below 1, even with no words', () => {
    expect(parScoreForMode('blast', []).parScore).toBe(1);
  });

  it('buildQuickRound returns a par no bigger than perfect', async () => {
    const r = await buildQuickRound('classic', 'en', 'seed-1');
    expect(r.parScore).toBeGreaterThanOrEqual(1);
    expect(r.parScore).toBeLessThanOrEqual(r.perfectScore);
    expect(r.parWords).toBeLessThanOrEqual(r.words.length);
  });
});
