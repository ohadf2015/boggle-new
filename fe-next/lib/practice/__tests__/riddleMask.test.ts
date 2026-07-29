import { describe, it, expect } from 'vitest';
import { maskAnswer, isRiddleSolved } from '../riddleMask';

describe('maskAnswer', () => {
  it('hides every letter when nothing is revealed', () => {
    expect(maskAnswer('STAR', 0)).toEqual(['•', '•', '•', '•']);
  });

  it('reveals the first N letters from the start', () => {
    expect(maskAnswer('STAR', 1)).toEqual(['S', '•', '•', '•']);
    expect(maskAnswer('STAR', 2)).toEqual(['S', 'T', '•', '•']);
  });

  it('reveals the whole word when revealedCount >= length', () => {
    expect(maskAnswer('CAT', 3)).toEqual(['C', 'A', 'T']);
    expect(maskAnswer('CAT', 9)).toEqual(['C', 'A', 'T']);
  });

  it('clamps negative reveal counts to zero', () => {
    expect(maskAnswer('CAT', -2)).toEqual(['•', '•', '•']);
  });

  it('preserves the word casing/script (Hebrew)', () => {
    expect(maskAnswer('רופא', 1)).toEqual(['ר', '•', '•', '•']);
  });
});

describe('isRiddleSolved', () => {
  it('is true when the answer is among found words (case-insensitive)', () => {
    expect(isRiddleSolved('STAR', ['CAT', 'STAR'])).toBe(true);
    expect(isRiddleSolved('STAR', ['cat', 'star'])).toBe(true);
    expect(isRiddleSolved('Star', ['STAR'])).toBe(true);
  });

  it('is false when the answer is absent', () => {
    expect(isRiddleSolved('STAR', ['CAT', 'RATS'])).toBe(false);
    expect(isRiddleSolved('STAR', [])).toBe(false);
  });

  it('matches Hebrew answers exactly', () => {
    expect(isRiddleSolved('רופא', ['אפור', 'רופא'])).toBe(true);
    expect(isRiddleSolved('רופא', ['אפור'])).toBe(false);
  });
});
