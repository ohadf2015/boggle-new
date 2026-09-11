/**
 * Live Vocab Quiz — the payoff wire (RED first).
 *
 * Two things the juice needs from the server and cannot derive on its own:
 *
 * 1. A LIVE lock-in count while the clock still runs, so the projector's bars
 *    fill in as students commit instead of appearing all at once at the reveal.
 * 2. The next question's first letter, so the between-questions 3-2-1 can tease
 *    the word the class is about to meet.
 *
 * Both are additive: the engine and the handler are already at their size
 * ceilings, so the logic lives here and the handler only calls it.
 */
import { describe, it, expect } from 'vitest';
import type { VocabularyWord } from '@/lib/supabase/education/types';
import {
  createQuizSession,
  submitQuizAnswer,
  addQuizPlayer,
  buildReveal,
  advanceQuiz,
  type VocabQuizSession,
} from '../vocabQuizEngine';
import { buildLockIn, decorateReveal, nextQuestionHint } from '../vocabQuizJuice';

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

function makeSession(): VocabQuizSession {
  return createQuizSession({
    gameCode: 'ABC123',
    classroomId: 'class-1',
    words: LESSON,
    focus: 'definition',
    questionCount: 5,
    secondsPerQuestion: 20,
    seed: 'seed-1',
    now: T0,
  });
}

function withPlayers(session: VocabQuizSession, names: string[]): VocabQuizSession {
  for (const username of names) addQuizPlayer(session, { username, userId: null });
  return session;
}

describe('buildLockIn', () => {
  it('reports nobody locked in before the first answer', () => {
    const session = withPlayers(makeSession(), ['ada', 'bo', 'cy']);
    const lockIn = buildLockIn(session);

    expect(lockIn.gameCode).toBe('ABC123');
    expect(lockIn.index).toBe(0);
    expect(lockIn.locked).toBe(0);
    expect(lockIn.total).toBe(3);
    expect(lockIn.distribution).toEqual([0, 0, 0, 0]);
  });

  it('counts each student into the choice they committed to', () => {
    const session = withPlayers(makeSession(), ['ada', 'bo', 'cy']);
    const q = session.questions[0];
    const wrong = (q.answerIndex + 1) % q.choices.length;

    submitQuizAnswer(session, { username: 'ada', choiceIndex: q.answerIndex, index: 0, now: T0 + 900 });
    submitQuizAnswer(session, { username: 'bo', choiceIndex: wrong, index: 0, now: T0 + 1_400 });

    const lockIn = buildLockIn(session);
    expect(lockIn.locked).toBe(2);
    expect(lockIn.total).toBe(3);
    expect(lockIn.distribution[q.answerIndex]).toBe(1);
    expect(lockIn.distribution[wrong]).toBe(1);
  });

  it('resets to zero on the next question rather than carrying the last one over', () => {
    // Class 2: a count that survives a question boundary is a stale mutable.
    const session = withPlayers(makeSession(), ['ada']);
    const q = session.questions[0];
    submitQuizAnswer(session, { username: 'ada', choiceIndex: q.answerIndex, index: 0, now: T0 + 500 });
    expect(buildLockIn(session).locked).toBe(1);

    advanceQuiz(session, T0 + 30_000);
    const next = buildLockIn(session);
    expect(next.index).toBe(1);
    expect(next.locked).toBe(0);
    expect(next.distribution.every((n) => n === 0)).toBe(true);
  });
});

describe('nextQuestionHint', () => {
  it('teases the first letter of the word the class meets next', () => {
    const session = makeSession();
    const nextWord = session.questions[1].word;
    expect(nextQuestionHint(session)).toEqual({
      letter: nextWord.charAt(0).toUpperCase(),
      length: nextWord.length,
    });
  });

  it('gives nothing after the last question', () => {
    const session = makeSession();
    session.index = session.questions.length - 1;
    expect(nextQuestionHint(session)).toBeNull();
  });
});

describe('decorateReveal', () => {
  it('carries the tease inside the reveal payload both paths already send', () => {
    // Class 3: a second event for the hint would make one path richer than the
    // other. It rides the reveal every client already receives.
    const session = withPlayers(makeSession(), ['ada']);
    const reveal = decorateReveal(session, buildReveal(session));
    expect(reveal.nextHint).toEqual(nextQuestionHint(session));
    expect(reveal.answerIndex).toBe(session.questions[0].answerIndex);
  });

  it('omits the tease on the final reveal', () => {
    const session = withPlayers(makeSession(), ['ada']);
    session.index = session.questions.length - 1;
    const reveal = decorateReveal(session, buildReveal(session));
    expect(reveal.isLast).toBe(true);
    expect(reveal.nextHint).toBeUndefined();
  });
});
