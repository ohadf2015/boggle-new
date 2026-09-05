/**
 * Live Vocab Quiz — round engine (RED first).
 *
 * The engine is a pure state machine over one round: no sockets, no timers, no
 * Redis. Every time-dependent function takes `now` so the whole round can be
 * driven deterministically here, which is the only way the pause/advance and
 * reconnect paths get honest coverage.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import type { VocabularyWord } from '@/lib/supabase/education/types';
import {
  createQuizSession,
  submitQuizAnswer,
  everyoneAnswered,
  questionRemainingMs,
  questionExpired,
  buildQuestionPayload,
  buildReveal,
  advanceQuiz,
  quizStandings,
  snapshotFor,
  pauseQuiz,
  resumeQuiz,
  addQuizPlayer,
  correctWordsByUser,
  type VocabQuizSession,
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
const LIMIT_MS = 20_000;

function makeSession(overrides: Partial<Parameters<typeof createQuizSession>[0]> = {}): VocabQuizSession {
  return createQuizSession({
    gameCode: 'ABC123',
    classroomId: 'class-1',
    words: LESSON,
    focus: 'definition',
    questionCount: 5,
    secondsPerQuestion: 20,
    seed: 'seed-1',
    now: T0,
    ...overrides,
  });
}

/** Answer the current question correctly, for tests that only care about progress. */
function answerCorrectly(session: VocabQuizSession, username: string, now: number) {
  const q = session.questions[session.index];
  return submitQuizAnswer(session, { username, choiceIndex: q.answerIndex, index: session.index, now });
}

describe('createQuizSession', () => {
  it('starts on the first question with the clock already running', () => {
    const session = makeSession();
    expect(session.index).toBe(0);
    expect(session.phase).toBe('question');
    expect(session.questions).toHaveLength(5);
    expect(session.questionStartedAt).toBe(T0);
    expect(questionRemainingMs(session, T0)).toBe(LIMIT_MS);
  });

  it('caps the round at what the lesson can build', () => {
    const session = makeSession({ questionCount: 30 });
    expect(session.questions).toHaveLength(5);
  });

  it('records the fallback when the requested focus has no data', () => {
    const noSynonyms = LESSON.map((w) => ({ ...w, synonyms: undefined }));
    const session = makeSession({ words: noSynonyms, focus: 'synonym' });
    expect(session.focusUsed).toBe('definition');
    expect(session.fallbackFrom).toBe('synonym');
  });

  it('produces an empty session rather than throwing when the lesson has no usable data', () => {
    const session = makeSession({ words: [word({ word: 'orphan' })] });
    expect(session.questions).toHaveLength(0);
    expect(session.phase).toBe('ended');
  });
});

describe('submitQuizAnswer', () => {
  let session: VocabQuizSession;
  beforeEach(() => {
    session = makeSession();
    addQuizPlayer(session, { username: 'ana', userId: 'user-ana' });
    addQuizPlayer(session, { username: 'bo', userId: 'user-bo' });
  });

  it('scores a correct answer and starts the streak', () => {
    const result = answerCorrectly(session, 'ana', T0);
    expect(result?.correct).toBe(true);
    expect(result?.points).toBeGreaterThan(100);
    expect(result?.streak).toBe(1);
    expect(result?.totalScore).toBe(result?.points);
  });

  it('scores a wrong answer as zero and breaks the streak', () => {
    const q = session.questions[0];
    const wrongIndex = (q.answerIndex + 1) % q.choices.length;
    const result = submitQuizAnswer(session, { username: 'ana', choiceIndex: wrongIndex, index: 0, now: T0 });
    expect(result?.correct).toBe(false);
    expect(result?.points).toBe(0);
    expect(result?.streak).toBe(0);
  });

  it('ignores a second answer from the same student on the same question', () => {
    const first = answerCorrectly(session, 'ana', T0);
    const second = answerCorrectly(session, 'ana', T0 + 500);
    expect(second).toBeNull();
    expect(quizStandings(session).find((p) => p.username === 'ana')?.score).toBe(first?.points);
  });

  it('drops a late packet aimed at a question that already ended', () => {
    expect(submitQuizAnswer(session, { username: 'ana', choiceIndex: 0, index: 3, now: T0 })).toBeNull();
  });

  it('drops an out-of-range choice index instead of scoring garbage', () => {
    expect(submitQuizAnswer(session, { username: 'ana', choiceIndex: 99, index: 0, now: T0 })).toBeNull();
    expect(submitQuizAnswer(session, { username: 'ana', choiceIndex: -1, index: 0, now: T0 })).toBeNull();
  });

  it('drops an answer that arrives after the question clock expired', () => {
    expect(submitQuizAnswer(session, { username: 'ana', choiceIndex: 0, index: 0, now: T0 + LIMIT_MS + 1 })).toBeNull();
  });

  it('drops an answer from someone who is not in the room', () => {
    expect(submitQuizAnswer(session, { username: 'ghost', choiceIndex: 0, index: 0, now: T0 })).toBeNull();
  });

  it('refuses answers while the round is paused', () => {
    pauseQuiz(session, T0 + 1_000);
    expect(answerCorrectly(session, 'ana', T0 + 2_000)).toBeNull();
  });

  it('pays a bigger speed bonus to the faster student', () => {
    const fast = answerCorrectly(session, 'ana', T0 + 1_000);
    const slow = answerCorrectly(session, 'bo', T0 + 15_000);
    expect(fast!.points).toBeGreaterThan(slow!.points);
  });
});

