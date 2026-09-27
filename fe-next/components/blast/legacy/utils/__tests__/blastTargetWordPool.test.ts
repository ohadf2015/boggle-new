/**
 * blastTargetWordPool — tests for word pool management.
 */

import {
  getTargetWordPool,
  pickRandomTargetWord,
  ENGLISH_TARGET_WORDS,
  SWEDISH_TARGET_WORDS,
  JAPANESE_TARGET_WORDS,
  SPANISH_TARGET_WORDS,
  HEBREW_TARGET_WORDS,
} from '../blastTargetWordPool';

describe('getTargetWordPool', () => {
  it('returns English words for en locale', () => {
    const pool = getTargetWordPool('en');
    expect(pool).toEqual(expect.arrayContaining(Array.from(ENGLISH_TARGET_WORDS)));
    expect(pool.length).toBeGreaterThan(0);
  });

  it('returns Swedish words for sv locale', () => {
    const pool = getTargetWordPool('sv');
    expect(pool).toEqual(expect.arrayContaining(Array.from(SWEDISH_TARGET_WORDS)));
  });

  it('returns Japanese words for ja locale', () => {
    const pool = getTargetWordPool('ja');
    expect(pool).toEqual(expect.arrayContaining(Array.from(JAPANESE_TARGET_WORDS)));
  });

  it('returns Spanish words for es locale', () => {
    const pool = getTargetWordPool('es');
    expect(pool).toEqual(expect.arrayContaining(Array.from(SPANISH_TARGET_WORDS)));
  });

  it('returns Hebrew words for he locale', () => {
    const pool = getTargetWordPool('he');
    expect(pool).toEqual(expect.arrayContaining(Array.from(HEBREW_TARGET_WORDS)));
  });

  it('returns empty array for unknown locales', () => {
    const pool = getTargetWordPool('xx' as any);
    expect(pool).toEqual([]);
  });

  it('does not mutate the internal word lists', () => {
    const pool1 = getTargetWordPool('en');
    pool1.pop();
    const pool2 = getTargetWordPool('en');
    expect(pool2.length).toBe(Array.from(ENGLISH_TARGET_WORDS).length);
  });
});

describe('pickRandomTargetWord', () => {
  it('returns a word from the pool', () => {
    const pool = Array.from(ENGLISH_TARGET_WORDS);
    const word = pickRandomTargetWord(pool);
    expect(pool).toContain(word);
  });

  it('returns null for empty pool', () => {
    const word = pickRandomTargetWord([]);
    expect(word).toBeNull();
  });

  it('returns single word from pool with one element', () => {
    const word = pickRandomTargetWord(['CRYSTAL']);
    expect(word).toBe('CRYSTAL');
  });

  it('samples different words on multiple calls', () => {
    const pool = Array.from(ENGLISH_TARGET_WORDS);
    const picks = Array.from({ length: 50 }, () => pickRandomTargetWord(pool));
    const unique = new Set(picks);
    // With 50 picks from a pool of 20+ words, we should see variety
    expect(unique.size).toBeGreaterThan(1);
  });
});
