/**
 * The speed dial through the round engine (RED first).
 *
 * A calm round is accuracy-only: the session carries the dial from launch to
 * the last question, and submitQuizAnswer scores through it. A dial stored on
 * the session but ignored at scoring time is pitfall class 2 — settings that
 * look applied and are not.
 */
import { describe, it, expect } from 'vitest';
import type { VocabularyWord } from '@/lib/supabase/education/types';
import {
  createQuizSession,
  submitQuizAnswer,
  addQuizPlayer,
} from '../vocabQuizEngine';

const word = (over: Partial<VocabularyWord> & { word: string }): VocabularyWord => ({
  canIntegrate: true,
  ...over,
});

const LESSON: VocabularyWord[] = [
  word({ word: 'abandon', definition: 'to leave behind for good', synonyms: ['desert'] }),
  word({ word: 'brittle', definition: 'hard but easily broken', synonyms: ['fragile'] }),
  word({ word: 'candid', definition: 'honest and direct', synonyms: ['frank'] }),
  word({ word: 'dwindle', definition: 'to shrink little by little', synonyms: ['shrink'] }),
  word({ word: 'endure', definition: 'to keep going through hardship', synonyms: ['withstand'] }),
];

const T0 = 1_700_000_000_000;

describe('createQuizSession + submitQuizAnswer with speedScoring: false', () => {
  it('stores the dial on the session', () => {
    const session = createQuizSession({
      gameCode: 'ABC123', classroomId: 'class-1', words: LESSON, focus: 'definition',
      questionCount: 5, secondsPerQuestion: 20, seed: 'seed-1', now: T0,
      speedScoring: false,
    });
    expect(session.speedScoring).toBe(false);
  });

  it('scores an instant correct answer with zero speed bonus', () => {
    const session = createQuizSession({
      gameCode: 'ABC123', classroomId: 'class-1', words: LESSON, focus: 'definition',
      questionCount: 5, secondsPerQuestion: 20, seed: 'seed-1', now: T0,
      speedScoring: false,
    });
    addQuizPlayer(session, { username: 'adi', userId: null });
    const question = session.questions[0];
    const result = submitQuizAnswer(session, {
      username: 'adi', choiceIndex: question.answerIndex, index: 0, now: T0 + 200,
    });
    expect(result).not.toBeNull();
    expect(result!.correct).toBe(true);
    expect(result!.speedBonus).toBe(0);
  });

  it('defaults to speed scoring ON when the dial is not passed', () => {
    const session = createQuizSession({
      gameCode: 'ABC123', classroomId: 'class-1', words: LESSON, focus: 'definition',
      questionCount: 5, secondsPerQuestion: 20, seed: 'seed-1', now: T0,
    });
    expect(session.speedScoring).toBe(true);
    addQuizPlayer(session, { username: 'adi', userId: null });
    const question = session.questions[0];
    const result = submitQuizAnswer(session, {
      username: 'adi', choiceIndex: question.answerIndex, index: 0, now: T0 + 200,
    });
    expect(result!.speedBonus).toBeGreaterThan(0);
  });
});
