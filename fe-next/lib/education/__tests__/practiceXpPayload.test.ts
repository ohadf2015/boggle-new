/**
 * Three practice modes were awarding base XP and nothing else.
 *
 * The server reads `wordsSpelled` for Spelling, `pairsMatched` for Matching and
 * `blitzWordsFound` for Blitz, but the client only ever filled the flashcard
 * fields (`cardsReviewed` / `cardsCorrect`) and the board fields. For the other
 * three the payload went out EMPTY: the round paid the daily base only, and the
 * mastery line under the score card read "You spelled 0 words correctly!"
 * immediately below "4 of 8 · 50%".
 */
import { describe, it, expect } from 'vitest';
import { practiceXpPayload } from '../practiceXpPayload';

describe('practiceXpPayload', () => {
  it('GIVEN a spelling round WHEN the payload is built THEN the server sees the words spelled', () => {
    expect(practiceXpPayload({ type: 'spelling', cardsReviewed: 8, cardsCorrect: 4 })).toEqual({
      type: 'spelling',
      sessionData: { wordsSpelled: 4, wordsAttempted: 8 },
    });
  });

  it('GIVEN a matching round WHEN the payload is built THEN the server sees the pairs', () => {
    expect(practiceXpPayload({ type: 'matching', cardsReviewed: 6, cardsCorrect: 6 })).toEqual({
      type: 'matching',
      sessionData: { pairsMatched: 6, totalPairs: 6 },
    });
  });

  it('GIVEN a blitz round WHEN the payload is built THEN the server sees the words found', () => {
    expect(practiceXpPayload({ type: 'blitz', cardsReviewed: 12, cardsCorrect: 9 })).toEqual({
      type: 'blitz',
      sessionData: { blitzWordsFound: 9 },
    });
  });

  it('GIVEN a flashcard round WHEN the payload is built THEN the card fields are unchanged', () => {
    expect(practiceXpPayload({ type: 'flashcard', cardsReviewed: 10, cardsCorrect: 9 })).toEqual({
      type: 'flashcard',
      sessionData: { cardsReviewed: 10, cardsCorrect: 9 },
    });
  });

  it('GIVEN a targeted vocabulary round WHEN the payload is built THEN it scores as a card quiz', () => {
    // vocab_focus is a 4-choice quiz — same shape and XP formula as flashcards,
    // and the server has no `vocab_focus` type of its own.
    expect(practiceXpPayload({ type: 'vocab_focus', cardsReviewed: 4, cardsCorrect: 3 })).toEqual({
      type: 'flashcard',
      sessionData: { cardsReviewed: 4, cardsCorrect: 3 },
    });
  });

  it('GIVEN a board round WHEN the payload is built THEN the found-word lists go through', () => {
    expect(
      practiceXpPayload({
        type: 'solo_board',
        vocabularyWordsFound: ['star'],
        newWordsFound: ['moon'],
      })
    ).toEqual({
      type: 'solo_board',
      sessionData: { vocabularyWordsFound: ['star'], newWordsFound: ['moon'] },
    });
  });

  it('GIVEN a lesson completion WHEN the payload is built THEN the mastery level goes through', () => {
    expect(practiceXpPayload({ type: 'lesson_completion', masteryLevel: 'mastered' })).toEqual({
      type: 'lesson_completion',
      sessionData: { masteryLevel: 'mastered' },
    });
  });

  it('GIVEN missing counts WHEN the payload is built THEN it reports zeroes, never undefined', () => {
    expect(practiceXpPayload({ type: 'spelling' })).toEqual({
      type: 'spelling',
      sessionData: { wordsSpelled: 0, wordsAttempted: 0 },
    });
  });
});
