/**
 * Regression: several results surfaces picked the longest word with
 * `words.reduce((a, b) => a.length >= b.length ? a : b)` and no initial value.
 * A player who finished a round with zero valid words hit
 * "TypeError: Reduce of empty array with no initial value" and their own results
 * screen crashed (Sentry JAVASCRIPT-NEXTJS-206, /es/singleplayer).
 */
import { longestWordOf } from '../utils';

describe('longestWordOf', () => {
  it('returns undefined for an empty list instead of throwing', () => {
    expect(longestWordOf([])).toBeUndefined();
  });

  it('returns undefined for a missing list', () => {
    expect(longestWordOf(undefined)).toBeUndefined();
    expect(longestWordOf(null)).toBeUndefined();
  });

  it('returns the longest string', () => {
    expect(longestWordOf(['cat', 'giraffe', 'dog'])).toBe('giraffe');
  });

  it('returns the longest word of word objects', () => {
    expect(longestWordOf([{ word: 'cat' }, { word: 'giraffe' }])).toBe('giraffe');
  });

  it('keeps the first of equal-length words, matching the old >= comparison', () => {
    expect(longestWordOf(['cat', 'dog'])).toBe('cat');
  });

  it('ignores entries with no word', () => {
    expect(longestWordOf([{ word: '' }, { word: 'hi' }])).toBe('hi');
  });
});
