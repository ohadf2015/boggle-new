import { describe, it, expect } from 'vitest';
import { blitzSessionCounts } from '../blitzSessionCounts';

describe('blitzSessionCounts', () => {
  it('GIVEN 10 words tried and 7 right WHEN counted THEN the row carries attempts, correct and accuracy', () => {
    expect(blitzSessionCounts({ cardsReviewed: 10, cardsCorrect: 7 })).toEqual({
      words_attempted: 10,
      words_correct: 7,
      accuracy: 70,
    });
  });

  it('GIVEN a round where nothing was tried WHEN counted THEN accuracy is null, not 0', () => {
    expect(blitzSessionCounts({ cardsReviewed: 0, cardsCorrect: 0 })).toEqual({
      words_attempted: 0,
      words_correct: 0,
      accuracy: null,
    });
  });

  it('GIVEN more correct than tried WHEN counted THEN correct is capped at attempts', () => {
    expect(blitzSessionCounts({ cardsReviewed: 3, cardsCorrect: 9 })).toEqual({
      words_attempted: 3,
      words_correct: 3,
      accuracy: 100,
    });
  });

  it('GIVEN a partial update with no round counts WHEN counted THEN no column is touched', () => {
    expect(blitzSessionCounts({})).toEqual({});
  });
});