describe('everyoneAnswered', () => {
  it('is false until every player in the room has answered', () => {
    const session = makeSession();
    addQuizPlayer(session, { username: 'ana', userId: 'user-ana' });
    addQuizPlayer(session, { username: 'bo', userId: 'user-bo' });
    answerCorrectly(session, 'ana', T0);
    expect(everyoneAnswered(session)).toBe(false);
    answerCorrectly(session, 'bo', T0);
    expect(everyoneAnswered(session)).toBe(true);
  });

  it('is false for an empty room, so a teacher-only lobby waits for the clock', () => {
    expect(everyoneAnswered(makeSession())).toBe(false);
  });
});

describe('pause / resume', () => {
  it('freezes the question clock while paused', () => {
    const session = makeSession();
    pauseQuiz(session, T0 + 5_000);
    expect(questionRemainingMs(session, T0 + 5_000)).toBe(15_000);
    expect(questionRemainingMs(session, T0 + 60_000)).toBe(15_000);
  });

  it('resumes with the same time left, not the original clock', () => {
    const session = makeSession();
    pauseQuiz(session, T0 + 5_000);
    resumeQuiz(session, T0 + 60_000);
    expect(questionRemainingMs(session, T0 + 60_000)).toBe(15_000);
    expect(questionRemainingMs(session, T0 + 65_000)).toBe(10_000);
  });

  it('never reports a question as expired while paused', () => {
    const session = makeSession();
    pauseQuiz(session, T0 + 1_000);
    expect(questionExpired(session, T0 + 10_000_000)).toBe(false);
  });

  // Same bug class build-flowfix hit in gameStartHandler: a fact recorded
  // against a clock that can later be frozen. `revealEndsAt` is an absolute
  // wall-clock deadline, so a teacher who pauses during the 3s reveal and
  // resumes a minute later would find the deadline already long past and the
  // next question would replace the answer instantly — the class never sees
  // the rest of the reveal they were paused on.
  it('preserves the remaining reveal time across a pause', () => {
    const session = makeSession();
    session.phase = 'reveal';
    session.revealEndsAt = T0 + 3_000;

    pauseQuiz(session, T0 + 1_000);
    resumeQuiz(session, T0 + 60_000);

    // 2s of the reveal were still owed when it was paused.
    expect(session.revealEndsAt).toBe(T0 + 62_000);
  });

  it('leaves the question deadline alone when pausing during a reveal', () => {
    const session = makeSession();
    session.phase = 'reveal';
    session.revealEndsAt = T0 + 3_000;
    pauseQuiz(session, T0 + 1_000);
    resumeQuiz(session, T0 + 5_000);
    // Advancing starts the next question's clock fresh regardless.
    advanceQuiz(session, T0 + 5_000);
    expect(questionRemainingMs(session, T0 + 5_000)).toBe(LIMIT_MS);
  });

  it('ignores a resume that was never preceded by a pause', () => {
    const session = makeSession();
    resumeQuiz(session, T0 + 5_000);
    expect(questionRemainingMs(session, T0 + 5_000)).toBe(15_000);
  });
});

