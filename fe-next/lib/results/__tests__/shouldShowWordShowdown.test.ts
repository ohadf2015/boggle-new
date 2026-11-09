import { describe, it, expect } from 'vitest';
import {
  shouldShowWordShowdown,
  heroUniqueWords,
  WORD_SHOWDOWN_UNIQUE_CAP,
} from '../shouldShowWordShowdown';

describe('shouldShowWordShowdown', () => {
  it('shows when the player has unique words', () => {
    expect(shouldShowWordShowdown({ uniqueCount: 2, hasBestMissed: false })).toBe(true);
  });

  it('shows when there is a best-missed word even with zero uniques', () => {
    expect(shouldShowWordShowdown({ uniqueCount: 0, hasBestMissed: true })).toBe(true);
  });

  it('hides when both unique and best-missed are empty', () => {
    expect(shouldShowWordShowdown({ uniqueCount: 0, hasBestMissed: false })).toBe(false);
  });

  it('hides under classroom hidden-outcome pressure', () => {
    expect(shouldShowWordShowdown({ uniqueCount: 3, hasBestMissed: true, hideOutcome: true })).toBe(false);
  });
});

describe('heroUniqueWords', () => {
  it('caps at WORD_SHOWDOWN_UNIQUE_CAP without inventing words', () => {
    const words = ['abcdef', 'abcde', 'abcd', 'abc', 'ab', 'zzzzzz'];
    expect(heroUniqueWords(words)).toEqual(words.slice(0, WORD_SHOWDOWN_UNIQUE_CAP));
  });

  it('returns the same words when under the cap', () => {
    expect(heroUniqueWords(['cat', 'dog'])).toEqual(['cat', 'dog']);
  });
});
