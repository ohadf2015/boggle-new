import { describe, it, expect } from 'vitest';
import { completionPatchBody, recordedXpFrom } from '../practiceCompletionRecord';

describe('completionPatchBody', () => {
  it('GIVEN a flashcard run WHEN built THEN it carries the session id and card counts only', () => {
    expect(completionPatchBody({ type: 'flashcard', sessionId: 's1', cardsReviewed: 10, cardsCorrect: 7 })).toEqual({
      sessionId: 's1',
      completed: true,
      cardsReviewed: 10,
      cardsCorrect: 7,
    });
  });

  it('GIVEN a Word Craft round WHEN built THEN found words and lesson words are sent for the server gate', () => {
    expect(
      completionPatchBody({ type: 'solo_board', sessionId: 's2', wordsFound: ['CAT'], vocabularyWordsFound: ['cat'], newWordsFound: [] }),
    ).toEqual({ sessionId: 's2', completed: true, wordsFound: ['CAT'], vocabularyWordsFound: ['cat'] });
  });
});

describe('recordedXpFrom', () => {
  it('GIVEN the server completed the session WHEN read THEN its xp_awarded is the XP', () => {
    expect(recordedXpFrom(true, { session: { xp_awarded: 42, completed_at: '2026-09-24T00:00:00Z' } })).toBe(42);
  });

  it('GIVEN an attempt below the bar (completed_at null) WHEN read THEN 0 XP, not a failure', () => {
    expect(recordedXpFrom(true, { session: { xp_awarded: 0, completed_at: null } })).toBe(0);
  });

  it('GIVEN a failed response or a body without a session WHEN read THEN null (not saved), never a client estimate', () => {
    expect(recordedXpFrom(false, { session: { xp_awarded: 42, completed_at: 'x' } })).toBeNull();
    expect(recordedXpFrom(true, {})).toBeNull();
    expect(recordedXpFrom(true, null)).toBeNull();
    expect(recordedXpFrom(true, { session: { completed_at: 'x' } })).toBeNull();
  });
});
