import { describe, it, expect } from 'vitest';
import { pickWordOfTheDay } from '../wordOfTheDay';

const WORDS = ['alpha', 'bravo', 'charlie', 'delta', 'echo'];

describe('pickWordOfTheDay', () => {
  it('returns the same word all day for the same lesson', () => {
    const morning = new Date(2026, 8, 4, 8, 15);
    const evening = new Date(2026, 8, 4, 21, 45);
    expect(pickWordOfTheDay(WORDS, 'l1', morning)).toBe(pickWordOfTheDay(WORDS, 'l1', evening));
  });

  it('changes when the day changes', () => {
    const picks = [4, 5, 6, 7, 8].map(
      (d) => pickWordOfTheDay(WORDS, 'l1', new Date(2026, 8, d))
    );
    expect(new Set(picks).size).toBeGreaterThan(1);
  });

  it('is stable across calls — the bug was a fresh random pick per mount', () => {
    const day = new Date(2026, 8, 4);
    const first = pickWordOfTheDay(WORDS, 'l1', day);
    for (let i = 0; i < 50; i++) {
      expect(pickWordOfTheDay(WORDS, 'l1', day)).toBe(first);
    }
  });

  it('always returns a word from the list', () => {
    for (let d = 1; d <= 31; d++) {
      expect(WORDS).toContain(pickWordOfTheDay(WORDS, 'l1', new Date(2026, 8, d)));
    }
  });

  it('returns null for an empty list', () => {
    expect(pickWordOfTheDay([], 'l1')).toBeNull();
  });

  it('handles a single-word lesson', () => {
    expect(pickWordOfTheDay(['solo'], 'l1')).toBe('solo');
  });
});
