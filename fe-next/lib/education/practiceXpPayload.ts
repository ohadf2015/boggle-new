/**
 * practiceXpPayload — translate a finished round into what the XP server reads.
 *
 * `backend/modules/educationXpManager` scores each practice type off a different
 * set of fields: flashcards on `cardsReviewed`/`cardsCorrect`, the board on the
 * found-word lists, Matching on `pairsMatched`/`totalPairs`, Spelling on
 * `wordsSpelled`/`wordsAttempted`, Blitz on `blitzWordsFound`. Every practice
 * screen, meanwhile, finishes with the same two numbers: how many questions it
 * asked and how many the student got right.
 *
 * Nothing was mapping between the two. The client filled the flashcard and board
 * fields and sent `{}` for the other three, so a spelling round paid the daily
 * base and nothing per word, and `getMasteryMessage` — which reads the same
 * missing field — printed "You spelled 0 words correctly!" directly under a
 * score card reading "4 of 8 · 50%". No error, no warning: the payload was
 * well-formed, just empty. (Class 4: the silent no-op.)
 *
 * Keeping the mapping here, pure, means the field names are asserted by a unit
 * test rather than discovered when a student's XP looks wrong.
 */

import type { VocabFocus } from './vocabFocus';

export interface FinishedPracticeRound {
  type: 'flashcard' | 'solo_board' | 'lesson_completion' | 'matching' | 'spelling' | 'blitz' | 'vocab_focus';
  focus?: VocabFocus;
  cardsReviewed?: number;
  cardsCorrect?: number;
  vocabularyWordsFound?: string[];
  wordsFound?: string[];
  newWordsFound?: string[];
  masteryLevel?: 'not_started' | 'started' | 'practicing' | 'mastered';
}

/** The server's own union — `vocab_focus` is not one of its types. */
export type ServerXpType =
  | 'flashcard'
  | 'solo_board'
  | 'lesson_completion'
  | 'matching'
  | 'spelling'
  | 'blitz';

export interface PracticeXpPayload {
  type: ServerXpType;
  sessionData: Record<string, unknown>;
}

export function practiceXpPayload(round: FinishedPracticeRound): PracticeXpPayload {
  const reviewed = Math.max(0, Math.floor(round.cardsReviewed ?? 0));
  const correct = Math.max(0, Math.floor(round.cardsCorrect ?? 0));

  switch (round.type) {
    // A four-choice vocabulary quiz has the shape and the formula of a
    // flashcard round, and the server has no type of its own for it.
    case 'vocab_focus':
    case 'flashcard':
      return {
        type: 'flashcard',
        sessionData: { cardsReviewed: reviewed, cardsCorrect: correct },
      };

    case 'matching':
      return {
        type: 'matching',
        sessionData: { pairsMatched: correct, totalPairs: reviewed },
      };

    case 'spelling':
      return {
        type: 'spelling',
        sessionData: { wordsSpelled: correct, wordsAttempted: reviewed },
      };

    case 'blitz':
      // Blitz counts words found, not questions asked; its combo bonus is
      // scored in-round by the server and has no client-side equivalent.
      return {
        type: 'blitz',
        sessionData: { blitzWordsFound: correct },
      };

    case 'solo_board':
      return {
        type: 'solo_board',
        sessionData: {
          vocabularyWordsFound: round.vocabularyWordsFound ?? [],
          newWordsFound: round.newWordsFound ?? [],
        },
      };

    case 'lesson_completion':
    default:
      return {
        type: 'lesson_completion',
        sessionData: { masteryLevel: round.masteryLevel },
      };
  }
}