describe('buildReveal', () => {
  let session: VocabQuizSession;
  beforeEach(() => {
    session = makeSession();
    addQuizPlayer(session, { username: 'ana', userId: 'user-ana' });
    addQuizPlayer(session, { username: 'bo', userId: 'user-bo' });
  });

  it('counts a vote per choice for the host distribution bars', () => {
    const q = session.questions[0];
    const wrongIndex = (q.answerIndex + 1) % q.choices.length;
    answerCorrectly(session, 'ana', T0);
    submitQuizAnswer(session, { username: 'bo', choiceIndex: wrongIndex, index: 0, now: T0 });

    const reveal = buildReveal(session);
    expect(reveal.distribution).toHaveLength(4);
    expect(reveal.distribution[q.answerIndex]).toBe(1);
    expect(reveal.distribution[wrongIndex]).toBe(1);
    expect(reveal.distribution.reduce((a, b) => a + b, 0)).toBe(2);
  });

  it('names the lesson word and the correct answer', () => {
    const reveal = buildReveal(session);
    expect(reveal.word).toBe(session.questions[0].word);
    expect(reveal.answer).toBe(session.questions[0].answer);
    expect(reveal.answerIndex).toBe(session.questions[0].answerIndex);
  });

  it('flags only the final question as last', () => {
    expect(buildReveal(session).isLast).toBe(false);
    session.index = session.questions.length - 1;
    expect(buildReveal(session).isLast).toBe(true);
  });
});

describe('advanceQuiz', () => {
  it('moves to the next question and clears the previous votes', () => {
    const session = makeSession();
    addQuizPlayer(session, { username: 'ana', userId: 'user-ana' });
    answerCorrectly(session, 'ana', T0);

    advanceQuiz(session, T0 + 25_000);
    expect(session.index).toBe(1);
    expect(session.phase).toBe('question');
    expect(session.questionStartedAt).toBe(T0 + 25_000);
    expect(questionRemainingMs(session, T0 + 25_000)).toBe(LIMIT_MS);
    expect(buildReveal(session).distribution.every((n) => n === 0)).toBe(true);
  });

  it('ends the round after the final question', () => {
    const session = makeSession();
    session.index = session.questions.length - 1;
    advanceQuiz(session, T0 + 99_000);
    expect(session.phase).toBe('ended');
  });

  it('carries a paused clock into the next question cleanly', () => {
    const session = makeSession();
    pauseQuiz(session, T0 + 5_000);
    advanceQuiz(session, T0 + 30_000);
    expect(session.paused).toBe(false);
    expect(questionRemainingMs(session, T0 + 30_000)).toBe(LIMIT_MS);
  });
});

describe('snapshotFor (reconnect / late join)', () => {
  it('gives a refreshing student the current question with the time actually left', () => {
    const session = makeSession();
    addQuizPlayer(session, { username: 'ana', userId: 'user-ana' });

    const snap = snapshotFor(session, 'ana', T0 + 7_000);
    expect(snap.active).toBe(true);
    expect(snap.phase).toBe('question');
    expect(snap.index).toBe(0);
    expect(snap.question?.remainingMs).toBe(13_000);
    expect(snap.question?.choices).toHaveLength(4);
    expect(snap.myAnswer).toBeUndefined();
  });

  it('never leaks the answer index in the live question payload', () => {
    const session = makeSession();
    const snap = snapshotFor(session, 'ana', T0);
    expect(snap.question).toBeDefined();
    expect(Object.keys(snap.question!)).not.toContain('answerIndex');
    expect(JSON.stringify(snap.question)).not.toContain('answerIndex');
  });

  it('replays the student own answer so a refresh does not offer a second try', () => {
    const session = makeSession();
    addQuizPlayer(session, { username: 'ana', userId: 'user-ana' });
    const result = answerCorrectly(session, 'ana', T0 + 2_000);

    const snap = snapshotFor(session, 'ana', T0 + 6_000);
    expect(snap.myAnswer?.choiceIndex).toBe(result!.choiceIndex);
    expect(snap.myAnswer?.correct).toBe(true);
    expect(snap.myScore).toBe(result!.points);
    expect(snap.myStreak).toBe(1);
  });

  it('returns the reveal, not the question, between questions', () => {
    const session = makeSession();
    session.phase = 'reveal';
    const snap = snapshotFor(session, 'ana', T0 + 21_000);
    expect(snap.phase).toBe('reveal');
    expect(snap.reveal).toBeDefined();
    expect(snap.question).toBeUndefined();
  });

  it('reports an ended round as inactive with final standings', () => {
    const session = makeSession();
    addQuizPlayer(session, { username: 'ana', userId: 'user-ana' });
    answerCorrectly(session, 'ana', T0);
    session.phase = 'ended';
    const snap = snapshotFor(session, 'ana', T0 + 99_000);
    expect(snap.active).toBe(false);
    expect(snap.standings[0].username).toBe('ana');
  });

  it('says it is paused so the student sees a paused screen instead of a frozen clock', () => {
    const session = makeSession();
    pauseQuiz(session, T0 + 3_000);
    expect(snapshotFor(session, 'ana', T0 + 30_000).paused).toBe(true);
  });
});

describe('correctWordsByUser (teacher report mapping)', () => {
  // upsertLessonProgress marks EVERY lesson word attempted and only the words
  // in `wordsFound` mastered. For a synonym question the right answer is a
  // synonym, which matches no lesson vocabulary key — crediting the answer text
  // instead of the lesson word would record zero mastery for the whole class.
  it('credits the LESSON word, never the answer text, on a synonym question', () => {
    const session = makeSession({ focus: 'synonym' });
    addQuizPlayer(session, { username: 'ana', userId: 'user-ana' });
    const q = session.questions[0];
    submitQuizAnswer(session, { username: 'ana', choiceIndex: q.answerIndex, index: 0, now: T0 });

    const byUser = correctWordsByUser(session);
    expect(byUser.get('user-ana')).toEqual([q.word]);
    expect(byUser.get('user-ana')).not.toContain(q.answer);
  });

  it('leaves a wrongly answered word out, so it lands in attempted-not-mastered', () => {
    const session = makeSession();
    addQuizPlayer(session, { username: 'ana', userId: 'user-ana' });
    const q = session.questions[0];
    submitQuizAnswer(session, {
      username: 'ana',
      choiceIndex: (q.answerIndex + 1) % 4,
      index: 0,
      now: T0,
    });
    expect(correctWordsByUser(session).get('user-ana')).toEqual([]);
  });

  it('skips players with no auth user id — a guest has no lesson progress', () => {
    const session = makeSession();
    addQuizPlayer(session, { username: 'guest', userId: null });
    answerCorrectly(session, 'guest', T0);
    expect(correctWordsByUser(session).has('guest')).toBe(false);
    expect(correctWordsByUser(session).size).toBe(0);
  });

  it('accumulates across questions', () => {
    const session = makeSession();
    addQuizPlayer(session, { username: 'ana', userId: 'user-ana' });
    answerCorrectly(session, 'ana', T0);
    const first = session.questions[0].word;
    advanceQuiz(session, T0 + 25_000);
    answerCorrectly(session, 'ana', T0 + 26_000);
    const second = session.questions[1].word;

    expect(correctWordsByUser(session).get('user-ana')).toEqual([first, second]);
  });
});

describe('buildQuestionPayload', () => {
  it('carries the clock and the server time so clients can drift-correct', () => {
    const session = makeSession();
    const payload = buildQuestionPayload(session, T0 + 4_000);
    expect(payload.limitMs).toBe(LIMIT_MS);
    expect(payload.remainingMs).toBe(16_000);
    expect(payload.serverNow).toBe(T0 + 4_000);
    expect(payload.total).toBe(5);
    expect(payload.index).toBe(0);
  });
});
